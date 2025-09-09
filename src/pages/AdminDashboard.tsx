/**
 * Admin Dashboard Page Component
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const AdminHeader = styled.div`
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 24px;
  text-align: center;
  
  h3 {
    font-size: 32px;
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

const AdminCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 32px;
  margin-bottom: 24px;
`;

const CardTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
`;

const ComingSoon = styled.div`
  text-align: center;
  padding: 40px;
  color: #6b7280;
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  
  p {
    font-size: 14px;
    margin: 0;
  }
`;

const AdminDashboard: React.FC = () => {
  const { state } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading admin data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (state.isLoading || isLoading) {
    return <LoadingSpinner text="Loading admin dashboard..." />;
  }

  if (!state.user || state.user.role !== 'admin') {
    return (
      <AdminContainer>
        <AdminHeader>
          <h1>Access Denied</h1>
          <p>You don't have permission to access the admin dashboard.</p>
        </AdminHeader>
      </AdminContainer>
    );
  }

  return (
    <AdminContainer>
      <AdminHeader>
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {state.user.name}! Manage your application from here.</p>
      </AdminHeader>

      <StatsGrid>
        <StatCard>
          <h3>0</h3>
          <p>Total Users</p>
        </StatCard>
        <StatCard>
          <h3>0</h3>
          <p>Active Users</p>
        </StatCard>
        <StatCard>
          <h3>0</h3>
          <p>Projects Created</p>
        </StatCard>
        <StatCard>
          <h3>0</h3>
          <p>Storage Used</p>
        </StatCard>
      </StatsGrid>

      <AdminCard>
        <CardTitle>User Management</CardTitle>
        <ComingSoon>
          <h3>🚧 Coming Soon</h3>
          <p>User management features will be available in a future update.</p>
        </ComingSoon>
      </AdminCard>

      <AdminCard>
        <CardTitle>System Analytics</CardTitle>
        <ComingSoon>
          <h3>📊 Coming Soon</h3>
          <p>System analytics and reporting features will be available soon.</p>
        </ComingSoon>
      </AdminCard>

      <AdminCard>
        <CardTitle>System Settings</CardTitle>
        <ComingSoon>
          <h3>⚙️ Coming Soon</h3>
          <p>System configuration and settings will be available soon.</p>
        </ComingSoon>
      </AdminCard>
    </AdminContainer>
  );
};

export default AdminDashboard;
