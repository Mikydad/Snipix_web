import React, { useState, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAppSelector } from '../redux/store';
import { ActionHistoryItem, ActionType } from '../types';
import { formatActionTimestamp, getActionIcon, generateActionDescription } from '../utils/actionHistory';

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

// Styled Components
const HistoryPanelContainer = styled.div<{ isVisible: boolean; width: number }>`
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

const HistoryHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #404040;
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
`;

const HistoryTitle = styled.h2`
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HistorySubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #888888;
`;

const HistoryControls = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const ControlButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
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
          background: #404040;
          color: #ffffff;
          &:hover {
            background: #505050;
          }
        `;
    }
  }}
`;

const HistoryContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const HistoryList = styled.div`
  padding: 0;
`;

const HistoryItem = styled.div<{ isActive?: boolean; isHovered?: boolean }>`
  padding: 16px 20px;
  border-bottom: 1px solid #333333;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  ${props => props.isActive && `
    background: linear-gradient(90deg, rgba(0, 123, 255, 0.1) 0%, transparent 100%);
    border-left: 3px solid #007bff;
  `}
  
  ${props => props.isHovered && !props.isActive && `
    background: rgba(255, 255, 255, 0.05);
  `}
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const HistoryItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const ActionIcon = styled.div<{ type: ActionType }>`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  
  ${props => {
    const colors = {
      addLayer: '#28a745',
      removeLayer: '#dc3545',
      updateLayer: '#ffc107',
      reorderLayers: '#6f42c1',
      addClip: '#17a2b8',
      removeClip: '#dc3545',
      updateClip: '#ffc107',
      moveClip: '#6f42c1',
      trimClip: '#fd7e14',
      splitClip: '#20c997',
      mergeClips: '#6c757d',
      setPlayheadTime: '#007bff',
      setDuration: '#6f42c1',
      setZoom: '#17a2b8',
      addMarker: '#28a745',
      removeMarker: '#dc3545',
      updateMarker: '#ffc107',
      saveCheckpoint: '#28a745',
      restoreCheckpoint: '#17a2b8',
      undo: '#6c757d',
      redo: '#6c757d',
      saveState: '#28a745',
      projectSwitch: '#6f42c1',
      batchOperation: '#fd7e14'
    };
    
    return `
      background: ${colors[props.type] || '#6c757d'};
      color: white;
    `;
  }}
`;

const ActionTitle = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
`;

const ActionTime = styled.div`
  font-size: 12px;
  color: #888888;
  font-weight: 400;
`;

const ActionDescription = styled.div`
  font-size: 13px;
  color: #cccccc;
  line-height: 1.4;
  margin-bottom: 8px;
`;

const ActionMetadata = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const MetadataTag = styled.span<{ type: 'info' | 'success' | 'warning' | 'error' }>`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  
  ${props => {
    switch (props.type) {
      case 'success':
        return 'background: rgba(40, 167, 69, 0.2); color: #28a745;';
      case 'warning':
        return 'background: rgba(255, 193, 7, 0.2); color: #ffc107;';
      case 'error':
        return 'background: rgba(220, 53, 69, 0.2); color: #dc3545;';
      default:
        return 'background: rgba(0, 123, 255, 0.2); color: #007bff;';
    }
  }}
`;

const SearchContainer = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #404040;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #404040;
  border-radius: 6px;
  background: #2d2d2d;
  color: #ffffff;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
  }
  
  &::placeholder {
    color: #888888;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ isActive: boolean }>`
  padding: 6px 12px;
  border: 1px solid #404040;
  border-radius: 6px;
  background: ${props => props.isActive ? '#007bff' : 'transparent'};
  color: ${props => props.isActive ? '#ffffff' : '#cccccc'};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.isActive ? '#0056b3' : '#404040'};
  }
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #888888;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #cccccc;
`;

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: #888888;
`;

const StatsContainer = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #404040;
  background: rgba(0, 0, 0, 0.2);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #888888;
  font-weight: 500;
`;

// Types
interface HistoryPanelProps {
  isVisible: boolean;
  onClose: () => void;
  width?: number;
  projectId: string;
}

interface HistoryItemProps {
  item: ActionHistoryItem;
  isActive: boolean;
  onSelect: (item: ActionHistoryItem) => void;
  onHover: (item: ActionHistoryItem | null) => void;
}

// History Item Component
const HistoryItemComponent: React.FC<HistoryItemProps> = ({
  item,
  isActive,
  onSelect,
  onHover
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover(item);
  }, [item, onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback(() => {
    onSelect(item);
  }, [item, onSelect]);

  const metadata = useMemo(() => {
    const tags = [];
    
    if (item.metadata?.projectId) {
      tags.push({ type: 'info' as const, text: `Project: ${item.metadata.projectId.slice(-8)}` });
    }
    
    if (item.metadata?.layerId) {
      tags.push({ type: 'info' as const, text: `Layer: ${item.metadata.layerId.slice(-8)}` });
    }
    
    if (item.metadata?.clipId) {
      tags.push({ type: 'info' as const, text: `Clip: ${item.metadata.clipId.slice(-8)}` });
    }
    
    if (item.metadata?.operationType) {
      tags.push({ type: 'success' as const, text: item.metadata.operationType });
    }
    
    return tags;
  }, [item.metadata]);

  return (
    <HistoryItem
      isActive={isActive}
      isHovered={isHovered}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <HistoryItemHeader>
        <ActionIcon type={item.metadata?.operationType || 'saveState'}>
          {getActionIcon(item.metadata?.operationType || 'saveState')}
        </ActionIcon>
        <ActionTitle>{item.description}</ActionTitle>
        <ActionTime>{formatActionTimestamp(item.timestamp)}</ActionTime>
      </HistoryItemHeader>
      
      <ActionDescription>
        {generateActionDescription(item.metadata?.operationType || 'saveState', item.metadata || {})}
      </ActionDescription>
      
      {metadata.length > 0 && (
        <ActionMetadata>
          {metadata.map((tag, index) => (
            <MetadataTag key={index} type={tag.type}>
              {tag.text}
            </MetadataTag>
          ))}
        </ActionMetadata>
      )}
    </HistoryItem>
  );
};

// Main History Panel Component
const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isVisible,
  onClose,
  width = 400,
  projectId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ActionType | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<ActionHistoryItem | null>(null);
  const [hoveredItem, setHoveredItem] = useState<ActionHistoryItem | null>(null);

  const actionHistory = useAppSelector(state => state.timeline.actionHistory);
  const undoStack = useAppSelector(state => state.timeline.undoStack);
  const redoStack = useAppSelector(state => state.timeline.redoStack);

  // Filter and search actions
  const filteredActions = useMemo(() => {
    let filtered = actionHistory;

    // Filter by type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(item => item.metadata?.operationType === selectedFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.description.toLowerCase().includes(query) ||
        item.metadata?.operationType?.toLowerCase().includes(query) ||
        item.metadata?.layerId?.toLowerCase().includes(query) ||
        item.metadata?.clipId?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [actionHistory, selectedFilter, searchQuery]);

  // Get available filter types
  const availableFilters = useMemo(() => {
    const types = new Set<ActionType>();
    actionHistory.forEach(item => {
      if (item.metadata?.operationType) {
        types.add(item.metadata.operationType);
      }
    });
    return Array.from(types);
  }, [actionHistory]);

  // Statistics
  const stats = useMemo(() => {
    const total = actionHistory.length;
    const undoable = undoStack.length;
    const redoable = redoStack.length;
    const recent = actionHistory.filter(item => 
      Date.now() - item.timestamp < 5 * 60 * 1000 // Last 5 minutes
    ).length;

    return { total, undoable, redoable, recent };
  }, [actionHistory, undoStack, redoStack]);

  const handleItemSelect = useCallback((item: ActionHistoryItem) => {
    setSelectedItem(item);
  }, []);

  const handleItemHover = useCallback((item: ActionHistoryItem | null) => {
    setHoveredItem(item);
  }, []);

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      // This would dispatch a clear action history action
      console.log('Clear history');
    }
  }, []);

  const handleExportHistory = useCallback(() => {
    const data = {
      projectId,
      exportedAt: new Date().toISOString(),
      actionHistory: actionHistory.map(item => ({
        ...item,
        description: generateActionDescription(item.metadata?.operationType || 'saveState', item.metadata || {})
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-history-${projectId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [projectId, actionHistory]);

  return (
    <HistoryPanelContainer isVisible={isVisible} width={width}>
      <HistoryHeader>
        <HistoryTitle>
          📚 Action History
        </HistoryTitle>
        <HistorySubtitle>
          Track and manage timeline operations
        </HistorySubtitle>
        
        <HistoryControls>
          <ControlButton onClick={handleExportHistory}>
            📤 Export
          </ControlButton>
          <ControlButton variant="danger" onClick={handleClearHistory}>
            🗑️ Clear
          </ControlButton>
          <ControlButton onClick={onClose}>
            ✕ Close
          </ControlButton>
        </HistoryControls>
      </HistoryHeader>

      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search actions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <FilterContainer>
          <FilterButton
            isActive={selectedFilter === 'all'}
            onClick={() => setSelectedFilter('all')}
          >
            All ({actionHistory.length})
          </FilterButton>
          {availableFilters.map(type => (
            <FilterButton
              key={type}
              isActive={selectedFilter === type}
              onClick={() => setSelectedFilter(type)}
            >
              {type} ({actionHistory.filter(item => item.metadata?.operationType === type).length})
            </FilterButton>
          ))}
        </FilterContainer>
      </SearchContainer>

      <HistoryContent>
        {filteredActions.length === 0 ? (
          <EmptyState>
            <EmptyIcon>📝</EmptyIcon>
            <EmptyTitle>No actions found</EmptyTitle>
            <EmptyDescription>
              {searchQuery || selectedFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Start editing your timeline to see action history'
              }
            </EmptyDescription>
          </EmptyState>
        ) : (
          <HistoryList>
            {filteredActions.map((item, index) => (
              <HistoryItemComponent
                key={item.id}
                item={item}
                isActive={selectedItem?.id === item.id}
                onSelect={handleItemSelect}
                onHover={handleItemHover}
              />
            ))}
          </HistoryList>
        )}
      </HistoryContent>

      <StatsContainer>
        <StatsGrid>
          <StatItem>
            <StatValue>{stats.total}</StatValue>
            <StatLabel>Total Actions</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.undoable}</StatValue>
            <StatLabel>Can Undo</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.redoable}</StatValue>
            <StatLabel>Can Redo</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.recent}</StatValue>
            <StatLabel>Recent (5m)</StatLabel>
          </StatItem>
        </StatsGrid>
      </StatsContainer>
    </HistoryPanelContainer>
  );
};

export default HistoryPanel;