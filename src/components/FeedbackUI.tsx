import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { toast, ToastContainer, ToastPosition } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Animations
const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideInLeft = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideInUp = keyframes`
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Types
export interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  metadata?: {
    operationId?: string;
    projectId?: string;
    timestamp?: number;
  };
}

export interface ProgressIndicator {
  id: string;
  title: string;
  progress: number; // 0-100
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  message?: string;
  estimatedTime?: number; // seconds
  startTime?: number;
  endTime?: number;
}

export interface StatusMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
  persistent?: boolean;
}

// Styled Components
const FeedbackContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
`;

const FeedbackMessage = styled.div<{ type: FeedbackMessage['type'] }>`
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 16px;
  border-left: 4px solid;
  /* animation: ${css`${slideInRight} 0.3s ease-out`}; */
  position: relative;
  overflow: hidden;
  
  ${props => {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
      loading: '#6c757d'
    };
    
    return `
      border-left-color: ${colors[props.type]};
    `;
  }}
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const MessageIcon = styled.div<{ type: FeedbackMessage['type'] }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  
  ${props => {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
      loading: '#6c757d'
    };
    
    return `
      background: ${colors[props.type]};
      color: white;
      ${props.type === 'loading' ? css`/* animation: spin 1s linear infinite; */` : ''}
    `;
  }}
`;

const MessageTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
`;

const MessageContent = styled.p`
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
`;

const MessageActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #007bff;
          color: white;
          &:hover {
            background: #0056b3;
          }
        `;
      case 'danger':
        return `
          background: #dc3545;
          color: white;
          &:hover {
            background: #c82333;
          }
        `;
      default:
        return `
          background: #f8f9fa;
          color: #333;
          border: 1px solid #dee2e6;
          &:hover {
            background: #e9ecef;
          }
        `;
    }
  }}
`;

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  color: #999;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #333;
  }
`;

const ProgressContainer = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 300px;
`;

const ProgressIndicator = styled.div<{ status: ProgressIndicator['status'] }>`
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 16px;
  border-left: 4px solid;
  /* animation: ${css`${slideInUp} 0.3s ease-out`}; */
  
  ${props => {
    const colors = {
      pending: '#6c757d',
      running: '#007bff',
      completed: '#28a745',
      failed: '#dc3545',
      cancelled: '#ffc107'
    };
    
    return `
      border-left-color: ${colors[props.status]};
    `;
  }}
`;

const ProgressHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const ProgressIcon = styled.div<{ status: ProgressIndicator['status'] }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  
  ${props => {
    const colors = {
      pending: '#6c757d',
      running: '#007bff',
      completed: '#28a745',
      failed: '#dc3545',
      cancelled: '#ffc107'
    };
    
    return `
      background: ${colors[props.status]};
      color: white;
      ${props.status === 'running' ? css`/* animation: pulse 1s ease-in-out infinite; */` : ''}
    `;
  }}
`;

const ProgressTitle = styled.h5`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  flex: 1;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const ProgressFill = styled.div<{ progress: number; status: ProgressIndicator['status'] }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: ${props => {
    const colors = {
      pending: '#6c757d',
      running: '#007bff',
      completed: '#28a745',
      failed: '#dc3545',
      cancelled: '#ffc107'
    };
    return colors[props.status];
  }};
  transition: width 0.3s ease;
`;

const ProgressMessage = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
`;

const ProgressTime = styled.div`
  font-size: 11px;
  color: #999;
`;

const StatusBar = styled.div<{ type: StatusMessage['type'] }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  padding: 12px 20px;
  background: ${props => {
    const colors = {
      info: '#17a2b8',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545'
    };
    return colors[props.type];
  }};
  color: white;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  /* animation: ${css`${slideInUp} 0.3s ease-out`}; */
`;

const StatusCloseButton = styled.button`
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.8;
  
  &:hover {
    opacity: 1;
  }
`;

// Custom Toast Styles
const CustomToastContainer = styled(ToastContainer)`
  .Toastify__toast {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }
  
  .Toastify__toast--success {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  }
  
  .Toastify__toast--error {
    background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
  }
  
  .Toastify__toast--warning {
    background: linear-gradient(135deg, #ffc107 0%, #f39c12 100%);
  }
  
  .Toastify__toast--info {
    background: linear-gradient(135deg, #17a2b8 0%, #3498db 100%);
  }
`;

// Feedback Manager Hook
export const useFeedbackManager = () => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [progressIndicators, setProgressIndicators] = useState<ProgressIndicator[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  // Add feedback message
  const addMessage = useCallback((message: Omit<FeedbackMessage, 'id'>) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: FeedbackMessage = {
      ...message,
      id,
      duration: message.duration || 5000
    };

    setMessages(prev => [...prev, newMessage]);

    // Auto-remove after duration
    if (newMessage.duration && newMessage.duration > 0) {
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
      }, newMessage.duration);
    }

    return id;
  }, []);

  // Remove feedback message
  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  // Add progress indicator
  const addProgressIndicator = useCallback((indicator: Omit<ProgressIndicator, 'id'>) => {
    const id = `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newIndicator: ProgressIndicator = {
      ...indicator,
      id,
      startTime: Date.now()
    };

    setProgressIndicators(prev => [...prev, newIndicator]);
    return id;
  }, []);

  // Update progress indicator
  const updateProgressIndicator = useCallback((id: string, updates: Partial<ProgressIndicator>) => {
    setProgressIndicators(prev => 
      prev.map(indicator => 
        indicator.id === id 
          ? { ...indicator, ...updates }
          : indicator
      )
    );
  }, []);

  // Remove progress indicator
  const removeProgressIndicator = useCallback((id: string) => {
    setProgressIndicators(prev => prev.filter(indicator => indicator.id !== id));
  }, []);

  // Set status message
  const setStatus = useCallback((message: Omit<StatusMessage, 'id'>) => {
    const id = `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: StatusMessage = {
      ...message,
      id,
      duration: message.duration || 3000
    };

    setStatusMessage(newMessage);

    // Auto-remove after duration (unless persistent)
    if (!newMessage.persistent && newMessage.duration && newMessage.duration > 0) {
      setTimeout(() => {
        setStatusMessage(null);
      }, newMessage.duration);
    }

    return id;
  }, []);

  // Clear status message
  const clearStatus = useCallback(() => {
    setStatusMessage(null);
  }, []);

  // Toast notifications
  const showToast = useCallback((type: FeedbackMessage['type'], title: string, message?: string) => {
    const content = message ? `${title}: ${message}` : title;
    
    switch (type) {
      case 'success':
        toast.success(content);
        break;
      case 'error':
        toast.error(content);
        break;
      case 'warning':
        toast.warn(content);
        break;
      case 'info':
        toast.info(content);
        break;
      default:
        toast(content);
    }
  }, []);

  // Operation feedback helpers
  const showOperationSuccess = useCallback((operation: string, details?: string) => {
    addMessage({
      type: 'success',
      title: `${operation} completed`,
      message: details,
      duration: 3000
    });
    showToast('success', `${operation} completed`, details);
  }, [addMessage, showToast]);

  const showOperationError = useCallback((operation: string, error: string) => {
    addMessage({
      type: 'error',
      title: `${operation} failed`,
      message: error,
      duration: 5000,
      actions: [
        {
          label: 'Retry',
          action: () => console.log('Retry operation'),
          variant: 'primary'
        }
      ]
    });
    showToast('error', `${operation} failed`, error);
  }, [addMessage, showToast]);

  const showOperationProgress = useCallback((operation: string, progress: number, message?: string) => {
    const id = addProgressIndicator({
      title: operation,
      progress,
      status: 'running',
      message
    });
    return id;
  }, [addProgressIndicator]);

  return {
    // State
    messages,
    progressIndicators,
    statusMessage,
    
    // Actions
    addMessage,
    removeMessage,
    addProgressIndicator,
    updateProgressIndicator,
    removeProgressIndicator,
    setStatus,
    clearStatus,
    showToast,
    
    // Helpers
    showOperationSuccess,
    showOperationError,
    showOperationProgress
  };
};

// Feedback UI Component
export const FeedbackUI: React.FC = () => {
  const { messages, progressIndicators, statusMessage, removeMessage, removeProgressIndicator, clearStatus } = useFeedbackManager();

  return (
    <>
      {/* Custom Toast Container */}
      <CustomToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        />

      {/* Feedback Messages */}
      <FeedbackContainer>
        {messages.map(message => (
          <FeedbackMessage key={message.id} type={message.type}>
            <MessageHeader>
              <MessageIcon type={message.type}>
                {message.type === 'success' && '✓'}
                {message.type === 'error' && '✕'}
                {message.type === 'warning' && '⚠'}
                {message.type === 'info' && 'ℹ'}
                {message.type === 'loading' && '⟳'}
              </MessageIcon>
              <MessageTitle>{message.title}</MessageTitle>
            </MessageHeader>
            
            {message.message && (
              <MessageContent>{message.message}</MessageContent>
            )}
            
            {message.actions && message.actions.length > 0 && (
              <MessageActions>
                {message.actions.map((action, index) => (
                  <ActionButton
                    key={index}
                    variant={action.variant}
                    onClick={action.action}
                  >
                    {action.label}
                  </ActionButton>
                ))}
              </MessageActions>
            )}
            
            <CloseButton onClick={() => removeMessage(message.id)}>
              ×
            </CloseButton>
          </FeedbackMessage>
        ))}
      </FeedbackContainer>

      {/* Progress Indicators */}
      <ProgressContainer>
        {progressIndicators.map(indicator => (
          <ProgressIndicator key={indicator.id} status={indicator.status}>
            <ProgressHeader>
              <ProgressIcon status={indicator.status}>
                {indicator.status === 'pending' && '⏳'}
                {indicator.status === 'running' && '⟳'}
                {indicator.status === 'completed' && '✓'}
                {indicator.status === 'failed' && '✕'}
                {indicator.status === 'cancelled' && '⏹'}
              </ProgressIcon>
              <ProgressTitle>{indicator.title}</ProgressTitle>
            </ProgressHeader>
            
            <ProgressBar>
              <ProgressFill progress={indicator.progress} status={indicator.status} />
            </ProgressBar>
            
            {indicator.message && (
              <ProgressMessage>{indicator.message}</ProgressMessage>
            )}
            
            {indicator.estimatedTime && (
              <ProgressTime>
                Estimated: {indicator.estimatedTime}s
              </ProgressTime>
            )}
          </ProgressIndicator>
        ))}
      </ProgressContainer>

      {/* Status Message */}
      {statusMessage && (
        <StatusBar type={statusMessage.type}>
          {statusMessage.message}
          <StatusCloseButton onClick={clearStatus}>
            ×
          </StatusCloseButton>
        </StatusBar>
      )}
    </>
  );
};

export default FeedbackUI;

