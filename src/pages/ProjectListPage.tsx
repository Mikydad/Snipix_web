import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { useAppSelector, useAppDispatch } from '../redux/store';
import { fetchProjects, deleteProject } from '../redux/slices/projectSlice';
import { toast } from 'react-toastify';

const ProjectListContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const NewProjectButton = styled(Link)`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
`;

const ProjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ProjectCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
  }
`;

const ProjectThumbnail = styled.div`
  width: 100%;
  height: 160px;
  background: ${({ theme }) => theme.colors.surfaceHover};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 3rem;
`;

const ProjectInfo = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ProjectName = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  font-size: 1.125rem;
`;

const ProjectMeta = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ProjectActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ActionButton = styled(Link)`
  flex: 1;
  text-align: center;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  
  background: ${({ theme }) => theme.colors.surfaceHover};
  color: ${({ theme }) => theme.colors.text};
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: white;
  }
`;

const DeleteButton = styled.button`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: none;
  background: ${({ theme }) => theme.colors.error};
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.error}dd;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const EmptyTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const EmptyDescription = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LoadingSpinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid transparent;
  border-top: 3px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  /* animation: ${css`spin 1s linear infinite`}; */
  margin-right: ${({ theme }) => theme.spacing.md};
  
  ${css`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}
`;

const ProjectListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projects, isLoading } = useAppSelector(state => state.projects);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await dispatch(deleteProject(projectId)).unwrap();
        toast.success('Project deleted successfully');
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        Loading projects...
      </LoadingContainer>
    );
  }

  return (
    <ProjectListContainer>
      <Header>
        <Title>My Projects</Title>
        <NewProjectButton to="/upload">Create New Project</NewProjectButton>
      </Header>

      {projects.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📁</EmptyIcon>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>
            Start by uploading a video to create your first project
          </EmptyDescription>
          <NewProjectButton to="/upload">Upload Video</NewProjectButton>
        </EmptyState>
      ) : (
        <ProjectGrid>
          {projects.map((project) => (
            <ProjectCard key={project._id}>
              <ProjectThumbnail>
                {project.thumbnail ? (
                  <img src={`/media/${project._id}/thumbnail`} alt={project.name} />
                ) : (
                  '🎬'
                )}
              </ProjectThumbnail>
              
              <ProjectInfo>
                <ProjectName>{project.name}</ProjectName>
                <ProjectMeta>
                  <span>Created: {formatDate(project.createdAt)}</span>
                  {project.duration && (
                    <span>Duration: {formatDuration(project.duration)}</span>
                  )}
                </ProjectMeta>
              </ProjectInfo>
              
              <ProjectActions>
                <ActionButton to={`/transcript/${project._id}`}>
                  Transcript
                </ActionButton>
                <ActionButton to={`/timeline/${project._id}`}>
                  Timeline
                </ActionButton>
                <DeleteButton onClick={() => handleDeleteProject(project._id)}>
                  Delete
                </DeleteButton>
              </ProjectActions>
            </ProjectCard>
          ))}
        </ProjectGrid>
      )}
    </ProjectListContainer>
  );
};

export default ProjectListPage;

