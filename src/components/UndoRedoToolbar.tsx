import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTimelineHistory } from '../hooks/useUndoRedo';
import UndoRedoButton from './UndoRedoButton';
import SaveButtonComponent from './SaveButton';
import RecoveryDialog from './RecoveryDialog';
import HistoryPanel from './HistoryPanel';

interface UndoRedoToolbarProps {
  projectId: string;
  className?: string;
}

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-right: none;
  }
`;

const ToolbarLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 500;
  margin-right: 4px;
`;

const DropdownButton = styled.button<{ $isOpen: boolean }>`
  width: 32px;
  height: 32px;
  border: 1px solid ${({ theme, $isOpen }) => 
    $isOpen ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $isOpen }) => 
    $isOpen ? theme.colors.primary + '10' : theme.colors.surface};
  color: ${({ theme, $isOpen }) => 
    $isOpen ? theme.colors.primary : theme.colors.text};
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme, $isOpen }) => 
      $isOpen ? theme.colors.primary + '20' : theme.colors.surfaceHover};
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 200px;
  display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  margin-top: 4px;
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  
  &:first-child {
    border-radius: 6px 6px 0 0;
  }
  
  &:last-child {
    border-radius: 0 0 6px 6px;
  }
`;

const RelativeContainer = styled.div`
  position: relative;
`;

const StatusText = styled.span<{ $hasUnsavedChanges: boolean }>`
  font-size: 11px;
  color: ${({ theme, $hasUnsavedChanges }) => 
    $hasUnsavedChanges ? theme.colors.warning : theme.colors.success};
  font-weight: 500;
`;

const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({
  projectId,
  className
}) => {
  const timelineHistory = useTimelineHistory(projectId);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mock recovery data for now
  const recoveryData = timelineHistory.hasUnsavedChanges ? {
    timelineState: {
      layers: [],
      playheadTime: 0,
      duration: 0,
      zoom: 1,
      markers: [],
      undoStack: [],
      redoStack: [],
      actionHistory: timelineHistory.actionHistory,
      checkpoints: timelineHistory.checkpoints,
      lastSavedCheckpoint: timelineHistory.lastSavedCheckpoint,
      hasUnsavedChanges: timelineHistory.hasUnsavedChanges,
      maxHistorySize: 100,
      selectedClips: [],
      isPlaying: false,
      isSnapping: false,
      selectedLayer: null,
      trimState: {
        isActive: false,
        selectedRange: null,
        isDragging: false,
        dragStartTime: null,
        pendingOperations: []
      },
      validationState: { errors: [], warnings: [], isValidating: false }
    },
    actionHistory: timelineHistory.actionHistory,
    checkpoints: timelineHistory.checkpoints
  } : null;

  // Get the last action from each stack for tooltips
  const lastUndoAction = timelineHistory.undoStackLength > 0 ? 
    timelineHistory.actionHistory[timelineHistory.actionHistory.length - 1] : undefined;
  const lastRedoAction = timelineHistory.redoStackLength > 0 ? 
    timelineHistory.redoStack[timelineHistory.redoStack.length - 1] : undefined;

  const handleQuickSave = async () => {
    setIsSaving(true);
    try {
      timelineHistory.saveAndCreateCheckpoint('Quick Save');
    } finally {
      setIsSaving(false);
    }
    setShowSaveDropdown(false);
  };

  const handleNamedSave = () => {
    const name = window.prompt('Enter a name for this save:');
    if (name) {
      timelineHistory.saveAndCreateCheckpoint(`Named Save: ${name}`);
    }
    setShowSaveDropdown(false);
  };

  const handleAutoSave = () => {
    timelineHistory.saveCheckpoint('Auto Save', true);
    setShowSaveDropdown(false);
  };

  const handleRestoreFromCheckpoint = (checkpointId: string) => {
    timelineHistory.restoreCheckpoint(checkpointId);
  };

  const handleDiscardChanges = () => {
    if (window.confirm('Are you sure you want to discard all unsaved changes?')) {
      const latestCheckpoint = timelineHistory.getLatestCheckpoint();
      if (latestCheckpoint) {
        timelineHistory.restoreCheckpoint(latestCheckpoint.id);
      }
    }
  };

  const handleContinueEditing = () => {
    setShowRecoveryDialog(false);
  };

  const handleShowHistory = () => {
    setShowHistoryPanel(true);
  };

  const handleRestoreToAction = (actionId: string) => {
    // This would need to be implemented in the timeline slice
    console.log('Restore to action:', actionId);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all action history?')) {
      timelineHistory.clearActionHistory();
    }
  };

  const getLatestCheckpointTime = () => {
    const latestCheckpoint = timelineHistory.getLatestCheckpoint();
    return latestCheckpoint?.timestamp;
  };

  return (
    <>
      <ToolbarContainer className={className}>
        {/* Undo/Redo Controls */}
        <ToolbarGroup>
          <ToolbarLabel>Edit:</ToolbarLabel>
          <UndoRedoButton
            type="undo"
            onClick={timelineHistory.undo}
            disabled={!timelineHistory.canUndo}
            availableCount={timelineHistory.undoStackLength}
            lastAction={lastUndoAction}
          />
          <UndoRedoButton
            type="redo"
            onClick={timelineHistory.redo}
            disabled={!timelineHistory.canRedo}
            availableCount={timelineHistory.redoStackLength}
            lastAction={lastRedoAction}
          />
        </ToolbarGroup>

        {/* Save Controls */}
        <ToolbarGroup>
          <ToolbarLabel>Save:</ToolbarLabel>
          <SaveButtonComponent
            onSave={handleQuickSave}
            onSaveAs={() => console.log('Save as')}
            onAutoSave={() => console.log('Auto save')}
            hasUnsavedChanges={timelineHistory.hasUnsavedChanges}
            isSaving={isSaving}
            lastSaved={getLatestCheckpointTime() ? new Date(getLatestCheckpointTime()!) : undefined}
            autoSaveEnabled={true}
          />
          
          <RelativeContainer>
            <DropdownButton 
              onClick={() => setShowSaveDropdown(!showSaveDropdown)}
              $isOpen={showSaveDropdown}
              title="Save Options"
            >
              ▼
            </DropdownButton>

            <DropdownMenu $isOpen={showSaveDropdown}>
              <DropdownItem onClick={handleQuickSave}>
                💾 Quick Save
              </DropdownItem>
              <DropdownItem onClick={handleNamedSave}>
                📝 Named Save
              </DropdownItem>
              <DropdownItem onClick={handleAutoSave}>
                🤖 Auto Save
              </DropdownItem>
              <DropdownItem onClick={() => setShowRecoveryDialog(true)}>
                🔄 Restore Checkpoint
              </DropdownItem>
            </DropdownMenu>
          </RelativeContainer>
        </ToolbarGroup>

        {/* History Controls */}
        <ToolbarGroup>
          <ToolbarLabel>History:</ToolbarLabel>
          <DropdownButton 
            onClick={handleShowHistory}
            $isOpen={false}
            title="Show Action History"
          >
            📋
          </DropdownButton>
        </ToolbarGroup>

        {/* Status */}
        <ToolbarGroup>
          <StatusText $hasUnsavedChanges={timelineHistory.hasUnsavedChanges}>
            {timelineHistory.hasUnsavedChanges ? 'Unsaved Changes' : 'All Saved'}
          </StatusText>
        </ToolbarGroup>
      </ToolbarContainer>

      {/* Dialogs */}
      <RecoveryDialog
        isVisible={showRecoveryDialog}
        onClose={() => setShowRecoveryDialog(false)}
        projectId={projectId || ''}
        recoveryData={recoveryData}
        onRecoveryComplete={(action) => {
          if (action === 'restore') {
            handleRestoreFromCheckpoint(timelineHistory.checkpoints[0]?.id || '');
          } else if (action === 'discard') {
            handleDiscardChanges();
          } else if (action === 'continue') {
            handleContinueEditing();
          }
        }}
      />

      <HistoryPanel
        isVisible={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        projectId={projectId || ''}
      />
    </>
  );
};

export default UndoRedoToolbar;

