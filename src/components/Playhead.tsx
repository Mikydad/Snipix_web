import React from 'react';
import styled from 'styled-components';

const PlayheadContainer = styled.div<{ $left: number }>`
  position: absolute;
  top: 0;
  left: ${({ $left }) => $left}px;
  width: 2px;
  height: 100%;
  z-index: 1000;
  pointer-events: auto;
  cursor: ew-resize;
`;

const PlayheadLine = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.colors.error};
  box-shadow: 0 0 4px ${({ theme }) => theme.colors.error};
`;

const PlayheadHead = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 12px solid ${({ theme }) => theme.colors.error};
`;

const TimeDisplay = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  pointer-events: none;
`;

const SplitButton = styled.button`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: auto;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
    opacity: 1;
  }
`;

interface PlayheadProps {
  time: number;
  left: number;
  onSplit?: () => void;
  onDragStart?: (event: React.MouseEvent) => void;
}

const Playhead: React.FC<PlayheadProps> = ({ time, left, onSplit, onDragStart }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <PlayheadContainer $left={left} onMouseDown={onDragStart}>
      <PlayheadLine />
      <PlayheadHead />
      <TimeDisplay>
        {formatTime(time)}
      </TimeDisplay>
      {onSplit && (
        <SplitButton onClick={onSplit} title="Split clip at playhead">
          ✂️
        </SplitButton>
      )}
    </PlayheadContainer>
  );
};

export default Playhead;

