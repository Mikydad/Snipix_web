/**
 * User Profile Page Component
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ProfileContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const ProfileHeader = styled.div`
  text-align: center;
  margin-bottom: 40px;
  
  h1 {
    font-size: 32px;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 8px 0;
  }
  
  p {
    color: #6b7280;
    font-size: 16px;
    margin: 0;
  }
`;

const ProfileCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 32px;
  margin-bottom: 24px;
`;

const AvatarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
`;

const Avatar = styled.div<{ src?: string }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.src ? `url(${props.src})` : '#e5e7eb'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #6b7280;
  font-weight: 600;
`;

const AvatarInfo = styled.div`
  flex: 1;
  
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 8px 0;
  }
  
  p {
    color: #6b7280;
    margin: 0;
    font-size: 14px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;

  &:hover:not(:disabled) {
    background: #2563eb;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  
  h3 {
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 8px 0;
  }
  
  p {
    color: #6b7280;
    font-size: 14px;
    margin: 0;
  }
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;
`;

const SuccessMessage = styled.div`
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;
`;

interface ProfileFormData {
  name: string;
  username: string;
  avatar_url: string;
}

const ProfilePage: React.FC = () => {
  const { updateUser, state, clearError } = useAuth();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    username: '',
    avatar_url: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize form data when user is loaded
  useEffect(() => {
    if (state.user) {
      setFormData({
        name: state.user.name || '',
        username: state.user.username || '',
        avatar_url: state.user.avatar_url || '',
      });
    }
  }, [state.user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsSuccess(false);
    clearError();

    try {
      await updateUser(formData);
      setIsSuccess(true);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state.isLoading) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  if (!state.user) {
    return <div>User not found</div>;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ProfileContainer>
      <ProfileHeader>
        <h1>Profile Settings</h1>
        <p>Manage your account information and preferences</p>
      </ProfileHeader>

      <ProfileCard>
        <AvatarSection>
          <Avatar src={formData.avatar_url}>
            {!formData.avatar_url && getInitials(formData.name)}
          </Avatar>
          <AvatarInfo>
            <h2>{state.user.name}</h2>
            <p>{state.user.email}</p>
            <p>Member since {new Date(state.user.created_at).toLocaleDateString()}</p>
          </AvatarInfo>
        </AvatarSection>

        <StatsGrid>
          <StatCard>
            <h3>{state.user.login_count}</h3>
            <p>Total Logins</p>
          </StatCard>
          <StatCard>
            <h3>{Math.round(state.user.total_session_time / 60)}</h3>
            <p>Hours Active</p>
          </StatCard>
          <StatCard>
            <h3>{state.user.is_email_verified ? 'Verified' : 'Pending'}</h3>
            <p>Email Status</p>
          </StatCard>
          <StatCard>
            <h3>{state.user.role}</h3>
            <p>Account Type</p>
          </StatCard>
        </StatsGrid>

        {state.error && (
          <ErrorMessage>
            {state.error}
          </ErrorMessage>
        )}

        {isSuccess && (
          <SuccessMessage>
            Profile updated successfully!
          </SuccessMessage>
        )}

        <Form onSubmit={handleSubmit}>
          <FormRow>
            <FormGroup>
              <Label htmlFor="name">Full Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                placeholder="Enter your full name"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="username">Username</Label>
              <Input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={isSubmitting}
                placeholder="Choose a username"
              />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input
              type="url"
              id="avatar_url"
              name="avatar_url"
              value={formData.avatar_url}
              onChange={handleInputChange}
              disabled={isSubmitting}
              placeholder="Enter avatar image URL"
            />
          </FormGroup>

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Profile'}
          </Button>
        </Form>
      </ProfileCard>
    </ProfileContainer>
  );
};

export default ProfilePage;
