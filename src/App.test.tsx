import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import App from './App';
import projectReducer from './redux/slices/projectSlice';
import uploadReducer from './redux/slices/uploadSlice';
import transcriptReducer from './redux/slices/transcriptSlice';
import timelineReducer from './redux/slices/timelineSlice';
import authReducer from './redux/slices/authSlice';

// Create a test store
const createTestStore = () => configureStore({
  reducer: {
    projects: projectReducer,
    upload: uploadReducer,
    transcript: transcriptReducer,
    timeline: timelineReducer,
    auth: authReducer,
  },
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={createTestStore()}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </Provider>
);

describe('App', () => {
  test('renders without crashing', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    
    // Check if the app renders
    expect(screen.getByText(/Snipix/i)).toBeInTheDocument();
  });
});
