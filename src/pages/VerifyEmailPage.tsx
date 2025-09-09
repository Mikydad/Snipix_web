/**
 * Email Verification Page Component
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const VerifyContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const VerifyCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Icon = styled.div<{ success?: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.success ? '#10b981' : '#f59e0b'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  font-size: 32px;
  color: white;
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
  margin-top: 12px;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

const VerifyEmailPage: React.FC = () => {
  const { verifyEmail, resendVerification, state, clearError } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  // Redirect if already authenticated and email verified
  useEffect(() => {
    if (state.isAuthenticated && state.user?.is_email_verified) {
      navigate('/dashboard', { replace: true });
    }
  }, [state.isAuthenticated, state.user?.is_email_verified, navigate]);

  // Auto-verify if token is present
  useEffect(() => {
    if (token && verificationStatus === 'pending') {
      handleVerifyEmail(token);
    }
  }, [token]);

  const handleVerifyEmail = async (verificationToken?: string) => {
    const tokenToUse = verificationToken || token;
    if (!tokenToUse) {
      setErrorMessage('No verification token provided');
      setVerificationStatus('error');
      return;
    }

    setIsVerifying(true);
    clearError();

    try {
      await verifyEmail(tokenToUse);
      setVerificationStatus('success');
      toast.success('Email verified successfully!');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Email verification failed');
      setVerificationStatus('error');
      toast.error(error.message || 'Email verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    clearError();

    try {
      await resendVerification();
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  if (state.isLoading) {
    return <LoadingSpinner text="Loading..." />;
  }

  return (
    <VerifyContainer>
      <VerifyCard>
        {verificationStatus === 'pending' && (
          <>
            <Icon>
              📧
            </Icon>
            <Title>Verify Your Email</Title>
            <Message>
              {token 
                ? 'Verifying your email address...'
                : 'Please check your email and click the verification link to activate your account.'
              }
            </Message>
            {isVerifying && <LoadingSpinner text="Verifying..." size="small" fullScreen={false} />}
            {!token && (
              <>
                <Button onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
                <SecondaryButton 
                  onClick={handleResendVerification}
                  disabled={isResending}
                >
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </SecondaryButton>
              </>
            )}
          </>
        )}

        {verificationStatus === 'success' && (
          <>
            <Icon success>
              ✓
            </Icon>
            <Title>Email Verified!</Title>
            <Message>
              Your email has been successfully verified. You can now access all features of your account.
            </Message>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </>
        )}

        {verificationStatus === 'error' && (
          <>
            <Icon>
              ⚠️
            </Icon>
            <Title>Verification Failed</Title>
            <Message>
              {errorMessage || 'The verification link is invalid or has expired. Please request a new verification email.'}
            </Message>
            <Button onClick={handleResendVerification} disabled={isResending}>
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>
            <SecondaryButton onClick={() => navigate('/login')}>
              Go to Login
            </SecondaryButton>
          </>
        )}

        <LinksContainer>
          <Link to="/login">Back to Login</Link>
        </LinksContainer>
      </VerifyCard>
    </VerifyContainer>
  );
};

export default VerifyEmailPage;
