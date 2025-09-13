import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { TimelineState, Checkpoint, ActionHistoryItem } from '../types';
import { getPageRecoveryManager } from '../utils/pageRecoveryManager';

// Animations
const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  /* animation: ${css`${fadeIn} 0.3s ease`}; */
`;

const Dialog = styled.div`
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  /* animation: ${css`${slideIn} 0.3s ease`}; */
`;

const Header = styled.div`
  padding: 24px 24px 16px;
  border-bottom: 1px solid #404040;
`;

const Title = styled.h2`
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Icon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ffc107;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  /* animation: ${css`${pulse} 2s ease-in-out infinite`}; */
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #888888;
  line-height: 1.5;
`;

const Content = styled.div`
  padding: 24px;
`;

const RecoveryInfo = styled.div`
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const InfoTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const InfoList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const InfoItem = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #cccccc;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoIcon = styled.span`
  font-size: 12px;
  color: #888888;
`;

const OptionsSection = styled.div`
  margin-bottom: 24px;
`;

const OptionsTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const OptionCard = styled.div<{ $isRecommended?: boolean }>`
  background: ${({ $isRecommended }) => $isRecommended ? '#007bff20' : '#1a1a1a'};
  border: 1px solid ${({ $isRecommended }) => $isRecommended ? '#007bff' : '#333333'};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $isRecommended }) => $isRecommended ? '#007bff30' : '#2a2a2a'};
    border-color: ${({ $isRecommended }) => $isRecommended ? '#007bff' : '#444444'};
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const OptionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const OptionIcon = styled.div<{ $variant: 'restore' | 'discard' | 'continue' }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'restore':
        return 'background: #28a745;';
      case 'discard':
        return 'background: #dc3545;';
      case 'continue':
        return 'background: #17a2b8;';
    }
  }}
`;

const OptionTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const OptionDescription = styled.div`
  font-size: 14px;
  color: #888888;
  line-height: 1.4;
`;

const RecommendedBadge = styled.div`
  background: #007bff;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  margin-left: auto;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #404040;
  background: #1a1a1a;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  ${({ $variant = 'secondary' }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: #007bff;
          border-color: #007bff;
          color: white;
          &:hover {
            background: #0056b3;
            border-color: #0056b3;
          }
        `;
      case 'danger':
        return `
          background: #dc3545;
          border-color: #dc3545;
          color: white;
          &:hover {
            background: #c82333;
            border-color: #c82333;
          }
        `;
      default:
        return `
          background: transparent;
          border-color: #404040;
          color: #ffffff;
          &:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: #555555;
          }
        `;
    }
  }}
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px 24px;
  color: #888888;
  font-size: 14px;
`;

// Types
interface RecoveryDialogProps {
  isVisible: boolean;
  onClose: () => void;
  projectId: string;
  recoveryData: {
    timelineState: TimelineState | null;
    actionHistory: ActionHistoryItem[];
    checkpoints: Checkpoint[];
  } | null;
  onRecoveryComplete: (action: 'restore' | 'discard' | 'continue') => void;
}

// Main Component
const RecoveryDialog: React.FC<RecoveryDialogProps> = ({
  isVisible,
  onClose,
  projectId,
  recoveryData,
  onRecoveryComplete
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'restore' | 'discard' | 'continue' | null>(null);

  const pageRecoveryManager = getPageRecoveryManager();

  // Handle recovery action
  const handleRecovery = useCallback(async (action: 'restore' | 'discard' | 'continue') => {
    setIsProcessing(true);
    setSelectedOption(action);

    try {
      // Perform recovery action
      pageRecoveryManager.handleRecovery(projectId, action);
      
      // Notify parent component
      onRecoveryComplete(action);
      
      // Close dialog
      onClose();
    } catch (error) {
      console.error('Recovery failed:', error);
      // Handle error - could show error message
    } finally {
      setIsProcessing(false);
      setSelectedOption(null);
    }
  }, [projectId, onRecoveryComplete, onClose, pageRecoveryManager]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Enter' && selectedOption) {
        handleRecovery(selectedOption);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedOption, handleRecovery, onClose]);

  // Format recovery data for display
  const formatRecoveryInfo = useCallback(() => {
    if (!recoveryData || !recoveryData.timelineState) return null;

    const { timelineState, actionHistory, checkpoints } = recoveryData;
    
    return {
      layersCount: timelineState.layers.length,
      clipsCount: timelineState.layers.reduce((total, layer) => total + layer.clips.length, 0),
      markersCount: timelineState.markers.length,
      actionHistoryCount: actionHistory.length,
      checkpointsCount: checkpoints.length,
      lastActionTime: actionHistory.length > 0 ? new Date(actionHistory[actionHistory.length - 1].timestamp) : null,
      duration: timelineState.duration
    };
  }, [recoveryData]);

  const recoveryInfo = formatRecoveryInfo();

  if (!isVisible) return null;

  return (
    <Overlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Dialog>
        <Header>
          <Title>
            <Icon>⚠️</Icon>
            Unsaved Changes Detected
          </Title>
          <Subtitle>
            We detected unsaved changes from your previous session. Choose how you'd like to proceed.
          </Subtitle>
        </Header>

        <Content>
          {recoveryInfo && (
            <RecoveryInfo>
              <InfoTitle>Recovery Information</InfoTitle>
              <InfoList>
                <InfoItem>
                  <InfoIcon>📁</InfoIcon>
                  {recoveryInfo.layersCount} layers, {recoveryInfo.clipsCount} clips
                </InfoItem>
                <InfoItem>
                  <InfoIcon>📍</InfoIcon>
                  {recoveryInfo.markersCount} markers
                </InfoItem>
                <InfoItem>
                  <InfoIcon>📚</InfoIcon>
                  {recoveryInfo.actionHistoryCount} actions in history
                </InfoItem>
                <InfoItem>
                  <InfoIcon>💾</InfoIcon>
                  {recoveryInfo.checkpointsCount} saved checkpoints
                </InfoItem>
                <InfoItem>
                  <InfoIcon>⏱️</InfoIcon>
                  Duration: {recoveryInfo.duration.toFixed(2)}s
                </InfoItem>
                {recoveryInfo.lastActionTime && (
                  <InfoItem>
                    <InfoIcon>🕒</InfoIcon>
                    Last action: {recoveryInfo.lastActionTime.toLocaleString()}
                  </InfoItem>
                )}
              </InfoList>
            </RecoveryInfo>
          )}

          <OptionsSection>
            <OptionsTitle>Recovery Options</OptionsTitle>
            
            <OptionCard 
              $isRecommended={true}
              onClick={() => setSelectedOption('restore')}
            >
              <OptionHeader>
                <OptionIcon $variant="restore">🔄</OptionIcon>
                <OptionTitle>Restore from Checkpoint</OptionTitle>
                <RecommendedBadge>Recommended</RecommendedBadge>
              </OptionHeader>
              <OptionDescription>
                Restore your project to the last saved checkpoint. This will discard any unsaved changes but ensure data integrity.
              </OptionDescription>
            </OptionCard>

            <OptionCard 
              onClick={() => setSelectedOption('continue')}
            >
              <OptionHeader>
                <OptionIcon $variant="continue">▶️</OptionIcon>
                <OptionTitle>Continue Editing</OptionTitle>
              </OptionHeader>
              <OptionDescription>
                Continue with your current changes. Your unsaved work will be preserved and you can save it later.
              </OptionDescription>
            </OptionCard>

            <OptionCard 
              onClick={() => setSelectedOption('discard')}
            >
              <OptionHeader>
                <OptionIcon $variant="discard">🗑️</OptionIcon>
                <OptionTitle>Discard Changes</OptionTitle>
              </OptionHeader>
              <OptionDescription>
                Discard all unsaved changes and start fresh. This action cannot be undone.
              </OptionDescription>
            </OptionCard>
          </OptionsSection>
        </Content>

        <Actions>
          <ActionButton onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton 
            $variant="primary"
            onClick={() => selectedOption && handleRecovery(selectedOption)}
            disabled={!selectedOption || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Confirm'}
          </ActionButton>
        </Actions>
      </Dialog>
    </Overlay>
  );
};

export default RecoveryDialog;