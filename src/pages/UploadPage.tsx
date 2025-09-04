import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAppSelector, useAppDispatch } from '../redux/store';
import { uploadVideo, setFile, clearUpload } from '../redux/slices/uploadSlice';
import { createProject } from '../redux/slices/projectSlice';

const UploadContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const UploadCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xxl};
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  
  &.drag-active {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}10;
  }
`;

const UploadIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const UploadTitle = styled.h2`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const UploadDescription = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FileInfo = styled.div`
  background: ${({ theme }) => theme.colors.surfaceHover};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const FileName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const FileSize = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const ProgressContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const ProgressBar = styled.div<{ $progress: number }>`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $progress }) => $progress}%;
    background: ${({ theme }) => theme.colors.primary};
    transition: width 0.3s ease;
  }
`;

const ProgressText = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
  justify-content: center;
`;

const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  
  background: ${({ theme, $primary, $danger }) => 
    $danger ? theme.colors.error :
    $primary ? theme.colors.primary : 
    theme.colors.surfaceHover};
  color: ${({ theme, $primary, $danger }) => 
    $primary || $danger ? 'white' : theme.colors.text};
  
  &:hover {
    background: ${({ theme, $primary, $danger }) => 
      $danger ? theme.colors.error + 'dd' :
      $primary ? theme.colors.primaryHover : 
      theme.colors.border};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Requirements = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surfaceHover};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const RequirementsTitle = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const RequirementsList = styled.ul`
  color: ${({ theme }) => theme.colors.textSecondary};
  list-style: disc;
  padding-left: ${({ theme }) => theme.spacing.lg};
  
  li {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { file, progress, isUploading, error } = useAppSelector(state => state.upload);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid video file (MP4, MOV, AVI, MKV)');
        return;
      }

      // Validate file size (2GB)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        toast.error('File size must be less than 2GB');
        return;
      }

      dispatch(setFile(file));
    }
  }, [dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    multiple: false,
    disabled: isUploading
  });

  const handleUpload = async () => {
    if (!file) return;

    try {
      console.log('Starting upload process...');
      
      // Create a new project first
      const projectResult = await dispatch(createProject({
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: `Video uploaded on ${new Date().toLocaleDateString()}`,
      })).unwrap();

      console.log('Project created:', projectResult);

      if (projectResult && projectResult.data?._id) {
        console.log('Project ID:', projectResult.data._id);
        
        // Upload the video with the project ID
        const uploadResult = await dispatch(uploadVideo({ 
          file, 
          projectId: projectResult.data._id 
        })).unwrap();
        
        console.log('Upload result:', uploadResult);
        
        if (uploadResult) {
          toast.success('Video uploaded successfully!');
          dispatch(clearUpload()); // Clear upload state
          // Wait a moment for state to clear before navigating
          setTimeout(() => {
            if (projectResult.data?._id) {
              navigate(`/transcript/${projectResult.data._id}`);
            }
          }, 100);
        }
      } else {
        console.error('No project ID found:', projectResult);
        toast.error('Failed to create project');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    }
  };

  const handleClear = () => {
    dispatch(clearUpload());
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <UploadContainer>
      <UploadCard {...getRootProps()} className={isDragActive ? 'drag-active' : ''}>
        <input {...getInputProps()} />
        
        {!file ? (
          <>
            <UploadIcon>📁</UploadIcon>
            <UploadTitle>Upload Your Video</UploadTitle>
            <UploadDescription>
              Drag and drop your video file here, or click to browse
            </UploadDescription>
          </>
        ) : (
          <>
            <UploadIcon>✅</UploadIcon>
            <UploadTitle>File Selected</UploadTitle>
            <FileInfo>
              <FileName>{file.name}</FileName>
              <FileSize>{formatFileSize(file.size)}</FileSize>
            </FileInfo>
            
            {isUploading && (
              <ProgressContainer>
                <ProgressBar $progress={progress} />
                <ProgressText>Uploading... {progress}%</ProgressText>
              </ProgressContainer>
            )}
            
            <ActionButtons>
              <Button 
                $primary 
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Start Upload'}
              </Button>
              <Button onClick={handleClear} disabled={isUploading}>
                Clear
              </Button>
            </ActionButtons>
          </>
        )}
      </UploadCard>

      <Requirements>
        <RequirementsTitle>File Requirements</RequirementsTitle>
        <RequirementsList>
          <li>Supported formats: MP4, MOV, AVI, MKV</li>
          <li>Maximum file size: 2GB</li>
          <li>Video resolution: Up to 4K</li>
          <li>Audio: Any standard audio codec</li>
        </RequirementsList>
      </Requirements>
    </UploadContainer>
  );
};

export default UploadPage;
