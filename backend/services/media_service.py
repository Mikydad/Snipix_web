import os
import uuid
import ffmpeg
import logging
from typing import List, Dict, Any, Optional
import tempfile
import shutil

# Try to import faster-whisper, but don't fail if not available
try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("⚠️  faster-whisper not available - transcription features will be disabled")

from models.schemas import TranscriptWord

logger = logging.getLogger(__name__)

class MediaService:
    def __init__(self):
        self.media_dir = os.getenv("MEDIA_DIR", "./media")
        self.videos_dir = os.path.join(self.media_dir, "videos")
        self.processed_dir = os.path.join(self.media_dir, "processed")
        self.thumbnails_dir = os.path.join(self.media_dir, "thumbnails")
        
        # Initialize Whisper model
        self.whisper_model = None
        self._init_whisper()
        
        # Filler words to detect
        self.filler_words = {
            "um", "uh", "like", "you know", "i mean", "basically", 
            "actually", "literally", "sort of", "kind of", "right",
            "so", "well", "now", "okay", "ok", "yeah", "yep"
        }

    def _init_whisper(self):
        """Initialize Whisper model"""
        if not WHISPER_AVAILABLE:
            logger.warning("Whisper not available - transcription features disabled")
            self.whisper_model = None
            return
            
        try:
            # Use faster-whisper with small English model
            self.whisper_model = WhisperModel("small.en", device="cpu", compute_type="int8")
            logger.info("Whisper model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Whisper model: {e}")
            self.whisper_model = None

    def save_uploaded_file(self, file, project_id: str) -> str:
        """Save uploaded video file"""
        try:
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_extension = os.path.splitext(file.filename)[1]
            filename = f"{file_id}{file_extension}"
            file_path = os.path.join(self.videos_dir, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"File saved: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Failed to save uploaded file: {e}")
            raise

    def get_video_duration(self, file_path: str) -> float:
        """Get video duration using FFmpeg"""
        try:
            probe = ffmpeg.probe(file_path)
            print(f"DEBUG: FFmpeg probe result: {probe['format']}")
            duration = float(probe['format']['duration'])
            print(f"DEBUG: Raw duration from FFmpeg: {duration}")
            return duration
        except Exception as e:
            logger.error(f"Failed to get video duration: {e}")
            return 0.0

    def extract_audio(self, video_path: str) -> str:
        """Extract audio from video for transcription"""
        try:
            audio_path = video_path.replace('.mp4', '_audio.wav')
            ffmpeg.input(video_path).output(
                audio_path,
                acodec='pcm_s16le',
                ac=1,
                ar='16000'
            ).overwrite_output().run(quiet=True)
            
            return audio_path
        except Exception as e:
            logger.error(f"Failed to extract audio: {e}")
            raise

    def transcribe_audio(self, audio_path: str) -> List[TranscriptWord]:
        """Transcribe audio using Whisper"""
        if not self.whisper_model:
            raise RuntimeError("Whisper model not initialized")
        
        try:
            # Transcribe with word-level timestamps
            segments, info = self.whisper_model.transcribe(
                audio_path,
                word_timestamps=True,
                language="en"
            )
            
            words = []
            for segment in segments:
                for word in segment.words:
                    words.append(TranscriptWord(
                        text=word.word.strip(),
                        start=word.start,
                        end=word.end,
                        confidence=word.probability,
                        is_filler=word.word.strip().lower() in self.filler_words
                    ))
            
            logger.info(f"Transcription completed: {len(words)} words")
            return words
            
        except Exception as e:
            logger.error(f"Failed to transcribe audio: {e}")
            raise

    def remove_filler_segments(self, video_path: str, segments_to_remove: List[Dict[str, Any]]) -> str:
        """Remove filler word segments from video"""
        try:
            if not segments_to_remove:
                return video_path
            
            # Sort segments by start time (descending) to avoid index issues
            segments_to_remove.sort(key=lambda x: x['start'], reverse=True)
            
            # Create output path
            output_path = os.path.join(
                self.processed_dir, 
                f"processed_{os.path.basename(video_path)}"
            )
            
            # Build FFmpeg filter for removing segments
            filter_parts = []
            for i, segment in enumerate(segments_to_remove):
                start = segment['start']
                end = segment['end']
                
                if i == 0:
                    filter_parts.append(f"select='not(between(t,{start},{end}))'")
                else:
                    filter_parts.append(f"select='not(between(t,{start},{end}))'")
            
            # Apply filter
            if filter_parts:
                ffmpeg.input(video_path).output(
                    output_path,
                    vf=','.join(filter_parts),
                    acodec='copy'
                ).overwrite_output().run(quiet=True)
            else:
                # No segments to remove, just copy
                shutil.copy2(video_path, output_path)
            
            logger.info(f"Filler segments removed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to remove filler segments: {e}")
            raise

    def trim_video(self, video_path: str, start_time: float, end_time: float) -> str:
        """Trim video from start_time to end_time"""
        try:
            duration = end_time - start_time
            
            # Create output path
            output_path = os.path.join(
                self.processed_dir,
                f"trimmed_{os.path.basename(video_path)}"
            )
            
            # Trim video using FFmpeg
            ffmpeg.input(
                video_path, 
                ss=start_time, 
                t=duration
            ).output(
                output_path,
                acodec='copy',
                vcodec='copy'
            ).overwrite_output().run(quiet=True)
            
            logger.info(f"Video trimmed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to trim video: {e}")
            raise

    def trim_video_segments(self, video_path: str, segments: List[Dict[str, Any]]) -> str:
        """Trim video based on timeline segments (for hybrid approach)"""
        try:
            print(f"🎬 MEDIA SERVICE: trim_video_segments called with {len(segments)} segments")
            print(f"🎬 MEDIA SERVICE: Segments: {segments}")
            
            if not segments:
                return video_path
            
            # Sort segments by start time
            segments.sort(key=lambda x: x['startTime'])
            print(f"🎬 MEDIA SERVICE: Sorted segments: {segments}")
            
            # Create output path
            output_path = os.path.join(
                self.processed_dir,
                f"segments_{os.path.basename(video_path)}"
            )
            
            # If only one segment, use simple trim
            if len(segments) == 1:
                segment = segments[0]
                return self.trim_video(
                    video_path, 
                    segment['startTime'], 
                    segment['startTime'] + segment['duration']
                )
            
            # Multiple segments - need to concatenate
            # Create temporary files for each segment
            temp_files = []
            try:
                for i, segment in enumerate(segments):
                    temp_path = os.path.join(
                        self.processed_dir,
                        f"temp_segment_{i}_{os.path.basename(video_path)}"
                    )
                    
                    # Trim each segment
                    ffmpeg.input(
                        video_path, 
                        ss=segment['startTime'], 
                        t=segment['duration']
                    ).output(
                        temp_path,
                        acodec='copy',
                        vcodec='copy'
                    ).overwrite_output().run(quiet=True)
                    
                    temp_files.append(temp_path)
                
                # Create concat file for FFmpeg
                concat_file = os.path.join(self.processed_dir, "concat_list.txt")
                with open(concat_file, 'w') as f:
                    for temp_file in temp_files:
                        # Use absolute path to avoid path resolution issues
                        abs_path = os.path.abspath(temp_file)
                        f.write(f"file '{abs_path}'\n")
                
                # Concatenate segments
                ffmpeg.input(concat_file, format='concat', safe=0).output(
                    output_path,
                    acodec='copy',
                    vcodec='copy'
                ).overwrite_output().run(quiet=True)
                
                # Cleanup temp files
                for temp_file in temp_files:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                if os.path.exists(concat_file):
                    os.remove(concat_file)
                
                logger.info(f"Video segments processed: {output_path}")
                return output_path
                
            except Exception as e:
                # Cleanup on error
                for temp_file in temp_files:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                raise e
            
        except Exception as e:
            logger.error(f"Failed to trim video segments: {e}")
            raise

    def generate_thumbnail(self, video_path: str, time: float = 1.0) -> str:
        """Generate thumbnail from video"""
        try:
            thumbnail_path = os.path.join(
                self.thumbnails_dir,
                f"thumb_{os.path.splitext(os.path.basename(video_path))[0]}.jpg"
            )
            
            ffmpeg.input(video_path, ss=time).output(
                thumbnail_path,
                vframes=1,
                qscale=2
            ).overwrite_output().run(quiet=True)
            
            logger.info(f"Thumbnail generated: {thumbnail_path}")
            return thumbnail_path
            
        except Exception as e:
            logger.error(f"Failed to generate thumbnail: {e}")
            raise

    def get_video_info(self, video_path: str) -> Dict[str, Any]:
        """Get comprehensive video information"""
        try:
            probe = ffmpeg.probe(video_path)
            
            # Get video stream info
            video_stream = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
            audio_stream = next((s for s in probe['streams'] if s['codec_type'] == 'audio'), None)
            
            info = {
                'duration': float(probe['format']['duration']),
                'size': int(probe['format']['size']),
                'bitrate': int(probe['format']['bit_rate']),
                'format': probe['format']['format_name']
            }
            
            if video_stream:
                info.update({
                    'width': int(video_stream['width']),
                    'height': int(video_stream['height']),
                    'fps': eval(video_stream['r_frame_rate']),
                    'video_codec': video_stream['codec_name']
                })
            
            if audio_stream:
                info.update({
                    'audio_codec': audio_stream['codec_name'],
                    'sample_rate': int(audio_stream['sample_rate']),
                    'channels': int(audio_stream['channels'])
                })
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get video info: {e}")
            return {}

    def cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Cleaned up: {file_path}")
            except Exception as e:
                logger.error(f"Failed to cleanup {file_path}: {e}")

# Global media service instance
media_service = MediaService()
