import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';

// Pages
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import TranscriptPage from './pages/TranscriptPage';
import TimelinePage from './pages/TimelinePage';
import ProjectListPage from './pages/ProjectListPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import UnauthorizedPage from './pages/UnauthorizedPage';

const AppContainer = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;

const MainContent = styled.main`
  padding-top: 60px;
  min-height: calc(100vh - 60px);
`;

const AuthContent = styled.main`
  min-height: 100vh;
`;

function App() {
  return (
    <AuthProvider>
      <AppContainer>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Navigation />
              <MainContent>
                <HomePage />
              </MainContent>
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute>
              <Navigation />
              <MainContent>
                <ProjectListPage />
              </MainContent>
            </ProtectedRoute>
          } />
          
          <Route path="/upload" element={
            <ProtectedRoute>
              <Navigation />
              <MainContent>
                <UploadPage />
              </MainContent>
            </ProtectedRoute>
          } />
          
          <Route path="/transcript/:projectId" element={
            <ProtectedRoute>
              <Navigation />
              <MainContent>
                <TranscriptPage />
              </MainContent>
            </ProtectedRoute>
          } />
          
          <Route path="/timeline/:projectId" element={
            <ProtectedRoute>
              <Navigation />
              <MainContent>
                <TimelinePage />
              </MainContent>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Navigation />
              <MainContent>
                <ProfilePage />
              </MainContent>
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin={true}>
              <Navigation />
              <MainContent>
                <AdminDashboard />
              </MainContent>
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppContainer>
    </AuthProvider>
  );
}

export default App;