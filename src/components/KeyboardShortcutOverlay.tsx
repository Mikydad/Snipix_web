import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useKeyboardShortcutContext } from '../contexts/KeyboardShortcutContext';

interface KeyboardShortcutOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  className?: string;
}

// Removed keyframe variables to fix interpolation error
// const fadeInAnimation = keyframes`
//   from { opacity: 0; }
//   to { opacity: 1; }
// `;

// const slideUpAnimation = keyframes`
//   from { 
//     opacity: 0;
//     transform: translateY(20px);
//   }
//   to { 
//     opacity: 1;
//     transform: translateY(0);
//   }
// `;

const Overlay = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ $isVisible }) => $isVisible ? 1 : 0};
  visibility: ${({ $isVisible }) => $isVisible ? 'visible' : 'hidden'};
  /* animation: ${({ $isVisible }) => $isVisible ? css`fadeIn 0.3s ease` : 'none'}; */
  transition: all 0.3s ease;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  /* animation: ${css`slideUp 0.3s ease`}; */
`;

const Header = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Content = styled.div`
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
`;

const Section = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ShortcutList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ShortcutItem = styled.div<{ $enabled: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: ${({ theme, $enabled }) => 
    $enabled ? theme.colors.surfaceHover : theme.colors.surface};
  border-radius: 6px;
  transition: background-color 0.2s ease;
  opacity: ${({ $enabled }) => $enabled ? 1 : 0.5};
  
  &:hover {
    background: ${({ theme, $enabled }) => 
      $enabled ? theme.colors.border : theme.colors.surface};
  }
`;

const ShortcutDescription = styled.div<{ $enabled: boolean }>`
  font-size: 14px;
  color: ${({ theme, $enabled }) => 
    $enabled ? theme.colors.text : theme.colors.textSecondary};
`;

const ShortcutKeys = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Key = styled.kbd<{ $enabled: boolean }>`
  background: ${({ theme, $enabled }) => 
    $enabled ? theme.colors.surface : theme.colors.surfaceHover};
  border: 1px solid ${({ theme, $enabled }) => 
    $enabled ? theme.colors.border : theme.colors.border};
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: monospace;
  color: ${({ theme, $enabled }) => 
    $enabled ? theme.colors.text : theme.colors.textSecondary};
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
`;

const PlusSign = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
`;

const Footer = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceHover};
  text-align: center;
`;

const FooterText = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const SearchBox = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  margin-bottom: 16px;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const KeyboardShortcutOverlay: React.FC<KeyboardShortcutOverlayProps> = ({
  isVisible,
  onClose,
  className
}) => {
  const { shortcuts, getShortcutsByCategory } = useKeyboardShortcutContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredShortcuts, setFilteredShortcuts] = useState(shortcuts);

  // Filter shortcuts based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredShortcuts(shortcuts);
    } else {
      const filtered = shortcuts.filter(shortcut =>
        shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredShortcuts(filtered);
    }
  }, [searchTerm, shortcuts]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isVisible, onClose]);

  // Group shortcuts by category
  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  const categories = Object.keys(groupedShortcuts).sort();

  if (!isVisible) return null;

  return (
    <Overlay 
      className={className}
      $isVisible={isVisible}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Modal>
        <Header>
          <Title>Keyboard Shortcuts</Title>
          <CloseButton onClick={onClose}>
            ×
          </CloseButton>
        </Header>

        <Content>
          <SearchBox
            type="text"
            placeholder="Search shortcuts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />

          {categories.length > 0 ? (
            categories.map((category) => (
              <Section key={category}>
                <SectionTitle>{category}</SectionTitle>
                <ShortcutList>
                  {groupedShortcuts[category].map((shortcut, index) => (
                    <ShortcutItem key={index} $enabled={shortcut.enabled?.() !== false}>
                      <ShortcutDescription $enabled={shortcut.enabled?.() !== false}>
                        {shortcut.description}
                      </ShortcutDescription>
                      <ShortcutKeys>
                        {[
                          shortcut.ctrlKey && 'Ctrl',
                          shortcut.shiftKey && 'Shift',
                          shortcut.altKey && 'Alt',
                          shortcut.metaKey && 'Cmd',
                          shortcut.key
                        ].filter(Boolean).map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <Key $enabled={shortcut.enabled?.() !== false}>
                              {key}
                            </Key>
                            {keyIndex < [
                              shortcut.ctrlKey && 'Ctrl',
                              shortcut.shiftKey && 'Shift',
                              shortcut.altKey && 'Alt',
                              shortcut.metaKey && 'Cmd',
                              shortcut.key
                            ].filter(Boolean).length - 1 && (
                              <PlusSign>+</PlusSign>
                            )}
                          </React.Fragment>
                        ))}
                      </ShortcutKeys>
                    </ShortcutItem>
                  ))}
                </ShortcutList>
              </Section>
            ))
          ) : (
            <EmptyState>
              <p>No shortcuts found matching "{searchTerm}"</p>
            </EmptyState>
          )}
        </Content>

        <Footer>
          <FooterText>
            Press <Key $enabled={true}>Esc</Key> to close this dialog
          </FooterText>
        </Footer>
      </Modal>
    </Overlay>
  );
};

export default KeyboardShortcutOverlay;