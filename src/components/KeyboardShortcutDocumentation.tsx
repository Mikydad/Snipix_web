import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useKeyboardShortcutContext } from '../contexts/KeyboardShortcutContext';

interface KeyboardShortcutDocumentationProps {
  className?: string;
}

const DocumentationContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
  text-align: center;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  margin-bottom: 32px;
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const CategoryCard = styled.div`
  background: ${({ theme }) => theme.colors.surfaceHover};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }
`;

const CategoryTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CategoryIcon = styled.span`
  font-size: 20px;
`;

const ShortcutList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ShortcutItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ShortcutDescription = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const ShortcutKeys = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Key = styled.kbd`
  background: ${({ theme }) => theme.colors.surfaceHover};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: ${({ theme }) => theme.colors.text};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  font-weight: 600;
`;

const PlusSign = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  font-weight: 600;
`;

const TipsSection = styled.div`
  background: ${({ theme }) => theme.colors.primary + '10'};
  border: 1px solid ${({ theme }) => theme.colors.primary + '30'};
  border-radius: 8px;
  padding: 20px;
  margin-top: 32px;
`;

const TipsTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TipsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const TipItem = styled.li`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
  
  &::before {
    content: '💡';
    position: absolute;
    left: 0;
    top: 0;
  }
`;

const SearchBox = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  margin-bottom: 24px;
  transition: border-color 0.2s ease;
  
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
  font-size: 16px;
`;

const KeyboardShortcutDocumentation: React.FC<KeyboardShortcutDocumentationProps> = ({
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

  // Group shortcuts by category
  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  const categories = Object.keys(groupedShortcuts).sort();

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'Undo/Redo': return '↩️';
      case 'Save Operations': return '💾';
      case 'Timeline Navigation': return '⏯️';
      case 'Layer Operations': return '📁';
      case 'General': return '⚙️';
      default: return '🔧';
    }
  };

  const getCategoryDescription = (category: string): string => {
    switch (category) {
      case 'Undo/Redo': return 'Control your editing history';
      case 'Save Operations': return 'Save and manage your work';
      case 'Timeline Navigation': return 'Navigate through your timeline';
      case 'Layer Operations': return 'Manage layers and clips';
      case 'General': return 'General application shortcuts';
      default: return 'Application shortcuts';
    }
  };

  return (
    <DocumentationContainer className={className}>
      <Title>Keyboard Shortcuts</Title>
      <Subtitle>
        Master the timeline editor with these powerful keyboard shortcuts
      </Subtitle>

      <SearchBox
        type="text"
        placeholder="Search shortcuts..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {categories.length > 0 ? (
        <>
          <CategoryGrid>
            {categories.map((category) => (
              <CategoryCard key={category}>
                <CategoryTitle>
                  <CategoryIcon>{getCategoryIcon(category)}</CategoryIcon>
                  {category}
                </CategoryTitle>
                <p style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '16px' 
                }}>
                  {getCategoryDescription(category)}
                </p>
                <ShortcutList>
                  {groupedShortcuts[category].map((shortcut, index) => (
                    <ShortcutItem key={index}>
                      <ShortcutDescription>
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
                            <Key>{key}</Key>
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
              </CategoryCard>
            ))}
          </CategoryGrid>

          <TipsSection>
            <TipsTitle>
              💡 Pro Tips
            </TipsTitle>
            <TipsList>
              <TipItem>
                Most shortcuts work globally - you don't need to focus on a specific element
              </TipItem>
              <TipItem>
                Use <Key>Ctrl</Key>+<Key>/</Key> to quickly open the shortcuts overlay
              </TipItem>
              <TipItem>
                Press <Key>Esc</Key> to close any open dialog or overlay
              </TipItem>
              <TipItem>
                Some shortcuts are context-sensitive and only work when relevant elements are selected
              </TipItem>
              <TipItem>
                You can combine multiple modifier keys (Ctrl+Shift+Alt) for advanced shortcuts
              </TipItem>
            </TipsList>
          </TipsSection>
        </>
      ) : (
        <EmptyState>
          <p>No shortcuts found matching "{searchTerm}"</p>
          <p>Try searching for different terms or clear your search</p>
        </EmptyState>
      )}
    </DocumentationContainer>
  );
};

export default KeyboardShortcutDocumentation;

