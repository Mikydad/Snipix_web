import { Layer, Clip } from '../types';

/**
 * Converts timeline time to actual video time, accounting for deleted sections
 * @param timelineTime - The time position on the timeline (0 to timeline duration)
 * @param layers - Array of timeline layers
 * @returns The corresponding time in the original video file
 */
export const timelineTimeToVideoTime = (timelineTime: number, layers: Layer[]): number => {
  // Find the main video layer
  const mainVideoLayer = layers.find(layer => layer.isMainVideo);
  if (!mainVideoLayer || !mainVideoLayer.clips.length) {
    return timelineTime; // No main video layer, return as-is
  }

  // Sort clips by timeline start time (not original video time)
  const sortedClips = [...mainVideoLayer.clips].sort((a, b) => a.startTime - b.startTime);
  
  let accumulatedTimelineTime = 0;
  
  for (const clip of sortedClips) {
    const clipDuration = clip.duration;
    
    // Check if the timeline time falls within this clip
    if (timelineTime >= accumulatedTimelineTime && timelineTime <= accumulatedTimelineTime + clipDuration) {
      // Calculate how far into this clip the timeline time is
      const timeInClip = timelineTime - accumulatedTimelineTime;
      // Map to the original video time (use originalStartTime if available)
      const originalStart = clip.originalStartTime ?? clip.startTime;
      return originalStart + timeInClip;
    }
    
    // Move to next clip
    accumulatedTimelineTime += clipDuration;
  }
  
  // If timeline time is beyond all clips, return the end of the last clip
  const lastClip = sortedClips[sortedClips.length - 1];
  if (lastClip) {
    const originalStart = lastClip.originalStartTime ?? lastClip.startTime;
    return originalStart + lastClip.duration;
  }
  return timelineTime;
};

/**
 * Converts video time to timeline time, accounting for deleted sections
 * @param videoTime - The time position in the original video file
 * @param layers - Array of timeline layers
 * @returns The corresponding time on the timeline
 */
export const videoTimeToTimelineTime = (videoTime: number, layers: Layer[]): number => {
  // Find the main video layer
  const mainVideoLayer = layers.find(layer => layer.isMainVideo);
  if (!mainVideoLayer || !mainVideoLayer.clips.length) {
    // No main video layer found
    return videoTime; // No main video layer, return as-is
  }

  // Sort clips by timeline start time (not original start time)
  const sortedClips = [...mainVideoLayer.clips].sort((a, b) => a.startTime - b.startTime);
  
  let timelineTime = 0;
  
  for (const clip of sortedClips) {
    // Check if the video time falls within this clip's original video time
    const originalStart = clip.originalStartTime ?? clip.startTime;
    const originalEnd = originalStart + clip.duration;
    
    console.log('videoTimeToTimelineTime: Checking clip', {
      clipId: clip.id,
      videoTime: videoTime.toFixed(3),
      originalStart: originalStart.toFixed(3),
      originalEnd: originalEnd.toFixed(3),
      timelineTime: timelineTime.toFixed(3)
    });
    
    if (videoTime >= originalStart && videoTime < originalEnd) {
      // Calculate how far into this clip the video time is
      const timeInClip = videoTime - originalStart;
      timelineTime += timeInClip;
      console.log('videoTimeToTimelineTime: Found matching clip, timeInClip:', timeInClip.toFixed(3), 'final timelineTime:', timelineTime.toFixed(3));
      // Found matching clip
      break;
    } else if (videoTime >= originalEnd) {
      // This clip is completely before the video time, add its full duration
      timelineTime += clip.duration;
      console.log('videoTimeToTimelineTime: Clip before video time, added duration:', clip.duration.toFixed(3), 'timelineTime now:', timelineTime.toFixed(3));
    }
    // If videoTime < originalStart, this clip comes after, so we don't add anything
  }
  
  // Return converted timeline time
  console.log('videoTimeToTimelineTime: Final result', { videoTime: videoTime.toFixed(3), timelineTime: timelineTime.toFixed(3) });
  return timelineTime;
};

/**
 * Gets the effective duration of the timeline (sum of all active clips)
 * @param layers - Array of timeline layers
 * @returns The total duration of active content
 */
export const getEffectiveTimelineDuration = (layers: Layer[]): number => {
  const mainVideoLayer = layers.find(layer => layer.isMainVideo);
  if (!mainVideoLayer || !mainVideoLayer.clips.length) {
    return 0;
  }

  return mainVideoLayer.clips.reduce((total, clip) => total + clip.duration, 0);
};

/**
 * Finds the next clip that should play after the current video time
 * @param videoTime - Current video time in the original video
 * @param layers - Array of timeline layers
 * @returns The next clip to play, or null if at the end
 */
export const getNextClip = (videoTime: number, layers: Layer[]): { clip: any; timelineTime: number } | null => {
  const mainVideoLayer = layers.find(layer => layer.isMainVideo);
  if (!mainVideoLayer || !mainVideoLayer.clips.length) {
    console.log('getNextClip: No main video layer or clips found');
    return null;
  }

  // Sort clips by timeline start time
  const sortedClips = [...mainVideoLayer.clips].sort((a, b) => a.startTime - b.startTime);
  
  console.log('getNextClip: Checking clips for videoTime', videoTime.toFixed(3), {
    clips: sortedClips.map(c => ({
      id: c.id,
      timelineStart: c.startTime,
      duration: c.duration,
      originalStart: c.originalStartTime ?? c.startTime,
      originalEnd: (c.originalStartTime ?? c.startTime) + c.duration
    }))
  });
  
  let accumulatedTimelineTime = 0;
  
  for (let i = 0; i < sortedClips.length; i++) {
    const clip = sortedClips[i];
    const originalStart = clip.originalStartTime ?? clip.startTime;
    const originalEnd = originalStart + clip.duration;
    
    console.log(`getNextClip: Checking clip ${i}`, {
      clipId: clip.id,
      videoTime: videoTime.toFixed(3),
      originalStart: originalStart.toFixed(3),
      originalEnd: originalEnd.toFixed(3),
      isInRange: videoTime >= originalStart && videoTime < originalEnd,
      timeUntilEnd: (originalEnd - videoTime).toFixed(3)
    });
    
    // Check if video time is within this clip's original video time range
    if (videoTime >= originalStart && videoTime < originalEnd) {
      // We're in this clip, check if we're near the end (within 0.1 seconds)
      const timeUntilEnd = originalEnd - videoTime;
      console.log(`getNextClip: In clip ${i}, timeUntilEnd:`, timeUntilEnd.toFixed(3));
      
                     if (timeUntilEnd <= 0.1) {
        // We're near the end, check if there's a next clip
        if (i < sortedClips.length - 1) {
          const nextClip = sortedClips[i + 1];
          console.log('🎬 getNextClip: Transition detected', {
            currentClip: { id: clip.id, originalStart, originalEnd, duration: clip.duration },
            nextClip: { id: nextClip.id, originalStart: nextClip.originalStartTime ?? nextClip.startTime },
            videoTime: videoTime.toFixed(3),
            timelineTime: accumulatedTimelineTime + clip.duration
          });
          return {
            clip: nextClip,
            timelineTime: accumulatedTimelineTime + clip.duration
          };
        } else {
          console.log('getNextClip: At end of last clip, no next clip');
        }
      }
      break;
    }
    
    // Add this clip's timeline duration to accumulated time
    accumulatedTimelineTime += clip.duration;
  }
  
  console.log('getNextClip: No transition needed');
  return null;
};
