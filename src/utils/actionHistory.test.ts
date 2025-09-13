/**
 * Unit tests for Action History utilities
 */

import {
  ActionHistoryManager,
  createActionHistoryManager,
  generateActionDescription,
  validateActionHistoryItem,
  formatActionTimestamp,
  getActionIcon
} from './actionHistory';
import { ActionType, ActionHistoryItem, ActionMetadata } from '../types';

describe('Action History Utilities', () => {
  describe('createActionHistoryManager', () => {
    it('should create ActionHistoryManager instance', () => {
      const manager = createActionHistoryManager('test-project');
      
      expect(manager).toBeInstanceOf(ActionHistoryManager);
    });

    it('should create manager with custom config', () => {
      const config = {
        maxSize: 50,
        enableCompression: true,
        enableMetadata: true,
        autoCleanup: true
      };
      const manager = createActionHistoryManager('test-project', config);
      
      expect(manager).toBeInstanceOf(ActionHistoryManager);
    });
  });

  describe('formatActionTimestamp', () => {
    it('should format timestamp correctly', () => {
      const timestamp = 1640995200000; // 2022-01-01 00:00:00 UTC
      const formatted = formatActionTimestamp(timestamp);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('should handle current timestamp', () => {
      const now = Date.now();
      const formatted = formatActionTimestamp(now);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('getActionIcon', () => {
    it('should return correct icons for different action types', () => {
      expect(getActionIcon('addClip')).toBe('📎');
      expect(getActionIcon('removeClip')).toBe('🗑️');
      expect(getActionIcon('moveClip')).toBe('↔️');
      expect(getActionIcon('trimClip')).toBe('✂️');
      expect(getActionIcon('addLayer')).toBe('➕');
      expect(getActionIcon('removeLayer')).toBe('➖');
      expect(getActionIcon('setPlayheadTime')).toBe('⏯️');
    });

    it('should return default icon for unknown action type', () => {
      expect(getActionIcon('UNKNOWN' as ActionType)).toBe('📝');
    });
  });

  describe('validateActionHistoryItem', () => {
    it('should validate correct action history item', () => {
      const action: ActionHistoryItem = {
        id: 'test',
        type: 'addClip',
        description: 'Test action',
        timestamp: Date.now(),
        state: {},
        metadata: {}
      };
      expect(validateActionHistoryItem(action)).toBe(true);
    });

    it('should reject invalid action history item', () => {
      const invalidAction = {
        id: 'test',
        type: 'INVALID' as ActionType,
        description: '',
        timestamp: -1,
        state: {},
        metadata: {}
      };
      
      expect(validateActionHistoryItem(invalidAction)).toBe(false);
    });

    it('should reject action with missing required fields', () => {
      const incompleteAction = {
        id: 'test',
        type: 'addClip',
        // Missing other required fields
      } as ActionHistoryItem;
      
      expect(validateActionHistoryItem(incompleteAction)).toBe(false);
    });
  });

  describe('generateActionDescription', () => {
    it('should generate description for addClip action', () => {
      const description = generateActionDescription('addClip', {
        clipId: 'clip1',
        layerId: 'layer1'
      });
      
      expect(description).toContain('Add Clip');
    });

    it('should generate description for removeClip action', () => {
      const description = generateActionDescription('removeClip', {
        clipId: 'clip1',
        layerId: 'layer1'
      });
      
      expect(description).toContain('Remove Clip');
    });

    it('should generate description for moveClip action', () => {
      const description = generateActionDescription('moveClip', {
        clipId: 'clip1',
        fromTime: 0,
        toTime: 10
      });
      
      expect(description).toContain('Move Clip');
    });

    it('should generate description for trimClip action', () => {
      const description = generateActionDescription('trimClip', {
        clipId: 'clip1',
        startTime: 0,
        endTime: 10
      });
      
      expect(description).toContain('Trim Clip');
    });

    it('should generate description for addLayer action', () => {
      const description = generateActionDescription('addLayer', {
        layerId: 'layer1'
      });
      
      expect(description).toContain('Add Layer');
    });

    it('should generate description for removeLayer action', () => {
      const description = generateActionDescription('removeLayer', {
        layerId: 'layer1'
      });
      
      expect(description).toContain('Remove Layer');
    });

    it('should generate description for setPlayheadTime action', () => {
      const description = generateActionDescription('setPlayheadTime', {
        time: 10
      });
      
      expect(description).toContain('Set Playhead');
    });

    it('should generate fallback description for unknown action', () => {
      const description = generateActionDescription('UNKNOWN' as ActionType, {});
      expect(description).toBe('Action: UNKNOWN');
    });
  });
});

describe('ActionHistoryManager', () => {
  let manager: ActionHistoryManager;

  beforeEach(() => {
    manager = new ActionHistoryManager('test-project');
  });

  describe('constructor', () => {
    it('should initialize with empty history', () => {
      expect(manager.getAllActions()).toHaveLength(0);
    });

    it('should accept project ID and custom configuration', () => {
      const customConfig = {
        maxSize: 50,
        enableCompression: true,
        enableMetadata: true,
        autoCleanup: true
      };
      const customManager = new ActionHistoryManager('project1', customConfig);
      
      expect(customManager.getAllActions()).toHaveLength(0);
    });
  });

  describe('addAction', () => {
    it('should add action to history', () => {
      manager.addAction('addClip', 'Test', {}, {});
      
      const actions = manager.getAllActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('addClip');
      expect(actions[0].description).toBe('Test');
    });

    it('should respect max size limit', () => {
      const smallManager = new ActionHistoryManager('test-project', { maxSize: 2 });
      
      smallManager.addAction('addClip', 'First', {}, {});
      smallManager.addAction('addClip', 'Second', {}, {});
      smallManager.addAction('addClip', 'Third', {}, {});
      
      const actions = smallManager.getAllActions();
      expect(actions).toHaveLength(2);
      expect(actions[0].description).toBe('Second');
      expect(actions[1].description).toBe('Third');
    });

    it('should maintain chronological order', () => {
      manager.addAction('addClip', 'First', {}, {});
      manager.addAction('addClip', 'Second', {}, {});
      manager.addAction('addClip', 'Third', {}, {});
      
      const actions = manager.getAllActions();
      expect(actions[0].description).toBe('First');
      expect(actions[1].description).toBe('Second');
      expect(actions[2].description).toBe('Third');
    });
  });

  describe('getAllActions', () => {
    it('should return all actions', () => {
      manager.addAction('addClip', 'First', {}, {});
      manager.addAction('addClip', 'Second', {}, {});
      
      const actions = manager.getAllActions();
      expect(actions).toHaveLength(2);
    });

    it('should return empty array when no actions', () => {
      const actions = manager.getAllActions();
      expect(actions).toHaveLength(0);
    });
  });

  describe('getActionsByType', () => {
    it('should return actions of specific type', () => {
      manager.addAction('addClip', 'Clip action', {}, {});
      manager.addAction('addLayer', 'Layer action', {}, {});
      manager.addAction('addClip', 'Another clip action', {}, {});
      
      const clipActions = manager.getActionsByType('addClip');
      expect(clipActions).toHaveLength(2);
      expect(clipActions[0].description).toBe('Clip action');
      expect(clipActions[1].description).toBe('Another clip action');
    });

    it('should return empty array for non-existent type', () => {
      const actions = manager.getActionsByType('addClip');
      expect(actions).toHaveLength(0);
    });
  });

  describe('clearHistory', () => {
    it('should clear all actions', () => {
      manager.addAction('addClip', 'Test', {}, {});
      manager.clearHistory();
      
      expect(manager.getAllActions()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      manager.addAction('addClip', 'Test', {}, {});
      
      const stats = manager.getStats();
      
      expect(stats).toMatchObject({
        totalActions: expect.any(Number),
        memoryUsage: expect.any(Number),
        oldestAction: expect.any(Date),
        newestAction: expect.any(Date),
        actionTypes: expect.any(Object)
      });
    });

    it('should return zero stats for empty history', () => {
      const stats = manager.getStats();
      
      expect(stats.totalActions).toBe(0);
      expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(stats.oldestAction).toBeNull();
      expect(stats.newestAction).toBeNull();
    });
  });
});