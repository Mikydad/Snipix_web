import { Layer } from '../types';

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
    return videoTime; // No main video layer, return as-is
  }

  // Sort clips by start time
  const sortedClips = [...mainVideoLayer.clips].sort((a, b) => a.startTime - b.startTime);
  
  let timelineTime = 0;
  
  for (const clip of sortedClips) {
    // Check if the video time falls within this clip's original video time
    const originalStart = clip.originalStartTime ?? clip.startTime;
    const originalEnd = originalStart + clip.duration;
    
    if (videoTime >= originalStart && videoTime < originalEnd) {
      // Calculate how far into this clip the video time is
      const timeInClip = videoTime - originalStart;
      timelineTime += timeInClip;
      break;
    } else if (videoTime >= originalEnd) {
      // This clip is completely before the video time, add its full duration
      timelineTime += clip.duration;
    }
  }
  
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
