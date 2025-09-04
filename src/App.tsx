import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';

import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import TranscriptPage from './pages/TranscriptPage';
import TimelinePage from './pages/TimelinePage';
import ProjectListPage from './pages/ProjectListPage';

const AppContainer = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;

const MainContent = styled.main`
  padding-top: 60px;
  min-height: calc(100vh - 60px);
`;

function App() {
  return (
    <AppContainer>
      <Navigation />
      <MainContent>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/transcript/:projectId" element={<TranscriptPage />} />
          <Route path="/timeline/:projectId" element={<TimelinePage />} />
        </Routes>
      </MainContent>
    </AppContainer>
  );
}

export default App;

