import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const NavContainer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: #3b82f6;
  text-decoration: none;
  
  &:hover {
    color: #2563eb;
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  color: ${props => props.$active ? '#3b82f6' : '#374151'};
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background: #f3f4f6;
    color: #3b82f6;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const UserName = styled.span`
  font-size: 14px;
  color: #374151;
  font-weight: 500;
`;

const UserEmail = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const UserMenu = styled.div`
  position: relative;
`;

const UserAvatar = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: #2563eb;
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  min-width: 200px;
  z-index: 1000;
  display: ${props => props.$isOpen ? 'block' : 'none'};
`;

const DropdownItem = styled(Link)`
  display: block;
  padding: 12px 16px;
  color: #374151;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    color: #1f2937;
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
  }
`;

const DropdownButton = styled.button`
  display: block;
  width: 100%;
  padding: 12px 16px;
  color: #dc2626;
  background: none;
  border: none;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #fef2f2;
    color: #b91c1c;
  }
`;

const LoginButton = styled(Link)`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    background: #2563eb;
  }
`;

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, state } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <NavContainer>
      <Logo to="/">Snipix</Logo>
      
      {state.isAuthenticated && (
        <NavLinks>
          <NavLink to="/" $active={isActive('/')}>
            Home
          </NavLink>
          <NavLink to="/projects" $active={isActive('/projects')}>
            Projects
          </NavLink>
          <NavLink to="/upload" $active={isActive('/upload')}>
            Upload
          </NavLink>
          {state.user?.role === 'admin' && (
            <NavLink to="/admin" $active={isActive('/admin')}>
              Admin
            </NavLink>
          )}
        </NavLinks>
      )}

      <UserSection>
        {state.isAuthenticated && state.user ? (
          <>
            <UserInfo>
              <UserName>{state.user.name}</UserName>
              <UserEmail>{state.user.email}</UserEmail>
            </UserInfo>
            <UserMenu>
              <UserAvatar onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                {state.user.avatar_url ? (
                  <img 
                    src={state.user.avatar_url} 
                    alt={state.user.name}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(state.user.name)
                )}
              </UserAvatar>
              <DropdownMenu $isOpen={isUserMenuOpen}>
                <DropdownItem to="/profile">Profile Settings</DropdownItem>
                {state.user.role === 'admin' && (
                  <DropdownItem to="/admin">Admin Dashboard</DropdownItem>
                )}
                <DropdownButton onClick={handleLogout}>
                  Logout
                </DropdownButton>
              </DropdownMenu>
            </UserMenu>
          </>
        ) : (
          <LoginButton to="/login">
            Login
          </LoginButton>
        )}
      </UserSection>
    </NavContainer>
  );
};

export default Navigation;