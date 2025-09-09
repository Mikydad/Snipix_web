/**
 * Unauthorized Access Page Component
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const UnauthorizedContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const UnauthorizedCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Icon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fef2f2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  font-size: 32px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 16px 0;
`;

const Message = styled.p`
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 24px 0;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 12px;

  &:hover {
    background: #2563eb;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }
`;

const SecondaryButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const LinksContainer = styled.div`
  margin-top: 24px;
  
  a {
    color: #3b82f6;
    text-decoration: none;
    font-size: 14px;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <UnauthorizedContainer>
      <UnauthorizedCard>
        <Icon>
          🚫
        </Icon>
        <Title>Access Denied</Title>
        <Message>
          You don't have permission to access this page. This area is restricted to administrators only.
        </Message>
        
        <Button onClick={handleGoHome}>
          Go to Home
        </Button>
        
        <SecondaryButton onClick={handleGoBack}>
          Go Back
        </SecondaryButton>

        <LinksContainer>
          <p>
            Need help?{' '}
            <Link to="/contact">Contact Support</Link>
          </p>
        </LinksContainer>
      </UnauthorizedCard>
    </UnauthorizedContainer>
  );
};

export default UnauthorizedPage;
