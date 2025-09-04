import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const Hero = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const CTAButton = styled(Link)`
  display: inline-block;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  text-decoration: none;
  font-size: 1.125rem;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
    transform: translateY(-2px);
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  margin-top: ${({ theme }) => theme.spacing.xxl};
`;

const FeatureCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const FeatureDescription = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.xxl};
  padding: ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const HomePage: React.FC = () => {
  return (
    <HomeContainer>
      <Hero>
        <Title>Professional Video Editing Made Simple</Title>
        <Subtitle>
          Upload your videos, let AI transcribe and remove filler words, then edit with our 
          CapCut-inspired timeline interface. All processing happens locally for your privacy.
        </Subtitle>
        <CTAButton to="/upload">Start Editing Now</CTAButton>
      </Hero>

      <FeaturesGrid>
        <FeatureCard>
          <FeatureIcon>🎬</FeatureIcon>
          <FeatureTitle>AI-Powered Transcription</FeatureTitle>
          <FeatureDescription>
            Automatically transcribe your video audio using local Whisper AI with precise 
            word-level timestamps for accurate editing.
          </FeatureDescription>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>🗑️</FeatureIcon>
          <FeatureTitle>Smart Filler Removal</FeatureTitle>
          <FeatureDescription>
            Automatically detect and remove filler words like "um", "uh", and "like" 
            or manually select specific words to trim from your video.
          </FeatureDescription>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>⏱️</FeatureIcon>
          <FeatureTitle>Professional Timeline</FeatureTitle>
          <FeatureDescription>
            Edit with our CapCut-inspired timeline featuring unlimited layers, 
            real-time preview, and advanced editing tools.
          </FeatureDescription>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>🔒</FeatureIcon>
          <FeatureTitle>Local Processing</FeatureTitle>
          <FeatureDescription>
            All video processing, transcription, and editing happens locally on your machine. 
            Your content never leaves your computer.
          </FeatureDescription>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>📱</FeatureIcon>
          <FeatureTitle>Cross-Platform</FeatureTitle>
          <FeatureDescription>
            Works on desktop and mobile browsers with responsive design and 
            touch gesture support for mobile editing.
          </FeatureDescription>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>⚡</FeatureIcon>
          <FeatureTitle>High Performance</FeatureTitle>
          <FeatureDescription>
            Optimized for smooth editing with canvas-based rendering, 
            virtualized tracks, and efficient video processing.
          </FeatureDescription>
        </FeatureCard>
      </FeaturesGrid>

      <StatsSection>
        <StatItem>
          <StatNumber>100%</StatNumber>
          <StatLabel>Local Processing</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>∞</StatNumber>
          <StatLabel>Unlimited Layers</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>2GB</StatNumber>
          <StatLabel>Max File Size</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>4K</StatNumber>
          <StatLabel>Video Support</StatLabel>
        </StatItem>
      </StatsSection>
    </HomeContainer>
  );
};

export default HomePage;

