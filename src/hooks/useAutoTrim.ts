import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/store';
import { autoTrimVideo } from '../redux/slices/timelineSlice';

/**
 * Custom hook to automatically trigger hybrid trim after timeline changes
 */
export const useAutoTrim = (projectId?: string) => {
  const dispatch = useAppDispatch();
  const { layers } = useAppSelector(state => state.timeline);

  useEffect(() => {
    if (!projectId) return;

    // Debounce the auto-trim to avoid too many requests
    const timeoutId = setTimeout(() => {
      // Only trigger if there are clips in the main video layer
      const mainVideoLayer = layers.find(layer => layer.isMainVideo);
      if (mainVideoLayer && mainVideoLayer.clips.length > 0) {
        dispatch(autoTrimVideo({ projectId, layers }));
      }
    }, 2000); // 2 second delay

    return () => clearTimeout(timeoutId);
  }, [layers, projectId, dispatch]);
};
