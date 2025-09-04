import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Theme } from '../styles/GlobalStyles';

const RulerContainer = styled.div<{ theme: Theme }>`
  height: 60px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  overflow: hidden;
  cursor: pointer;
  margin-left: 120px; /* Start after headers */
`;

const RulerCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

const TimeMarkers = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
`;

const TimeMarker = styled.div<{ $left: number; theme: Theme }>`
  position: absolute;
  left: ${({ $left }) => $left}px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${({ theme }) => theme.colors.border};
  
  &::after {
    content: attr(data-time);
    position: absolute;
    top: 5px;
    left: 2px;
    font-size: 10px;
    color: ${({ theme }) => theme.colors.textSecondary};
    background: ${({ theme }) => theme.colors.surface};
    padding: 2px 4px;
    border-radius: 2px;
    white-space: nowrap;
  }
`;

const MajorMarker = styled(TimeMarker)`
  background: ${({ theme }) => theme.colors.primary};
  
  &::after {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

interface TimelineRulerProps {
  duration: number;
  zoom: number;
  playheadTime: number;
  onTimeClick: (event: React.MouseEvent) => void;
}

const TimelineRuler: React.FC<TimelineRulerProps> = ({
  duration,
  zoom,
  playheadTime,
  onTimeClick
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rulerRef = React.useRef<HTMLDivElement>(null);

  // Convert time to pixels
  const timeToPixels = useCallback((time: number) => {
    const pixelsPerSecond = 100; // Base pixels per second
    return time * pixelsPerSecond * zoom; // No offset needed here since ruler is already positioned
  }, [zoom]);

  // Convert pixels to time
  const pixelsToTime = useCallback((pixels: number) => {
    const pixelsPerSecond = 100;
    return pixels / (pixelsPerSecond * zoom); // No offset needed here since ruler is already positioned
  }, [zoom]);

  // Handle ruler click
  const handleRulerClick = useCallback((event: React.MouseEvent) => {
    if (!rulerRef.current) return;
    
    const rect = rulerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left; // Use ruler's own container
    const newTime = pixelsToTime(x);
    onTimeClick(event); // Pass the event to parent handler
  }, [pixelsToTime, onTimeClick]);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Draw ruler on canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw time markers
    const pixelsPerSecond = 100 * zoom;
    const markerInterval = zoom >= 2 ? 1 : zoom >= 1 ? 5 : zoom >= 0.5 ? 10 : 30; // Adjust interval based on zoom
    
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.font = '10px Arial';
    ctx.fillStyle = '#9ca3af';

    for (let time = 0; time <= duration; time += markerInterval) {
      const x = timeToPixels(time);
      
      if (x > canvas.width) break;
      
      // Draw marker line
      const isMajor = time % (markerInterval * 5) === 0;
      ctx.strokeStyle = isMajor ? '#6366f1' : '#374151';
      ctx.lineWidth = isMajor ? 2 : 1;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();

      // Draw time label for major markers
      if (isMajor) {
        const timeText = formatTime(time);
        ctx.fillStyle = '#6366f1';
        ctx.fillText(timeText, x + 2, 15);
      }
    }

    // Draw playhead indicator
    const playheadX = timeToPixels(playheadTime);
    if (playheadX >= 0 && playheadX <= canvas.width) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvas.height);
      ctx.stroke();
    }

  }, [duration, zoom, playheadTime, timeToPixels, formatTime]);

  // Generate time markers for DOM
  const generateTimeMarkers = () => {
    const markers = [];
    const pixelsPerSecond = 100 * zoom;
    const markerInterval = zoom >= 2 ? 1 : zoom >= 1 ? 5 : zoom >= 0.5 ? 10 : 30;
    
    for (let time = 0; time <= duration; time += markerInterval) {
      const x = timeToPixels(time);
      const isMajor = time % (markerInterval * 5) === 0;
      
      if (isMajor) {
        markers.push(
          <MajorMarker
            key={time}
            $left={x}
            data-time={formatTime(time)}
          />
        );
      }
    }
    
    return markers;
  };

  return (
    <RulerContainer ref={rulerRef} onClick={handleRulerClick}>
      <RulerCanvas ref={canvasRef} />
      <TimeMarkers>
        {generateTimeMarkers()}
      </TimeMarkers>
    </RulerContainer>
  );
};

export default TimelineRuler;
