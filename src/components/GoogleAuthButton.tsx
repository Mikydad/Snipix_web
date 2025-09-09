/**
 * Google Authentication Button Component
 */
import React from 'react';
import styled from 'styled-components';

const GoogleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #dadce0;
  border-radius: 8px;
  color: #3c4043;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 12px;

  &:hover {
    background: #f8f9fa;
    border-color: #c1c7cd;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  &:active {
    background: #f1f3f4;
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    border-color: #4285f4;
    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
  }
`;

const GoogleIcon = styled.div`
  width: 20px;
  height: 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%234285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/%3E%3Cpath fill='%2334A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/%3E%3Cpath fill='%23FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'/%3E%3Cpath fill='%23EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
`;

interface GoogleAuthButtonProps {
  onClick: () => void;
  disabled?: boolean;
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onClick,
  disabled = false,
  text = 'Continue with Google',
  size = 'medium'
}) => {
  const sizeStyles = {
    small: {
      padding: '8px 12px',
      fontSize: '12px',
      gap: '8px'
    },
    medium: {
      padding: '12px 16px',
      fontSize: '14px',
      gap: '12px'
    },
    large: {
      padding: '16px 20px',
      fontSize: '16px',
      gap: '16px'
    }
  };

  const iconSizes = {
    small: '16px',
    medium: '20px',
    large: '24px'
  };

  return (
    <GoogleButton
      onClick={onClick}
      disabled={disabled}
      style={sizeStyles[size]}
    >
      <GoogleIcon style={{ width: iconSizes[size], height: iconSizes[size] }} />
      {text}
    </GoogleButton>
  );
};

export default GoogleAuthButton;
