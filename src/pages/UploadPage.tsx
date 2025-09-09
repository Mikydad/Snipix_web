import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAppSelector, useAppDispatch } from '../redux/store';
import { uploadVideo, setFile, clearUpload } from '../redux/slices/uploadSlice';
import { createProject } from '../redux/slices/projectSlice';
import { FileMetadata } from '../types';

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
  // Ref for actual file object (not serializable for Redux) - using ref to persist across re-renders
  const actualFileRef = React.useRef<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = React.useState<boolean>(false);
  const [localFileMetadata, setLocalFileMetadata] = React.useState<FileMetadata | null>(null);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  
  // Use refs to store state that won't be affected by re-renders
  const fileMetadataRef = React.useRef<FileMetadata | null>(null);
  const uploadSuccessRef = React.useRef<boolean>(false);
  const projectIdRef = React.useRef<string | null>(null);

  // Reset success state when component mounts (in case user navigates back)
  React.useEffect(() => {
    console.log('🔄 UploadPage component mounted/remounted');
    
    // Try to restore state from localStorage if component was remounted
    const savedFileMetadata = localStorage.getItem('uploadFileMetadata');
    const savedUploadSuccess = localStorage.getItem('uploadSuccess');
    const savedProjectId = localStorage.getItem('uploadProjectId');
    
    // Only restore file metadata if upload was not successful
    if (savedFileMetadata && !localFileMetadata && savedUploadSuccess !== 'true') {
      console.log('🔄 Restoring file metadata from localStorage');
      setLocalFileMetadata(JSON.parse(savedFileMetadata));
      fileMetadataRef.current = JSON.parse(savedFileMetadata);
    }
    
    if (savedUploadSuccess === 'true' && !uploadSuccess) {
      console.log('🔄 Restoring upload success state from localStorage');
      setUploadSuccess(true);
      uploadSuccessRef.current = true;
    }
    
    if (savedProjectId && !projectId) {
      console.log('🔄 Restoring project ID from localStorage');
      setProjectId(savedProjectId);
      projectIdRef.current = savedProjectId;
    }
    
    // Only reset if no saved state exists
    if (!savedFileMetadata && !savedUploadSuccess && !savedProjectId) {
      setUploadSuccess(false);
      setLocalFileMetadata(null);
      setProjectId(null);
    }
  }, [localFileMetadata, projectId, uploadSuccess]);

  // Debug: Monitor state changes and persist to localStorage
  React.useEffect(() => {
    console.log('📊 STATE CHANGE - Local file metadata:', localFileMetadata);
    console.log('📊 STATE CHANGE - Upload success state:', uploadSuccess);
    console.log('📊 STATE CHANGE - Is uploading:', isUploading);
    console.log('📊 STATE CHANGE - Project ID:', projectId);
    console.log('📊 STATE CHANGE - Actual file:', actualFileRef.current);
    
    // Persist state to localStorage
    if (localFileMetadata) {
      localStorage.setItem('uploadFileMetadata', JSON.stringify(localFileMetadata));
    }
    if (uploadSuccess) {
      localStorage.setItem('uploadSuccess', 'true');
      // Clear file metadata from localStorage when upload succeeds
      localStorage.removeItem('uploadFileMetadata');
    }
    if (projectId) {
      localStorage.setItem('uploadProjectId', projectId);
    }
  }, [localFileMetadata, uploadSuccess, isUploading, projectId]);

  // Debug: Monitor Redux state changes
  React.useEffect(() => {
    console.log('🔄 REDUX STATE CHANGE - file:', file);
    console.log('🔄 REDUX STATE CHANGE - progress:', progress);
    console.log('🔄 REDUX STATE CHANGE - isUploading:', isUploading);
    console.log('🔄 REDUX STATE CHANGE - error:', error);
  }, [file, progress, isUploading, error]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('📁 File dropped/selected:', acceptedFiles);
    const file = acceptedFiles[0];
    if (file) {
      // Validate file type - use correct browser MIME types
      const validTypes = [
        'video/mp4',
        'video/quicktime',     // MOV
        'video/x-msvideo',     // AVI
        'video/x-matroska',    // MKV
        'video/webm',          // WebM
        'video/ogg'           // OGG
      ];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid video file (MP4, MOV, AVI, MKV, WebM, OGG)');
        return;
      }

      // Validate file size (2GB)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        toast.error('File size must be less than 2GB');
        return;
      }

      // Store the actual file for upload
      console.log('💾 Setting actualFile to:', file);
      actualFileRef.current = file;
      console.log('💾 actualFile set, checking state...');
      
      // Convert File to FileMetadata for Redux state
      const fileMetadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      };
      
      // Store locally as well to prevent Redux state issues
      console.log('💾 Setting local file metadata:', fileMetadata);
      setLocalFileMetadata(fileMetadata);
      fileMetadataRef.current = fileMetadata; // Set ref
      dispatch(setFile(fileMetadata));
      console.log('💾 All file data set successfully!');
    }
  }, [dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    multiple: false,
    disabled: isUploading || uploadSuccessRef.current
  });

  const handleUpload = async () => {
    console.log('=== HANDLE UPLOAD FUNCTION STARTED ===');
    console.log('fileMetadataRef.current:', fileMetadataRef.current);
    console.log('actualFile:', actualFileRef.current);
    console.log('uploadSuccessRef.current:', uploadSuccessRef.current);
    console.log('isUploading:', isUploading);
    
    // Explicit guard clauses with clear error messages
    if (!fileMetadataRef.current) {
      console.log('❌ No file metadata found');
      toast.error('No file metadata found. Please select a file again.');
      return;
    }
    
    if (!actualFileRef.current) {
      console.log('❌ No file data found');
      toast.error('No file data found. Please re-select the file.');
      return;
    }

    try {
      console.log('✅ Starting upload process...');
      
      // Create a new project first
      console.log('📝 Creating project with name:', fileMetadataRef.current.name.replace(/\.[^/.]+$/, ''));
      const projectResult = await dispatch(createProject({
        name: fileMetadataRef.current.name.replace(/\.[^/.]+$/, ''),
        description: `Video uploaded on ${new Date().toLocaleDateString()}`,
      })).unwrap();

      console.log('📝 Project created successfully:', projectResult);
      
      // Normalize project ID regardless of API response format
      const newProjectId = projectResult?.data?._id;

      if (!newProjectId) {
        console.error('❌ No project ID in response:', projectResult);
        toast.error('Failed to create project - no project ID returned');
        return;
      }

      console.log('✅ Project ID extracted:', newProjectId);
      setProjectId(newProjectId);
      projectIdRef.current = newProjectId;
        
      // Upload the video with the project ID
      console.log('📤 Starting video upload...');
      console.log('📤 Project ID:', newProjectId);
      console.log('📤 File:', actualFileRef.current);
      
      const uploadResult = await dispatch(uploadVideo({ 
        file: actualFileRef.current, 
        projectId: newProjectId 
      })).unwrap();
      
      console.log('📤 Upload result:', uploadResult);
      
      if (uploadResult) {
        console.log('Upload successful! Setting uploadSuccess to true');
        toast.success('Video uploaded successfully!');
        setUploadSuccess(true); // Mark upload as successful
        uploadSuccessRef.current = true; // Set ref
        fileMetadataRef.current = null; // Clear file metadata ref to show success UI
        console.log('uploadSuccess set to true, fileMetadataRef.current cleared');
        // Don't navigate automatically - let user stay on page to see success state
      }
    } catch (error) {
      console.error('❌ Upload failed:', error);
      if (error instanceof Error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.error('Upload failed. Please try again.');
      }
    }
  };

  const handleClear = () => {
    dispatch(clearUpload());
    actualFileRef.current = null;
    setLocalFileMetadata(null);
    setProjectId(null);
    setUploadSuccess(false); // Reset success state
    
    // Clear refs
    fileMetadataRef.current = null;
    uploadSuccessRef.current = false;
    projectIdRef.current = null;
    
    // Clear localStorage
    localStorage.removeItem('uploadFileMetadata');
    localStorage.removeItem('uploadSuccess');
    localStorage.removeItem('uploadProjectId');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  console.log('🎨 RENDERING UploadPage - localFileMetadata:', localFileMetadata, 'uploadSuccess:', uploadSuccess);

  return (
    <UploadContainer>
      <UploadCard {...getRootProps()} className={isDragActive ? 'drag-active' : ''}>
        <input {...getInputProps()} />
        
        {!fileMetadataRef.current && !uploadSuccessRef.current ? (
          <>
            <UploadIcon>📁</UploadIcon>
            <UploadTitle>Upload Your Video</UploadTitle>
            <UploadDescription>
              Drag and drop your video file here, or click to browse
            </UploadDescription>
          </>
        ) : uploadSuccessRef.current ? (
          <>
            <UploadIcon>🎉</UploadIcon>
            <UploadTitle>Upload Successful!</UploadTitle>
            <UploadDescription>
              Your video has been uploaded successfully. You can now work with this project or start a new one.
            </UploadDescription>
            <ProgressContainer>
              <ProgressBar $progress={100} />
              <ProgressText>Complete!</ProgressText>
            </ProgressContainer>
            <ActionButtons>
              <Button 
                $primary 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling to dropzone
                  // Store project ID before clearing
                  const currentProjectId = projectIdRef.current;
                  // Clear upload state before navigating
                  handleClear();
                  // Navigate to transcript page
                  if (currentProjectId) {
                    navigate(`/transcript/${currentProjectId}`);
                  } else {
                    toast.error('Project ID not found');
                  }
                }}
              >
                Go to Transcript
              </Button>
              <Button onClick={(e) => { 
                e.stopPropagation(); 
                handleClear();
                toast.success('Ready for new upload!');
              }}>
                Start New Project
              </Button>
            </ActionButtons>
          </>
        ) : (
          <>
            <UploadIcon>✅</UploadIcon>
            <UploadTitle>File Selected</UploadTitle>
            {fileMetadataRef.current && (
              <FileInfo>
                <FileName>{fileMetadataRef.current.name}</FileName>
                <FileSize>{formatFileSize(fileMetadataRef.current.size)}</FileSize>
              </FileInfo>
            )}
            
            {isUploading && (
              <ProgressContainer>
                <ProgressBar $progress={progress} />
                <ProgressText>Uploading... {progress}%</ProgressText>
              </ProgressContainer>
            )}
            
            <ActionButtons>
              <Button 
                $primary 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling to dropzone
                  console.log('🔘 Start Upload button clicked!');
                  console.log('🔘 About to call handleUpload...');
                  handleUpload();
                  console.log('🔘 handleUpload called!');
                }}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Start Upload'}
              </Button>
              <Button onClick={(e) => { e.stopPropagation(); handleClear(); }} disabled={isUploading}>
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
