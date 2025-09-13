import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ActionType } from '../types';
import { getActionIcon, formatActionTimestamp } from '../utils/actionHistory';

interface UndoRedoButtonProps {
  type: 'undo' | 'redo';
  onClick: () => void;
  disabled: boolean;
  availableCount: number;
  lastAction?: {
    type: ActionType;
    description: string;
    timestamp: number;
  };
  className?: string;
}

// Removed keyframe variables to fix interpolation error
// const pulseAnimation = keyframes`
//   0% { transform: scale(1); }
//   50% { transform: scale(1.05); }
//   100% { transform: scale(1); }
// `;

// const slideInFromLeft = keyframes`
//   from { 
//     opacity: 0;
//     transform: translateX(-10px);
//   }
//   to { 
//     opacity: 1;
//     transform: translateX(0);
//   }
// `;

// const slideInFromRight = keyframes`
//   from { 
//     opacity: 0;
//     transform: translateX(10px);
//   }
//   to { 
//     opacity: 1;
//     transform: translateX(0);
//   }
// `;

const ButtonContainer = styled.div<{ $type: 'undo' | 'redo' }>`
  position: relative;
  display: flex;
  align-items: center;
`;

const Button = styled.button<{ 
  $disabled: boolean; 
  $type: 'undo' | 'redo';
  $hasRecentAction: boolean;
}>`
  width: 40px;
  height: 40px;
  border: 2px solid ${({ theme, $disabled, $hasRecentAction }) => 
    $disabled ? theme.colors.border : 
    $hasRecentAction ? theme.colors.primary : 
    theme.colors.border};
  background: ${({ theme, $disabled, $hasRecentAction }) => 
    $disabled ? theme.colors.surface : 
    $hasRecentAction ? theme.colors.primary + '10' : 
    theme.colors.surface};
  color: ${({ theme, $disabled, $hasRecentAction }) => 
    $disabled ? theme.colors.textSecondary : 
    $hasRecentAction ? theme.colors.primary : 
    theme.colors.text};
  border-radius: 8px;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    background: ${({ theme, $disabled, $hasRecentAction }) => 
      $disabled ? theme.colors.surface : 
      $hasRecentAction ? theme.colors.primary + '20' : 
      theme.colors.surfaceHover};
    transform: ${({ $disabled }) => $disabled ? 'none' : 'translateY(-1px)'};
    box-shadow: ${({ $disabled }) => $disabled ? 'none' : '0 4px 8px rgba(0,0,0,0.1)'};
  }
  
  &:active {
    transform: ${({ $disabled }) => $disabled ? 'none' : 'translateY(0)'};
  }
  
  ${({ $hasRecentAction }) => $hasRecentAction && `
    /* animation: ${css`pulse 2s infinite`}; */
  `}
`;

const CountBadge = styled.div<{ $type: 'undo' | 'redo' }>`
  position: absolute;
  top: -6px;
  ${({ $type }) => $type === 'undo' ? 'right: -6px' : 'left: -6px'};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  border: 2px solid white;
  /* animation: ${({ $type }) => $type === 'undo' ? css`slideInLeft 0.3s ease` : css`slideInRight 0.3s ease`}; */
`;

const Tooltip = styled.div<{ $type: 'undo' | 'redo'; $visible: boolean }>`
  position: absolute;
  ${({ $type }) => $type === 'undo' ? 'right: 100%' : 'left: 100%'};
  top: 50%;
  transform: translateY(-50%);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 200px;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  visibility: ${({ $visible }) => $visible ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  pointer-events: none;
  
  ${({ $type }) => $type === 'undo' ? `
    margin-right: 8px;
  ` : `
    margin-left: 8px;
  `}
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    ${({ $type }) => $type === 'undo' ? 'right: -6px' : 'left: -6px'};
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border: 6px solid transparent;
    border-${({ $type }) => $type === 'undo' ? 'left' : 'right'}-color: ${({ theme }) => theme.colors.border};
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    ${({ $type }) => $type === 'undo' ? 'right: -5px' : 'left: -5px'};
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border: 5px solid transparent;
    border-${({ $type }) => $type === 'undo' ? 'left' : 'right'}-color: ${({ theme }) => theme.colors.surface};
  }
`;

const TooltipContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TooltipTitle = styled.div`
  font-weight: 600;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text};
`;

const TooltipDescription = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const TooltipTime = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-style: italic;
`;

const KeyboardShortcut = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surfaceHover};
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  display: inline-block;
  margin-top: 4px;
`;

const UndoRedoButton: React.FC<UndoRedoButtonProps> = ({
  type,
  onClick,
  disabled,
  availableCount,
  lastAction,
  className
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const icon = type === 'undo' ? '↩️' : '↪️';
  const shortcut = type === 'undo' ? 'Ctrl+Z' : 'Ctrl+Shift+Z';
  const hasRecentAction = Boolean(availableCount > 0 && lastAction && 
    (Date.now() - lastAction.timestamp) < 30000); // Recent within 30 seconds

  useEffect(() => {
    if (isHovered && !disabled) {
      const timer = setTimeout(() => setShowTooltip(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowTooltip(false);
    }
  }, [isHovered, disabled]);

  const handleClick = () => {
    if (!disabled) {
      onClick();
      // Brief visual feedback
      setShowTooltip(false);
    }
  };

  return (
    <ButtonContainer 
      className={className}
      $type={type}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        $disabled={disabled}
        $type={type}
        $hasRecentAction={hasRecentAction}
        onClick={handleClick}
        title={`${type === 'undo' ? 'Undo' : 'Redo'} (${availableCount} available)`}
      >
        {icon}
        {availableCount > 0 && (
          <CountBadge $type={type}>
            {availableCount > 99 ? '99+' : availableCount}
          </CountBadge>
        )}
      </Button>

      <Tooltip $type={type} $visible={showTooltip}>
        <TooltipContent>
          <TooltipTitle>
            {type === 'undo' ? 'Undo' : 'Redo'} ({availableCount} available)
          </TooltipTitle>
          
          {lastAction && (
            <>
              <TooltipDescription>
                <span style={{ marginRight: '6px' }}>
                  {getActionIcon(lastAction.type)}
                </span>
                {lastAction.description}
              </TooltipDescription>
              <TooltipTime>
                {formatActionTimestamp(lastAction.timestamp)}
              </TooltipTime>
            </>
          )}
          
          <KeyboardShortcut>
            {shortcut}
          </KeyboardShortcut>
        </TooltipContent>
      </Tooltip>
    </ButtonContainer>
  );
};

export default UndoRedoButton;

