import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useAppSelector } from '../redux/store';
import { ActionHistoryItem, ActionType } from '../types';

// Animations
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

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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

// Styled Components
const DashboardContainer = styled.div<{ isVisible: boolean; width: number }>`
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: ${props => props.width}px;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-left: 1px solid #404040;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  transform: translateX(${props => props.isVisible ? '0' : '100%'});
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const DashboardHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #404040;
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
`;

const DashboardTitle = styled.h2`
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DashboardSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #888888;
`;

const DashboardContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const Section = styled.div`
  padding: 20px;
  border-bottom: 1px solid #333333;
`;

const SectionTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
`;

const StatCard = styled.div<{ variant?: 'success' | 'warning' | 'error' | 'info' }>`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  ${props => {
    switch (props.variant) {
      case 'success':
        return 'border-color: rgba(40, 167, 69, 0.3); background: rgba(40, 167, 69, 0.1);';
      case 'warning':
        return 'border-color: rgba(255, 193, 7, 0.3); background: rgba(255, 193, 7, 0.1);';
      case 'error':
        return 'border-color: rgba(220, 53, 69, 0.3); background: rgba(220, 53, 69, 0.1);';
      case 'info':
        return 'border-color: rgba(0, 123, 255, 0.3); background: rgba(0, 123, 255, 0.1);';
      default:
        return '';
    }
  }}
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #888888;
  font-weight: 500;
`;

const StatChange = styled.div<{ positive?: boolean }>`
  font-size: 11px;
  color: ${props => props.positive ? '#28a745' : '#dc3545'};
  font-weight: 500;
  margin-top: 4px;
`;

const OperationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const OperationItem = styled.div<{ status: 'pending' | 'running' | 'completed' | 'failed' }>`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 12px;
  border-left: 3px solid;
  
  ${props => {
    const colors = {
      pending: '#6c757d',
      running: '#007bff',
      completed: '#28a745',
      failed: '#dc3545'
    };
    
    return `
      border-left-color: ${colors[props.status]};
      ${props.status === 'running' ? css`/* animation: pulse 2s ease-in-out infinite; */` : ''}
    `;
  }}
`;

const OperationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

const OperationIcon = styled.div<{ status: 'pending' | 'running' | 'completed' | 'failed' }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 600;
  
  ${props => {
    const colors = {
      pending: '#6c757d',
      running: '#007bff',
      completed: '#28a745',
      failed: '#dc3545'
    };
    
    return `
      background: ${colors[props.status]};
      color: white;
      ${props.status === 'running' ? css`/* animation: spin 1s linear infinite; */` : ''}
    `;
  }}
`;

const OperationTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  flex: 1;
`;

const OperationTime = styled.div`
  font-size: 11px;
  color: #888888;
`;

const OperationProgress = styled.div`
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1px;
  overflow: hidden;
  margin-top: 8px;
`;

const OperationProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: #007bff;
  transition: width 0.3s ease;
`;

const PerformanceChart = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
`;

const ChartTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
`;

const ChartContainer = styled.div`
  height: 120px;
  display: flex;
  align-items: end;
  gap: 2px;
  padding: 8px 0;
`;

const ChartBar = styled.div<{ height: number; color: string }>`
  flex: 1;
  height: ${props => props.height}%;
  background: ${props => props.color};
  border-radius: 2px 2px 0 0;
  min-height: 2px;
`;

const ChartLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #888888;
  margin-top: 8px;
`;

const ActivityFeed = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ActivityItem = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding: 12px;
  border-left: 3px solid #007bff;
`;

const ActivityText = styled.div`
  font-size: 13px;
  color: #cccccc;
  margin-bottom: 4px;
`;

const ActivityTime = styled.div`
  font-size: 11px;
  color: #888888;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  color: #ffffff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

// Types
interface OperationStatusDashboardProps {
  isVisible: boolean;
  onClose: () => void;
  width?: number;
  projectId: string;
}

interface OperationStatus {
  id: string;
  type: ActionType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
}

// Mock data for demonstration
const mockOperations: OperationStatus[] = [
  {
    id: 'op1',
    type: 'addLayer',
    status: 'completed',
    progress: 100,
    startTime: Date.now() - 5000,
    endTime: Date.now() - 3000,
    duration: 2000
  },
  {
    id: 'op2',
    type: 'addClip',
    status: 'running',
    progress: 65,
    startTime: Date.now() - 2000
  },
  {
    id: 'op3',
    type: 'trimClip',
    status: 'pending',
    progress: 0,
    startTime: Date.now()
  }
];

const mockPerformanceData = [
  { time: '00:00', operations: 0, errors: 0 },
  { time: '00:01', operations: 2, errors: 0 },
  { time: '00:02', operations: 5, errors: 1 },
  { time: '00:03', operations: 3, errors: 0 },
  { time: '00:04', operations: 7, errors: 0 },
  { time: '00:05', operations: 4, errors: 1 },
  { time: '00:06', operations: 6, errors: 0 },
  { time: '00:07', operations: 8, errors: 0 }
];

const OperationStatusDashboard: React.FC<OperationStatusDashboardProps> = ({
  isVisible,
  onClose,
  width = 400,
  projectId
}) => {
  const [operations, setOperations] = useState<OperationStatus[]>(mockOperations);
  const [performanceData, setPerformanceData] = useState(mockPerformanceData);
  const [activityFeed, setActivityFeed] = useState<Array<{
    id: string;
    text: string;
    timestamp: number;
  }>>([
    { id: '1', text: 'Added video layer', timestamp: Date.now() - 5000 },
    { id: '2', text: 'Trimmed clip to 10s', timestamp: Date.now() - 3000 },
    { id: '3', text: 'Added audio track', timestamp: Date.now() - 1000 }
  ]);

  const actionHistory = useAppSelector(state => state.timeline.actionHistory);
  const undoStack = useAppSelector(state => state.timeline.undoStack);
  const redoStack = useAppSelector(state => state.timeline.redoStack);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = actionHistory.length;
    const successful = actionHistory.length; // For now, assume all are successful
    const failed = 0; // No error tracking in current implementation
    const recent = actionHistory.filter(item => 
      Date.now() - item.timestamp < 5 * 60 * 1000
    ).length;
    
    const avgDuration = actionHistory.length > 0 
      ? actionHistory.reduce((sum, item) => sum + (item.metadata?.duration || 0), 0) / actionHistory.length
      : 0;

    return {
      total,
      successful,
      failed,
      recent,
      avgDuration,
      successRate: total > 0 ? (successful / total) * 100 : 0
    };
  }, [actionHistory]);

  // Update operations periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setOperations(prev => prev.map(op => {
        if (op.status === 'running') {
          const newProgress = Math.min(op.progress + Math.random() * 10, 100);
          return {
            ...op,
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : 'running',
            endTime: newProgress >= 100 ? Date.now() : undefined
          };
        }
        return op;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update performance data
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceData(prev => {
        const newData = [...prev];
        newData.shift(); // Remove oldest data point
        
        // Add new data point
        const newOperations = Math.floor(Math.random() * 10);
        const newErrors = Math.floor(Math.random() * 3);
        
        newData.push({
          time: new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          operations: newOperations,
          errors: newErrors
        });
        
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getOperationIcon = (status: OperationStatus['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '⟳';
      case 'completed': return '✓';
      case 'failed': return '✕';
    }
  };

  const getOperationColor = (status: OperationStatus['status']) => {
    switch (status) {
      case 'pending': return '#6c757d';
      case 'running': return '#007bff';
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <DashboardContainer isVisible={isVisible} width={width}>
      <DashboardHeader>
        <DashboardTitle>
          📊 Operation Dashboard
        </DashboardTitle>
        <DashboardSubtitle>
          Real-time operation status and performance metrics
        </DashboardSubtitle>
        <CloseButton onClick={onClose}>
          ×
        </CloseButton>
      </DashboardHeader>

      <DashboardContent>
        {/* Statistics Section */}
        <Section>
          <SectionTitle>📈 Statistics</SectionTitle>
          <StatsGrid>
            <StatCard variant="info">
              <StatValue>{stats.total}</StatValue>
              <StatLabel>Total Operations</StatLabel>
              <StatChange positive={stats.recent > 0}>
                +{stats.recent} recent
              </StatChange>
            </StatCard>
            
            <StatCard variant="success">
              <StatValue>{stats.successful}</StatValue>
              <StatLabel>Successful</StatLabel>
              <StatChange positive={stats.successRate > 90}>
                {stats.successRate.toFixed(1)}% success rate
              </StatChange>
            </StatCard>
            
            <StatCard variant="error">
              <StatValue>{stats.failed}</StatValue>
              <StatLabel>Failed</StatLabel>
              <StatChange positive={stats.failed === 0}>
                {stats.failed === 0 ? 'No errors' : `${stats.failed} errors`}
              </StatChange>
            </StatCard>
            
            <StatCard>
              <StatValue>{formatDuration(stats.avgDuration)}</StatValue>
              <StatLabel>Avg Duration</StatLabel>
              <StatChange positive={stats.avgDuration < 1000}>
                {stats.avgDuration < 1000 ? 'Fast' : 'Slow'}
              </StatChange>
            </StatCard>
          </StatsGrid>
        </Section>

        {/* Current Operations Section */}
        <Section>
          <SectionTitle>⚡ Current Operations</SectionTitle>
          <OperationList>
            {operations.map(operation => (
              <OperationItem key={operation.id} status={operation.status}>
                <OperationHeader>
                  <OperationIcon status={operation.status}>
                    {getOperationIcon(operation.status)}
                  </OperationIcon>
                  <OperationTitle>{operation.type}</OperationTitle>
                  <OperationTime>
                    {formatTime(operation.startTime)}
                  </OperationTime>
                </OperationHeader>
                
                {operation.status === 'running' && (
                  <OperationProgress>
                    <OperationProgressFill progress={operation.progress} />
                  </OperationProgress>
                )}
                
                {operation.duration && (
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                    Duration: {formatDuration(operation.duration)}
                  </div>
                )}
              </OperationItem>
            ))}
          </OperationList>
        </Section>

        {/* Performance Chart Section */}
        <Section>
          <SectionTitle>📊 Performance</SectionTitle>
          <PerformanceChart>
            <ChartTitle>Operations per Minute</ChartTitle>
            <ChartContainer>
              {performanceData.map((data, index) => (
                <ChartBar
                  key={index}
                  height={(data.operations / 10) * 100}
                  color={data.errors > 0 ? '#dc3545' : '#007bff'}
                />
              ))}
            </ChartContainer>
            <ChartLabels>
              <span>{performanceData[0]?.time}</span>
              <span>{performanceData[performanceData.length - 1]?.time}</span>
            </ChartLabels>
          </PerformanceChart>
        </Section>

        {/* Activity Feed Section */}
        <Section>
          <SectionTitle>🔄 Recent Activity</SectionTitle>
          <ActivityFeed>
            {activityFeed.map(activity => (
              <ActivityItem key={activity.id}>
                <ActivityText>{activity.text}</ActivityText>
                <ActivityTime>{formatTime(activity.timestamp)}</ActivityTime>
              </ActivityItem>
            ))}
          </ActivityFeed>
        </Section>

        {/* Undo/Redo Status Section */}
        <Section>
          <SectionTitle>↩️ Undo/Redo Status</SectionTitle>
          <StatsGrid>
            <StatCard variant="info">
              <StatValue>{undoStack.length}</StatValue>
              <StatLabel>Can Undo</StatLabel>
            </StatCard>
            
            <StatCard variant="info">
              <StatValue>{redoStack.length}</StatValue>
              <StatLabel>Can Redo</StatLabel>
            </StatCard>
          </StatsGrid>
        </Section>
      </DashboardContent>
    </DashboardContainer>
  );
};

export default OperationStatusDashboard;

