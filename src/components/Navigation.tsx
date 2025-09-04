import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAppSelector, useAppDispatch } from '../redux/store';
import { logout } from '../redux/slices/authSlice';

const NavContainer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${({ theme }) => theme.spacing.lg};
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primaryHover};
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text};
  text-decoration: none;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const UserName = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const UserEmail = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LogoutButton = styled.button`
  background: ${({ theme }) => theme.colors.error};
  color: white;
  border: none;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.error}dd;
  }
`;

const LoginButton = styled(Link)`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
`;

const Navigation: React.FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <NavContainer>
      <Logo to="/">Snipix</Logo>
      
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
      </NavLinks>

      <UserSection>
        {isAuthenticated && user ? (
          <>
            <UserInfo>
              <UserName>{user.name}</UserName>
              <UserEmail>{user.email}</UserEmail>
            </UserInfo>
            <LogoutButton onClick={handleLogout}>
              Logout
            </LogoutButton>
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

