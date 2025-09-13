import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useTimelineHistory } from '../hooks/useUndoRedo';
import UndoRedoButton from './UndoRedoButton';
import SaveButtonComponent from './SaveButton';

interface FloatingActionPanelProps {
  projectId: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

// Removed keyframe variables to fix interpolation error
// const slideInAnimation = keyframes`
//   from { 
//     opacity: 0;
//     transform: translateY(20px) scale(0.9);
//   }
//   to { 
//     opacity: 1;
//     transform: translateY(0) scale(1);
//   }
// `;

// const slideOutAnimation = keyframes`
//   from { 
//     opacity: 1;
//     transform: translateY(0) scale(1);
//   }
//   to { 
//     opacity: 0;
//     transform: translateY(20px) scale(0.9);
//   }
// `;

const FloatingContainer = styled.div<{ 
  $position: string;
  $isVisible: boolean;
  $isCollapsed: boolean;
}>`
  position: fixed;
  ${({ $position }) => {
    switch ($position) {
      case 'top-left': return 'top: 20px; left: 20px;';
      case 'top-right': return 'top: 20px; right: 20px;';
      case 'bottom-left': return 'bottom: 20px; left: 20px;';
      case 'bottom-right': return 'bottom: 20px; right: 20px;';
      default: return 'bottom: 20px; right: 20px;';
    }
  }}
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: ${({ $isVisible }) => $isVisible ? 1 : 0};
  visibility: ${({ $isVisible }) => $isVisible ? 'visible' : 'hidden'};
  /* animation: ${({ $isVisible }) => 
    $isVisible ? css`slideIn 0.3s ease` : css`slideOut 0.3s ease`}; */
  transition: all 0.3s ease;
`;

const Panel = styled.div<{ $isCollapsed: boolean }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  backdrop-filter: blur(10px);
  padding: ${({ $isCollapsed }) => $isCollapsed ? '8px' : '12px'};
  display: flex;
  flex-direction: ${({ $isCollapsed }) => $isCollapsed ? 'column' : 'row'};
  align-items: center;
  gap: ${({ $isCollapsed }) => $isCollapsed ? '4px' : '8px'};
  transition: all 0.3s ease;
  min-width: ${({ $isCollapsed }) => $isCollapsed ? 'auto' : '200px'};
`;

const ToggleButton = styled.button<{ $isCollapsed: boolean }>`
  width: 32px;
  height: 32px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    transform: scale(1.1);
  }
  
  ${({ $isCollapsed }) => $isCollapsed && `
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `}
`;

const ActionGroup = styled.div<{ $isCollapsed: boolean }>`
  display: flex;
  flex-direction: ${({ $isCollapsed }) => $isCollapsed ? 'column' : 'row'};
  align-items: center;
  gap: ${({ $isCollapsed }) => $isCollapsed ? '4px' : '8px'};
  transition: all 0.3s ease;
`;

const StatusIndicator = styled.div<{ $hasUnsavedChanges: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme, $hasUnsavedChanges }) => 
    $hasUnsavedChanges ? theme.colors.warning : theme.colors.success};
  animation: ${({ $hasUnsavedChanges }) => 
    $hasUnsavedChanges ? css`pulse 2s infinite` : 'none'};
  
  ${css`
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `}
`;

const QuickActions = styled.div<{ $isCollapsed: boolean }>`
  display: flex;
  flex-direction: ${({ $isCollapsed }) => $isCollapsed ? 'column' : 'row'};
  align-items: center;
  gap: ${({ $isCollapsed }) => $isCollapsed ? '4px' : '8px'};
  transition: all 0.3s ease;
`;

const Tooltip = styled.div<{ $visible: boolean; $position: string }>`
  position: absolute;
  ${({ $position }) => {
    switch ($position) {
      case 'top-left': return 'right: 100%; top: 50%; transform: translateY(-50%); margin-right: 8px;';
      case 'top-right': return 'left: 100%; top: 50%; transform: translateY(-50%); margin-left: 8px;';
      case 'bottom-left': return 'right: 100%; top: 50%; transform: translateY(-50%); margin-right: 8px;';
      case 'bottom-right': return 'left: 100%; top: 50%; transform: translateY(-50%); margin-left: 8px;';
      default: return 'left: 100%; top: 50%; transform: translateY(-50%); margin-left: 8px;';
    }
  }}
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1001;
  min-width: 150px;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  visibility: ${({ $visible }) => $visible ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  pointer-events: none;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    ${({ $position }) => {
      switch ($position) {
        case 'top-left': return 'left: 100%; border-left-color:';
        case 'top-right': return 'right: 100%; border-right-color:';
        case 'bottom-left': return 'left: 100%; border-left-color:';
        case 'bottom-right': return 'right: 100%; border-right-color:';
        default: return 'right: 100%; border-right-color:';
      }
    }} ${({ theme }) => theme.colors.border};
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border: 6px solid transparent;
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

const FloatingActionPanel: React.FC<FloatingActionPanelProps> = ({
  projectId,
  position = 'bottom-right',
  className
}) => {
  const timelineHistory = useTimelineHistory(projectId);
  const [isVisible, setIsVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show panel when there are actions available
  useEffect(() => {
    if (timelineHistory.canUndo || timelineHistory.canRedo || timelineHistory.hasUnsavedChanges) {
      setIsVisible(true);
    } else {
      // Hide after a delay when no actions are available
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timelineHistory.canUndo, timelineHistory.canRedo, timelineHistory.hasUnsavedChanges]);

  // Tooltip logic
  useEffect(() => {
    if (isHovered && isCollapsed) {
      const timer = setTimeout(() => setShowTooltip(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowTooltip(false);
    }
  }, [isHovered, isCollapsed]);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleQuickSave = async () => {
    timelineHistory.saveAndCreateCheckpoint('Quick Save');
  };

  const getLatestCheckpointTime = () => {
    const latestCheckpoint = timelineHistory.getLatestCheckpoint();
    return latestCheckpoint?.timestamp;
  };

  return (
    <FloatingContainer 
      className={className}
      $position={position}
      $isVisible={isVisible}
      $isCollapsed={isCollapsed}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Panel $isCollapsed={isCollapsed}>
        {isCollapsed ? (
          <>
            <ToggleButton 
              $isCollapsed={isCollapsed}
              onClick={handleToggleCollapse}
              title="Show Quick Actions"
            >
              ⚡
            </ToggleButton>
            <StatusIndicator $hasUnsavedChanges={timelineHistory.hasUnsavedChanges} />
            
            <Tooltip $visible={showTooltip} $position={position}>
              <TooltipContent>
                <TooltipTitle>Quick Actions</TooltipTitle>
                <TooltipDescription>
                  {timelineHistory.hasUnsavedChanges ? 'You have unsaved changes' : 'All changes saved'}
                </TooltipDescription>
                <TooltipDescription>
                  {timelineHistory.canUndo && `${timelineHistory.undoStackLength} undo available`}
                  {timelineHistory.canRedo && `${timelineHistory.redoStackLength} redo available`}
                </TooltipDescription>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <ActionGroup $isCollapsed={isCollapsed}>
              <UndoRedoButton
                type="undo"
                onClick={timelineHistory.undo}
                disabled={!timelineHistory.canUndo}
                availableCount={timelineHistory.undoStackLength}
              />
              <UndoRedoButton
                type="redo"
                onClick={timelineHistory.redo}
                disabled={!timelineHistory.canRedo}
                availableCount={timelineHistory.redoStackLength}
              />
            </ActionGroup>

            <QuickActions $isCollapsed={isCollapsed}>
              <SaveButtonComponent
                onSave={handleQuickSave}
                onSaveAs={() => console.log('Save as')}
                onAutoSave={() => console.log('Auto save')}
                hasUnsavedChanges={timelineHistory.hasUnsavedChanges}
                isSaving={false}
                lastSaved={getLatestCheckpointTime() ? new Date(getLatestCheckpointTime()!) : undefined}
                autoSaveEnabled={true}
              />
            </QuickActions>

            <ToggleButton 
              $isCollapsed={isCollapsed}
              onClick={handleToggleCollapse}
              title="Hide Quick Actions"
            >
              ✕
            </ToggleButton>
          </>
        )}
      </Panel>
    </FloatingContainer>
  );
};

export default FloatingActionPanel;

