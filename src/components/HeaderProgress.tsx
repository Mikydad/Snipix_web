import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const ProgressContainer = styled.div<{ $isVisible: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #3b82f6;
  opacity: ${({ $isVisible }) => $isVisible ? 1 : 0};
  transition: opacity 0.3s ease;
  backdrop-filter: blur(4px);
`;

const Spinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const StatusText = styled.span`
  font-weight: 500;
  animation: ${pulse} 2s ease-in-out infinite;
`;

interface HeaderProgressProps {
  isVisible: boolean;
  message: string;
}

const HeaderProgress: React.FC<HeaderProgressProps> = ({ isVisible, message }) => {
  console.log('DEBUG: HeaderProgress render', { isVisible, message });
  
  if (!isVisible) return null;

  return (
    <ProgressContainer $isVisible={isVisible}>
      <Spinner />
      <StatusText>{message}</StatusText>
    </ProgressContainer>
  );
};

export default HeaderProgress;
