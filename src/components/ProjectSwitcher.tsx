import React, { useState, useCallback, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useProjectHistory } from '../hooks/useProjectHistory';
import { ProjectHistoryStats } from '../utils/projectHistoryManager';

// Animations
const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
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

// Styled Components
const ProjectSwitcherContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SwitcherButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${({ $isActive }) => $isActive ? '#007bff' : '#2d2d2d'};
  color: white;
  border: 1px solid ${({ $isActive }) => $isActive ? '#007bff' : '#404040'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $isActive }) => $isActive ? '#0056b3' : '#404040'};
    border-color: ${({ $isActive }) => $isActive ? '#0056b3' : '#555555'};
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const ProjectIcon = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
`;

const DropdownIcon = styled.div<{ $isOpen: boolean }>`
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid currentColor;
  transition: transform 0.2s ease;
  transform: ${({ $isOpen }) => $isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 300px;
  max-height: 400px;
  overflow-y: auto;
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transform: translateY(${({ $isOpen }) => $isOpen ? '0' : '-10px'});
  transition: all 0.2s ease;
  /* animation: ${({ $isOpen }) => $isOpen ? css`${slideIn} 0.2s ease` : 'none'}; */
`;

const ProjectItem = styled.div<{ $isActive: boolean; $isHovered: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  background: ${({ $isActive, $isHovered }) => 
    $isActive ? '#007bff20' : 
    $isHovered ? 'rgba(255, 255, 255, 0.05)' : 
    'transparent'
  };
  border-left: 3px solid ${({ $isActive }) => $isActive ? '#007bff' : 'transparent'};
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const ProjectInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProjectName = styled.div<{ $isActive: boolean }>`
  font-size: 14px;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  color: ${({ $isActive }) => $isActive ? '#007bff' : '#ffffff'};
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProjectStats = styled.div`
  font-size: 12px;
  color: #888888;
  display: flex;
  gap: 12px;
`;

const StatItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatIcon = styled.span`
  font-size: 10px;
`;

const ProjectActions = styled.div`
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  ${ProjectItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Header = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #404040;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

const HeaderButton = styled.button`
  padding: 4px 8px;
  background: transparent;
  color: #888888;
  border: 1px solid #404040;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    border-color: #555555;
  }
`;

const EmptyState = styled.div`
  padding: 24px 16px;
  text-align: center;
  color: #888888;
  font-size: 14px;
`;

const LoadingState = styled.div`
  padding: 24px 16px;
  text-align: center;
  color: #888888;
  font-size: 14px;
  /* animation: ${css`${fadeIn} 0.3s ease`}; */
`;

// Types
interface ProjectSwitcherProps {
  currentProjectId: string;
  onProjectSwitch: (projectId: string) => void;
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    updatedAt: string;
  }>;
  className?: string;
}

// Main Component
const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  currentProjectId,
  onProjectSwitch,
  projects,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectHistoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const projectHistory = useProjectHistory(currentProjectId);

  // Load project stats
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const stats = projectHistory.getAllProjectStats();
        setProjectStats(stats);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadStats();
    }
  }, [isOpen, projectHistory]);

  const handleToggleDropdown = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleProjectSelect = useCallback((projectId: string) => {
    if (projectId !== currentProjectId) {
      onProjectSwitch(projectId);
    }
    setIsOpen(false);
  }, [currentProjectId, onProjectSwitch]);

  const handleExportProject = useCallback((projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const exportData = projectHistory.exportProjectHistory(projectId);
    if (exportData) {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId}-history.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [projectHistory]);

  const handleClearProjectHistory = useCallback((projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (window.confirm('Are you sure you want to clear all history for this project? This action cannot be undone.')) {
      if (projectId === currentProjectId) {
        projectHistory.clearHistory();
        projectHistory.clearCheckpoints();
      }
      // Note: In a real implementation, you'd want to clear the project's history
      // even when it's not the current project
    }
  }, [currentProjectId, projectHistory]);

  const getProjectStats = useCallback((projectId: string) => {
    return projectStats.find(stat => stat.projectId === projectId);
  }, [projectStats]);

  const formatLastAccessed = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  const formatMemoryUsage = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <ProjectSwitcherContainer className={className}>
      <SwitcherButton 
        onClick={handleToggleDropdown}
        $isActive={isOpen}
      >
        <ProjectIcon>📁</ProjectIcon>
        <span>{currentProject?.name || 'Select Project'}</span>
        <DropdownIcon $isOpen={isOpen} />
      </SwitcherButton>

      <DropdownMenu $isOpen={isOpen}>
        <Header>
          <HeaderTitle>Switch Project</HeaderTitle>
          <HeaderActions>
            <HeaderButton onClick={() => setIsOpen(false)}>
              Close
            </HeaderButton>
          </HeaderActions>
        </Header>

        {isLoading ? (
          <LoadingState>Loading project history...</LoadingState>
        ) : projects.length === 0 ? (
          <EmptyState>No projects available</EmptyState>
        ) : (
          projects.map(project => {
            const stats = getProjectStats(project.id);
            const isActive = project.id === currentProjectId;
            const isHovered = hoveredProjectId === project.id;

            return (
              <ProjectItem
                key={project.id}
                $isActive={isActive}
                $isHovered={isHovered}
                onClick={() => handleProjectSelect(project.id)}
                onMouseEnter={() => setHoveredProjectId(project.id)}
                onMouseLeave={() => setHoveredProjectId(null)}
              >
                <ProjectIcon>📁</ProjectIcon>
                
                <ProjectInfo>
                  <ProjectName $isActive={isActive}>
                    {project.name}
                  </ProjectName>
                  
                  {stats && (
                    <ProjectStats>
                      <StatItem>
                        <StatIcon>📚</StatIcon>
                        {stats.historySize} actions
                      </StatItem>
                      <StatItem>
                        <StatIcon>💾</StatIcon>
                        {stats.checkpointCount} saves
                      </StatItem>
                      <StatItem>
                        <StatIcon>💽</StatIcon>
                        {formatMemoryUsage(stats.memoryUsage)}
                      </StatItem>
                      <StatItem>
                        <StatIcon>🕒</StatIcon>
                        {formatLastAccessed(stats.lastAccessed)}
                      </StatItem>
                    </ProjectStats>
                  )}
                </ProjectInfo>

                <ProjectActions>
                  <ActionButton
                    onClick={(e) => handleExportProject(project.id, e)}
                    title="Export project history"
                  >
                    📤
                  </ActionButton>
                  <ActionButton
                    onClick={(e) => handleClearProjectHistory(project.id, e)}
                    title="Clear project history"
                  >
                    🗑️
                  </ActionButton>
                </ProjectActions>
              </ProjectItem>
            );
          })
        )}
      </DropdownMenu>
    </ProjectSwitcherContainer>
  );
};

export default ProjectSwitcher;
