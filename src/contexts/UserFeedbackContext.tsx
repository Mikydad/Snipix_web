import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useAppSelector } from '../redux/store';
import { ActionHistoryItem, ActionType } from '../types';
import { FeedbackMessage, ProgressIndicator, StatusMessage, useFeedbackManager } from '../components/FeedbackUI';

// Types
interface UserFeedbackContextType {
  // Feedback messages
  addMessage: (message: Omit<FeedbackMessage, 'id'>) => string;
  removeMessage: (id: string) => void;
  showOperationSuccess: (operation: string, details?: string) => void;
  showOperationError: (operation: string, error: string) => void;
  showOperationWarning: (operation: string, warning: string) => void;
  showOperationInfo: (operation: string, info: string) => void;
  
  // Progress indicators
  addProgressIndicator: (indicator: Omit<ProgressIndicator, 'id'>) => string;
  updateProgressIndicator: (id: string, updates: Partial<ProgressIndicator>) => void;
  removeProgressIndicator: (id: string) => void;
  showOperationProgress: (operation: string, progress: number, message?: string) => string;
  
  // Status messages
  setStatus: (message: Omit<StatusMessage, 'id'>) => string;
  clearStatus: () => void;
  showStatusSuccess: (message: string) => void;
  showStatusError: (message: string) => void;
  showStatusWarning: (message: string) => void;
  showStatusInfo: (message: string) => void;
  
  // Toast notifications
  showToast: (type: FeedbackMessage['type'], title: string, message?: string) => void;
  
  // Operation feedback
  handleOperationStart: (operation: string, type: ActionType) => string;
  handleOperationProgress: (id: string, progress: number, message?: string) => void;
  handleOperationSuccess: (id: string, details?: string) => void;
  handleOperationError: (id: string, error: string) => void;
  handleOperationCancel: (id: string) => void;
  
  // Batch operation feedback
  handleBatchStart: (description: string, operationCount: number) => string;
  handleBatchProgress: (id: string, completed: number, total: number) => void;
  handleBatchComplete: (id: string, successCount: number, errorCount: number) => void;
  
  // State
  messages: FeedbackMessage[];
  progressIndicators: ProgressIndicator[];
  statusMessage: StatusMessage | null;
  isProcessing: boolean;
  activeOperations: number;
}

const UserFeedbackContext = createContext<UserFeedbackContextType | null>(null);

interface UserFeedbackProviderProps {
  children: React.ReactNode;
  projectId: string;
}

export const UserFeedbackProvider: React.FC<UserFeedbackProviderProps> = ({
  children,
  projectId
}) => {
  const feedbackManager = useFeedbackManager();
  const [activeOperations, setActiveOperations] = useState(0);
  const [operationMap, setOperationMap] = useState<Map<string, {
    type: ActionType;
    startTime: number;
    progressId?: string;
  }>>(new Map());

  const actionHistory = useAppSelector(state => state.timeline.actionHistory);
  const undoStack = useAppSelector(state => state.timeline.undoStack);
  const redoStack = useAppSelector(state => state.timeline.redoStack);

  // Enhanced operation feedback
  const handleOperationStart = useCallback((
    operation: string, 
    type: ActionType
  ): string => {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to operation map
    setOperationMap(prev => new Map(prev.set(operationId, {
      type,
      startTime: Date.now()
    })));
    
    // Show progress indicator
    const progressId = feedbackManager.addProgressIndicator({
      title: operation,
      progress: 0,
      status: 'running',
      message: 'Starting operation...'
    });
    
    // Update operation map with progress ID
    setOperationMap(prev => {
      const newMap = new Map(prev);
      const operation = newMap.get(operationId);
      if (operation) {
        newMap.set(operationId, { ...operation, progressId });
      }
      return newMap;
    });
    
    // Show status message
    feedbackManager.setStatus({
      type: 'info',
      message: `Starting ${operation}...`,
      duration: 2000
    });
    
    // Show toast
    feedbackManager.showToast('info', `${operation} started`);
    
    setActiveOperations(prev => prev + 1);
    
    return operationId;
  }, [feedbackManager]);

  const handleOperationProgress = useCallback((
    id: string, 
    progress: number, 
    message?: string
  ) => {
    const operation = operationMap.get(id);
    if (operation?.progressId) {
      feedbackManager.updateProgressIndicator(operation.progressId, {
        progress,
        message: message || `Progress: ${progress.toFixed(0)}%`
      });
    }
  }, [feedbackManager, operationMap]);

  const handleOperationSuccess = useCallback((
    id: string, 
    details?: string
  ) => {
    const operation = operationMap.get(id);
    if (operation) {
      const duration = Date.now() - operation.startTime;
      
      // Update progress indicator
      if (operation.progressId) {
        feedbackManager.updateProgressIndicator(operation.progressId, {
          progress: 100,
          status: 'completed',
          message: 'Operation completed successfully'
        });
        
        // Remove progress indicator after delay
        setTimeout(() => {
          feedbackManager.removeProgressIndicator(operation.progressId!);
        }, 2000);
      }
      
      // Show success message
      feedbackManager.showOperationSuccess(
        `${operation.type} operation`,
        details || `Completed in ${duration}ms`
      );
      
      // Show status message
      feedbackManager.setStatus({
        type: 'success',
        message: `${operation.type} completed successfully`,
        duration: 3000
      });
      
      // Remove from operation map
      setOperationMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      setActiveOperations(prev => Math.max(0, prev - 1));
    }
  }, [feedbackManager, operationMap]);

  const handleOperationError = useCallback((
    id: string, 
    error: string
  ) => {
    const operation = operationMap.get(id);
    if (operation) {
      // Update progress indicator
      if (operation.progressId) {
        feedbackManager.updateProgressIndicator(operation.progressId, {
          progress: 0,
          status: 'failed',
          message: `Failed: ${error}`
        });
        
        // Remove progress indicator after delay
        setTimeout(() => {
          feedbackManager.removeProgressIndicator(operation.progressId!);
        }, 5000);
      }
      
      // Show error message
      feedbackManager.showOperationError(
        `${operation.type} operation`,
        error
      );
      
      // Show status message
      feedbackManager.setStatus({
        type: 'error',
        message: `${operation.type} failed: ${error}`,
        duration: 5000
      });
      
      // Remove from operation map
      setOperationMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      setActiveOperations(prev => Math.max(0, prev - 1));
    }
  }, [feedbackManager, operationMap]);

  const handleOperationCancel = useCallback((id: string) => {
    const operation = operationMap.get(id);
    if (operation) {
      // Update progress indicator
      if (operation.progressId) {
        feedbackManager.updateProgressIndicator(operation.progressId, {
          status: 'cancelled',
          message: 'Operation cancelled'
        });
        
        // Remove progress indicator after delay
        setTimeout(() => {
          feedbackManager.removeProgressIndicator(operation.progressId!);
        }, 2000);
      }
      
      // Show warning message
      feedbackManager.addMessage({
        type: 'warning',
        title: `${operation.type} cancelled`,
        message: 'Operation was cancelled by user',
        duration: 3000
      });
      
      // Remove from operation map
      setOperationMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      setActiveOperations(prev => Math.max(0, prev - 1));
    }
  }, [feedbackManager, operationMap]);

  // Batch operation feedback
  const handleBatchStart = useCallback((
    description: string, 
    operationCount: number
  ): string => {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Show progress indicator
    const progressId = feedbackManager.addProgressIndicator({
      title: `Batch: ${description}`,
      progress: 0,
      status: 'running',
      message: `0 of ${operationCount} operations completed`
    });
    
    // Show status message
    feedbackManager.setStatus({
      type: 'info',
      message: `Starting batch operation: ${description}`,
      duration: 3000
    });
    
    // Show toast
    feedbackManager.showToast('info', `Batch operation started: ${description}`);
    
    return batchId;
  }, [feedbackManager]);

  const handleBatchProgress = useCallback((
    id: string, 
    completed: number, 
    total: number
  ) => {
    const progress = (completed / total) * 100;
    
    // This would update the batch progress indicator
    // For now, we'll show a status message
    feedbackManager.setStatus({
      type: 'info',
      message: `Batch progress: ${completed}/${total} operations completed`,
      duration: 1000
    });
  }, [feedbackManager]);

  const handleBatchComplete = useCallback((
    id: string, 
    successCount: number, 
    errorCount: number
  ) => {
    const total = successCount + errorCount;
    
    if (errorCount === 0) {
      feedbackManager.showOperationSuccess(
        'Batch operation',
        `All ${total} operations completed successfully`
      );
    } else {
      feedbackManager.addMessage({
        type: 'warning',
        title: 'Batch operation completed with errors',
        message: `${successCount} successful, ${errorCount} failed`,
        duration: 5000,
        actions: [
          {
            label: 'View Details',
            action: () => console.log('View batch details'),
            variant: 'primary'
          }
        ]
      });
    }
    
    // Show status message
    feedbackManager.setStatus({
      type: errorCount === 0 ? 'success' : 'warning',
      message: `Batch completed: ${successCount} success, ${errorCount} errors`,
      duration: 5000
    });
  }, [feedbackManager]);

  // Enhanced status messages
  const showStatusSuccess = useCallback((message: string) => {
    feedbackManager.setStatus({
      type: 'success',
      message,
      duration: 3000
    });
  }, [feedbackManager]);

  const showStatusError = useCallback((message: string) => {
    feedbackManager.setStatus({
      type: 'error',
      message,
      duration: 5000
    });
  }, [feedbackManager]);

  const showStatusWarning = useCallback((message: string) => {
    feedbackManager.setStatus({
      type: 'warning',
      message,
      duration: 4000
    });
  }, [feedbackManager]);

  const showStatusInfo = useCallback((message: string) => {
    feedbackManager.setStatus({
      type: 'info',
      message,
      duration: 3000
    });
  }, [feedbackManager]);

  // Enhanced operation feedback
  const showOperationWarning = useCallback((operation: string, warning: string) => {
    feedbackManager.addMessage({
      type: 'warning',
      title: `${operation} warning`,
      message: warning,
      duration: 4000
    });
    feedbackManager.showToast('warning', `${operation} warning`, warning);
  }, [feedbackManager]);

  const showOperationInfo = useCallback((operation: string, info: string) => {
    feedbackManager.addMessage({
      type: 'info',
      title: `${operation} info`,
      message: info,
      duration: 3000
    });
    feedbackManager.showToast('info', `${operation} info`, info);
  }, [feedbackManager]);

  // Auto-feedback for undo/redo operations
  useEffect(() => {
    const lastAction = actionHistory[actionHistory.length - 1];
    if (lastAction) {
      const timeSinceLastAction = Date.now() - lastAction.timestamp;
      
      // Show feedback for recent actions
      if (timeSinceLastAction < 1000) {
        const operationType = lastAction.metadata?.operationType || 'unknown';
        
        switch (operationType) {
          case 'undo':
            feedbackManager.setStatus({
              type: 'info',
              message: 'Action undone',
              duration: 2000
            });
            break;
          case 'redo':
            feedbackManager.setStatus({
              type: 'info',
              message: 'Action redone',
              duration: 2000
            });
            break;
          case 'saveState':
            feedbackManager.setStatus({
              type: 'success',
              message: 'State saved',
              duration: 2000
            });
            break;
          default:
            // Don't show feedback for every action to avoid spam
            break;
        }
      }
    }
  }, [actionHistory.length, feedbackManager]); // Only depend on length, not the entire array

  // Auto-feedback for undo/redo availability
  useEffect(() => {
    if (undoStack.length === 0 && actionHistory.length > 0) {
      feedbackManager.setStatus({
        type: 'warning',
        message: 'No more actions to undo',
        duration: 2000
      });
    }
  }, [undoStack.length, actionHistory.length, feedbackManager]);

  useEffect(() => {
    if (redoStack.length === 0 && actionHistory.length > 0) {
      feedbackManager.setStatus({
        type: 'warning',
        message: 'No more actions to redo',
        duration: 2000
      });
    }
  }, [redoStack.length, actionHistory.length, feedbackManager]);

  const contextValue: UserFeedbackContextType = {
    // Feedback messages
    addMessage: feedbackManager.addMessage,
    removeMessage: feedbackManager.removeMessage,
    showOperationSuccess: feedbackManager.showOperationSuccess,
    showOperationError: feedbackManager.showOperationError,
    showOperationWarning,
    showOperationInfo,
    
    // Progress indicators
    addProgressIndicator: feedbackManager.addProgressIndicator,
    updateProgressIndicator: feedbackManager.updateProgressIndicator,
    removeProgressIndicator: feedbackManager.removeProgressIndicator,
    showOperationProgress: feedbackManager.showOperationProgress,
    
    // Status messages
    setStatus: feedbackManager.setStatus,
    clearStatus: feedbackManager.clearStatus,
    showStatusSuccess,
    showStatusError,
    showStatusWarning,
    showStatusInfo,
    
    // Toast notifications
    showToast: feedbackManager.showToast,
    
    // Operation feedback
    handleOperationStart,
    handleOperationProgress,
    handleOperationSuccess,
    handleOperationError,
    handleOperationCancel,
    
    // Batch operation feedback
    handleBatchStart,
    handleBatchProgress,
    handleBatchComplete,
    
    // State
    messages: feedbackManager.messages,
    progressIndicators: feedbackManager.progressIndicators,
    statusMessage: feedbackManager.statusMessage,
    isProcessing: activeOperations > 0,
    activeOperations
  };

  return (
    <UserFeedbackContext.Provider value={contextValue}>
      {children}
    </UserFeedbackContext.Provider>
  );
};

// Hook to use user feedback context
export const useUserFeedback = (): UserFeedbackContextType => {
  const context = useContext(UserFeedbackContext);
  if (!context) {
    throw new Error('useUserFeedback must be used within a UserFeedbackProvider');
  }
  return context;
};

export default UserFeedbackProvider;
