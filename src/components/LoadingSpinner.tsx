/**
 * Loading Spinner Component
 */
import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  /* animation: ${css`${spin} 1s linear infinite`}; */
`;

const LoadingText = styled.p`
  margin-top: 16px;
  color: #6b7280;
  font-size: 14px;
`;

// Create styled components for different sizes outside the component
const SmallSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  /* animation: ${css`${spin} 1s linear infinite`}; */
`;

const MediumSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  /* animation: ${css`${spin} 1s linear infinite`}; */
`;

const LargeSpinner = styled.div`
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  /* animation: ${css`${spin} 1s linear infinite`}; */
`;

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = 'Loading...', 
  size = 'medium',
  fullScreen = true 
}) => {
  const getSpinnerComponent = () => {
    switch (size) {
      case 'small':
        return <SmallSpinner />;
      case 'large':
        return <LargeSpinner />;
      default:
        return <MediumSpinner />;
    }
  };

  if (fullScreen) {
    return (
      <SpinnerContainer>
        <div style={{ textAlign: 'center' }}>
          {getSpinnerComponent()}
          {text && <LoadingText>{text}</LoadingText>}
        </div>
      </SpinnerContainer>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {getSpinnerComponent()}
      {text && <span style={{ color: '#6b7280', fontSize: '14px' }}>{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
