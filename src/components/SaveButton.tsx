import React, { useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Animations
// Removed keyframe variables to fix interpolation error
// const spinAnimation = keyframes`
//   from {
//     transform: rotate(0deg);
//   }
//   to {
//     transform: rotate(360deg);
//   }
// `;

// const pulseAnimation = keyframes`
//   0%, 100% {
//     opacity: 1;
//   }
//   50% {
//     opacity: 0.6;
//   }
// `;

// Styled Components
const SaveButtonContainer = styled.button<{
  $hasUnsavedChanges: boolean; 
  $isSaving: boolean;
  $autoSaveEnabled: boolean;
}>`
  padding: 8px 16px;
  border: 2px solid ${({ $hasUnsavedChanges, $isSaving }) => 
    $isSaving ? '#007bff' :
    $hasUnsavedChanges ? '#ffc107' : 
    '#28a745'};
  background: ${({ $hasUnsavedChanges, $isSaving }) => 
    $isSaving ? '#007bff20' :
    $hasUnsavedChanges ? '#ffc10710' : 
    '#28a74510'};
  color: ${({ $hasUnsavedChanges, $isSaving }) => 
    $isSaving ? '#007bff' :
    $hasUnsavedChanges ? '#ffc107' : 
    '#28a745'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  min-width: 120px;
  justify-content: center;
  
  &:hover {
    background: ${({ $hasUnsavedChanges, $isSaving }) => 
      $isSaving ? '#007bff30' :
      $hasUnsavedChanges ? '#ffc10720' : 
      '#28a74520'};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatusIndicator = styled.div<{
  $status: 'saved' | 'unsaved' | 'saving' | 'auto-save';
  $isSaving: boolean;
}>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $status }) => {
    switch ($status) {
      case 'saved': return '#28a745';
      case 'unsaved': return '#ffc107';
      case 'saving': return '#007bff';
      case 'auto-save': return '#17a2b8';
      default: return '#6c757d';
    }
  }};
  /* animation: ${({ $isSaving }) => $isSaving ? css`spin 1s linear infinite` : 'none'}; */
  position: relative;
  
  ${({ $isSaving }) => $isSaving && `
    &::after {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border: 2px solid transparent;
      border-top-color: #007bff;
      border-radius: 50%;
      /* animation: ${css`spin 1s linear infinite`}; */
    }
  `}
`;

const AutoSaveIndicator = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #17a2b8;
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.2s ease;
  /* animation: ${({ $visible }) => $visible ? css`pulse 2s ease-in-out infinite` : 'none'}; */
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 200px;
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transform: translateY(${({ $isOpen }) => $isOpen ? '0' : '-10px'});
  transition: all 0.2s ease;
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #ffffff;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &:first-child {
    border-radius: 8px 8px 0 0;
  }
  
  &:last-child {
    border-radius: 0 0 8px 8px;
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background: #404040;
  margin: 4px 0;
`;

const StatusText = styled.span`
  font-size: 12px;
  color: #888888;
  margin-left: 4px;
`;

// Types
interface SaveButtonProps {
  onSave: () => void;
  onSaveAs: () => void;
  onAutoSave: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  autoSaveEnabled: boolean;
  lastSaved?: Date;
  className?: string;
}

// Main Component
const SaveButton: React.FC<SaveButtonProps> = ({
  onSave,
  onSaveAs,
  onAutoSave,
  hasUnsavedChanges,
  isSaving,
  autoSaveEnabled,
  lastSaved,
  className
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleClick = useCallback(() => {
    if (isSaving) return;
    onSave();
  }, [isSaving, onSave]);

  const handleSaveAs = useCallback(() => {
    setShowDropdown(false);
    onSaveAs();
  }, [onSaveAs]);

  const handleAutoSave = useCallback(() => {
    setShowDropdown(false);
    onAutoSave();
  }, [onAutoSave]);

  const getStatus = (): 'saved' | 'unsaved' | 'saving' | 'auto-save' => {
    if (isSaving) return 'saving';
    if (autoSaveEnabled) return 'auto-save';
    if (hasUnsavedChanges) return 'unsaved';
    return 'saved';
  };

  const getButtonText = () => {
    if (isSaving) return 'Saving...';
    if (hasUnsavedChanges) return 'Save';
    return 'Saved';
  };

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <SaveButtonContainer
      onClick={handleClick}
      onMouseEnter={() => setShowDropdown(true)}
      onMouseLeave={() => setShowDropdown(false)}
      $hasUnsavedChanges={hasUnsavedChanges}
      $isSaving={isSaving}
      $autoSaveEnabled={autoSaveEnabled}
      className={className}
      disabled={isSaving}
    >
      <StatusIndicator 
        $status={getStatus()} 
        $isSaving={isSaving} 
      />
      
      <span>{getButtonText()}</span>
      
      {lastSaved && (
        <StatusText>
          {formatLastSaved(lastSaved)}
        </StatusText>
      )}
      
      <AutoSaveIndicator $visible={autoSaveEnabled}>
        A
      </AutoSaveIndicator>
      
      <DropdownMenu $isOpen={showDropdown}>
        <DropdownItem onClick={handleSaveAs}>
          💾 Save As...
        </DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={handleAutoSave}>
          {autoSaveEnabled ? '⏸️ Disable Auto-save' : '▶️ Enable Auto-save'}
        </DropdownItem>
      </DropdownMenu>
    </SaveButtonContainer>
  );
};

export default SaveButton;