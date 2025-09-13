import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

// Styled Components
const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SettingsButton = styled.button<{ $isOpen: boolean }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-weight: 500;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:active {
    transform: translateY(1px);
  }

  ${({ $isOpen, theme }) => $isOpen && `
    background: ${theme.colors.primary};
    color: white;
    border-color: ${theme.colors.primary};
  `}
`;

const SettingsIcon = styled.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::before {
    content: '⚙️';
    font-size: 14px;
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 1000;
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transform: translateY(${({ $isOpen }) => $isOpen ? '0' : '-10px'});
  transition: all 0.2s ease;
  overflow: hidden;
`;

const MenuItem = styled.button<{ $icon: string }>`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }

  &:last-child {
    border-bottom: none;
  }

  &::before {
    content: '${({ $icon }) => $icon}';
    font-size: 16px;
    width: 20px;
    text-align: center;
  }
`;

const MenuDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  margin: 4px 0;
`;

// Types
interface ProjectSettingsDropdownProps {
  onShortcuts: () => void;
  onHistory: () => void;
  onDashboard: () => void;
  onSwitchProject: () => void;
  onProjectHistory: () => void;
  className?: string;
}

const ProjectSettingsDropdown: React.FC<ProjectSettingsDropdownProps> = ({
  onShortcuts,
  onHistory,
  onDashboard,
  onSwitchProject,
  onProjectHistory,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuItemClick = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  return (
    <DropdownContainer ref={dropdownRef} className={className}>
      <SettingsButton
        $isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Project Settings"
      >
        <SettingsIcon />
        Settings
      </SettingsButton>

      <DropdownMenu $isOpen={isOpen}>
        <MenuItem
          $icon="⌨️"
          onClick={() => handleMenuItemClick(onShortcuts)}
        >
          Keyboard Shortcuts
        </MenuItem>

        <MenuItem
          $icon="📝"
          onClick={() => handleMenuItemClick(onHistory)}
        >
          Action History
        </MenuItem>

        <MenuItem
          $icon="📊"
          onClick={() => handleMenuItemClick(onDashboard)}
        >
          Operation Dashboard
        </MenuItem>

        <MenuDivider />

        <MenuItem
          $icon="🔄"
          onClick={() => handleMenuItemClick(onSwitchProject)}
        >
          Switch Project
        </MenuItem>

        <MenuItem
          $icon="📚"
          onClick={() => handleMenuItemClick(onProjectHistory)}
        >
          Project History
        </MenuItem>
      </DropdownMenu>
    </DropdownContainer>
  );
};

export default ProjectSettingsDropdown;
