import React from 'react';
import styled, { keyframes } from 'styled-components';

const ProgressContainer = styled.div<{ $isProcessing: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${({ $isProcessing }) => 
    $isProcessing ? 'rgba(59, 130, 246, 0.1)' : 'rgba(100, 100, 100, 0.1)'};
  border: 1px solid ${({ $isProcessing }) => 
    $isProcessing ? 'rgba(59, 130, 246, 0.3)' : 'rgba(100, 100, 100, 0.3)'};
  border-radius: 50%;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
`;

const ProcessingIcon = styled.div<{ $isProcessing: boolean }>`
  width: 16px;
  height: 16px;
  border: 2px solid ${({ $isProcessing }) => 
    $isProcessing ? 'rgba(59, 130, 246, 0.3)' : 'rgba(100, 100, 100, 0.3)'};
  border-top: 2px solid ${({ $isProcessing }) => 
    $isProcessing ? '#3b82f6' : '#666666'};
  border-radius: 50%;
  animation: ${({ $isProcessing }) => $isProcessing ? 'spin 1s linear infinite' : 'none'};
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface HeaderProgressProps {
  isProcessing: boolean;
}

const HeaderProgress: React.FC<HeaderProgressProps> = ({ isProcessing }) => {
  console.log('DEBUG: HeaderProgress render', { isProcessing });
  
  return (
    <ProgressContainer $isProcessing={isProcessing}>
      <ProcessingIcon $isProcessing={isProcessing} />
    </ProgressContainer>
  );
};

export default HeaderProgress;
