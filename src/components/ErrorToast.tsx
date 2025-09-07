import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAppSelector, useAppDispatch } from '../redux/store';
import { removeValidationError, clearValidationWarnings } from '../redux/slices/timelineSlice';

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
  animation: ${props => props.$isVisible ? slideIn : slideOut} 0.3s ease-in-out;
`;

const Toast = styled.div<{ $type: 'error' | 'warning' | 'success' }>`
  background: ${props => {
    switch (props.$type) {
      case 'error': return '#ff4444';
      case 'warning': return '#ff8800';
      case 'success': return '#44ff44';
      default: return '#ff4444';
    }
  }};
  color: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const ToastIcon = styled.div`
  font-size: 20px;
  flex-shrink: 0;
`;

const ToastContent = styled.div`
  flex: 1;
`;

const ToastTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const ToastMessage = styled.div`
  font-size: 14px;
  line-height: 1.4;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  opacity: 0.8;
  
  &:hover {
    opacity: 1;
  }
`;

const ErrorToast: React.FC = () => {
  const dispatch = useAppDispatch();
  const { errors, warnings } = useAppSelector(state => state.timeline.validationState);

  // Auto-remove errors after 5 seconds
  useEffect(() => {
    errors.forEach(error => {
      const timer = setTimeout(() => {
        dispatch(removeValidationError(error.id));
      }, 5000);
      
      return () => clearTimeout(timer);
    });
  }, [errors, dispatch]);

  // Auto-remove warnings after 3 seconds
  useEffect(() => {
    warnings.forEach(warning => {
      const timer = setTimeout(() => {
        dispatch(clearValidationWarnings());
      }, 3000);
      
      return () => clearTimeout(timer);
    });
  }, [warnings, dispatch]);

  const handleCloseError = (errorId: string) => {
    dispatch(removeValidationError(errorId));
  };

  const handleCloseWarning = () => {
    dispatch(clearValidationWarnings());
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'deletion': return '🗑️';
      case 'trim': return '✂️';
      case 'boundary': return '⚠️';
      case 'duration': return '⏱️';
      default: return '❌';
    }
  };

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'performance': return '⚡';
      case 'quality': return '🎯';
      case 'compatibility': return '🔧';
      default: return '⚠️';
    }
  };

  const getErrorTitle = (type: string) => {
    switch (type) {
      case 'deletion': return 'Deletion Error';
      case 'trim': return 'Trim Error';
      case 'boundary': return 'Boundary Error';
      case 'duration': return 'Duration Error';
      default: return 'Error';
    }
  };

  const getWarningTitle = (type: string) => {
    switch (type) {
      case 'performance': return 'Performance Warning';
      case 'quality': return 'Quality Warning';
      case 'compatibility': return 'Compatibility Warning';
      default: return 'Warning';
    }
  };

  return (
    <ToastContainer $isVisible={errors.length > 0 || warnings.length > 0}>
      {errors.map(error => (
        <Toast key={error.id} $type="error">
          <ToastIcon>{getErrorIcon(error.type)}</ToastIcon>
          <ToastContent>
            <ToastTitle>{getErrorTitle(error.type)}</ToastTitle>
            <ToastMessage>{error.message}</ToastMessage>
          </ToastContent>
          <CloseButton onClick={() => handleCloseError(error.id)}>
            ×
          </CloseButton>
        </Toast>
      ))}
      
      {warnings.map(warning => (
        <Toast key={warning.id} $type="warning">
          <ToastIcon>{getWarningIcon(warning.type)}</ToastIcon>
          <ToastContent>
            <ToastTitle>{getWarningTitle(warning.type)}</ToastTitle>
            <ToastMessage>{warning.message}</ToastMessage>
          </ToastContent>
          <CloseButton onClick={handleCloseWarning}>
            ×
          </CloseButton>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default ErrorToast;
