import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useProjectHistory } from '../hooks/useProjectHistory';
import { ProjectHistoryStats } from '../utils/projectHistoryManager';

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
const DashboardContainer = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: #1a1a1a;
  border-left: 1px solid #333333;
  z-index: 1000;
  transform: translateX(${({ $isVisible }) => $isVisible ? '0' : '100%'});
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  padding: 20px;
  border-bottom: 1px solid #333333;
  background: #2d2d2d;
`;

const HeaderTitle = styled.h2`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
`;

const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #888888;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #888888;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SectionIcon = styled.span`
  font-size: 18px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const StatCard = styled.div<{ $isActive?: boolean }>`
  background: ${({ $isActive }) => $isActive ? '#007bff20' : '#2d2d2d'};
  border: 1px solid ${({ $isActive }) => $isActive ? '#007bff' : '#404040'};
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s ease;
  
  ${({ $isActive }) => $isActive && `
    /* animation: ${css`${pulse} 2s ease-in-out infinite`}; */
  `}
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
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProjectList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ProjectItem = styled.div<{ $isActive: boolean }>`
  background: ${({ $isActive }) => $isActive ? '#007bff20' : '#2d2d2d'};
  border: 1px solid ${({ $isActive }) => $isActive ? '#007bff' : '#404040'};
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $isActive }) => $isActive ? '#007bff30' : '#404040'};
    border-color: ${({ $isActive }) => $isActive ? '#007bff' : '#555555'};
  }
`;

const ProjectName = styled.div<{ $isActive: boolean }>`
  font-size: 14px;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  color: ${({ $isActive }) => $isActive ? '#007bff' : '#ffffff'};
  margin-bottom: 4px;
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

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: 8px 16px;
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

const ExportSection = styled.div`
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 8px;
  padding: 16px;
`;

const ExportButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #28a745;
  border: 1px solid #28a745;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover {
    background: #218838;
    border-color: #218838;
  }
`;

const ImportButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #17a2b8;
  border: 1px solid #17a2b8;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  
  &:hover {
    background: #138496;
    border-color: #138496;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #888888;
  font-size: 14px;
  /* animation: ${css`${fadeIn} 0.3s ease`}; */
`;

// Types
interface ProjectHistoryDashboardProps {
  isVisible: boolean;
  onClose: () => void;
  currentProjectId: string;
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    updatedAt: string;
  }>;
  onProjectSwitch: (projectId: string) => void;
}

// Main Component
const ProjectHistoryDashboard: React.FC<ProjectHistoryDashboardProps> = ({
  isVisible,
  onClose,
  currentProjectId,
  projects,
  onProjectSwitch
}) => {
  const [projectStats, setProjectStats] = useState<ProjectHistoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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

    if (isVisible) {
      loadStats();
    }
  }, [isVisible, projectHistory]);

  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, []);

  const handleExportAll = useCallback(() => {
    const allProjectsData = projectStats.map(stat => {
      const project = projects.find(p => p.id === stat.projectId);
      return {
        projectId: stat.projectId,
        projectName: project?.name || 'Unknown Project',
        stats: stat,
        exportedAt: new Date().toISOString()
      };
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      projects: allProjectsData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-projects-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [projectStats, projects]);

  const handleImportProjects = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            // Handle import logic here
            console.log('Importing projects:', data);
          } catch (error) {
            console.error('Failed to import projects:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const handleClearAllHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all project history? This action cannot be undone.')) {
      projectHistory.clearHistory();
      projectHistory.clearCheckpoints();
      // Reload stats
      const stats = projectHistory.getAllProjectStats();
      setProjectStats(stats);
    }
  }, [projectHistory]);

  const getCurrentProjectStats = useCallback(() => {
    return projectStats.find(stat => stat.projectId === currentProjectId);
  }, [projectStats, currentProjectId]);

  const formatMemoryUsage = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }, []);

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

  const currentStats = getCurrentProjectStats();

  return (
    <DashboardContainer $isVisible={isVisible}>
      <Header>
        <HeaderTitle>Project History Dashboard</HeaderTitle>
        <HeaderSubtitle>Manage undo/redo history across all projects</HeaderSubtitle>
        <CloseButton onClick={onClose}>×</CloseButton>
      </Header>

      <Content>
        {isLoading ? (
          <LoadingState>Loading project statistics...</LoadingState>
        ) : (
          <>
            {/* Current Project Stats */}
            <Section>
              <SectionTitle>
                <SectionIcon>📊</SectionIcon>
                Current Project Statistics
              </SectionTitle>
              
              {currentStats ? (
                <StatsGrid>
                  <StatCard $isActive={true}>
                    <StatValue>{currentStats.historySize}</StatValue>
                    <StatLabel>Actions</StatLabel>
                  </StatCard>
                  <StatCard $isActive={true}>
                    <StatValue>{currentStats.checkpointCount}</StatValue>
                    <StatLabel>Checkpoints</StatLabel>
                  </StatCard>
                  <StatCard $isActive={true}>
                    <StatValue>{formatMemoryUsage(currentStats.memoryUsage)}</StatValue>
                    <StatLabel>Memory Usage</StatLabel>
                  </StatCard>
                  <StatCard $isActive={true}>
                    <StatValue>{formatLastAccessed(currentStats.lastAccessed)}</StatValue>
                    <StatLabel>Last Accessed</StatLabel>
                  </StatCard>
                </StatsGrid>
              ) : (
                <div style={{ color: '#888888', fontSize: '14px' }}>
                  No statistics available for current project
                </div>
              )}
            </Section>

            {/* All Projects */}
            <Section>
              <SectionTitle>
                <SectionIcon>📁</SectionIcon>
                All Projects ({projects.length})
              </SectionTitle>
              
              <ProjectList>
                {projects.map(project => {
                  const stats = projectStats.find(s => s.projectId === project.id);
                  const isActive = project.id === currentProjectId;
                  
                  return (
                    <ProjectItem
                      key={project.id}
                      $isActive={isActive}
                      onClick={() => handleProjectSelect(project.id)}
                    >
                      <ProjectName $isActive={isActive}>
                        {project.name}
                      </ProjectName>
                      
                      {stats && (
                        <ProjectStats>
                          <StatItem>
                            <span>📚</span>
                            {stats.historySize} actions
                          </StatItem>
                          <StatItem>
                            <span>💾</span>
                            {stats.checkpointCount} saves
                          </StatItem>
                          <StatItem>
                            <span>💽</span>
                            {formatMemoryUsage(stats.memoryUsage)}
                          </StatItem>
                          <StatItem>
                            <span>🕒</span>
                            {formatLastAccessed(stats.lastAccessed)}
                          </StatItem>
                        </ProjectStats>
                      )}
                    </ProjectItem>
                  );
                })}
              </ProjectList>
            </Section>

            {/* Actions */}
            <Section>
              <SectionTitle>
                <SectionIcon>⚙️</SectionIcon>
                Actions
              </SectionTitle>
              
              <ActionButtons>
                <ActionButton $variant="primary" onClick={() => onProjectSwitch(selectedProjectId || currentProjectId)}>
                  Switch Project
                </ActionButton>
                <ActionButton $variant="danger" onClick={handleClearAllHistory}>
                  Clear All History
                </ActionButton>
              </ActionButtons>
            </Section>

            {/* Export/Import */}
            <Section>
              <SectionTitle>
                <SectionIcon>💾</SectionIcon>
                Export & Import
              </SectionTitle>
              
              <ExportSection>
                <ExportButton onClick={handleExportAll}>
                  📤 Export All Projects
                </ExportButton>
                <ImportButton onClick={handleImportProjects}>
                  📥 Import Projects
                </ImportButton>
              </ExportSection>
            </Section>
          </>
        )}
      </Content>
    </DashboardContainer>
  );
};

export default ProjectHistoryDashboard;
