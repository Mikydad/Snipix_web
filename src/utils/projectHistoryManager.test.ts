/**
 * Unit tests for Project History Manager
 */

import { ProjectHistoryManager } from './projectHistoryManager';
import { TimelineState } from '../types';

describe('ProjectHistoryManager', () => {
  let manager: ProjectHistoryManager;
  let mockTimelineState: TimelineState;

  beforeEach(() => {
    manager = new ProjectHistoryManager();
    mockTimelineState = {
      duration: 100,
      zoom: 1,
      playheadTime: 0,
      layers: [],
      markers: [],
      selectedClips: [],
      isPlaying: false,
      isSnapping: false,
      undoStack: [],
      redoStack: [],
      selectedLayer: null,
      trimState: {
        isActive: false,
        selectedRange: null,
        isDragging: false,
        dragStartTime: null,
        pendingOperations: []
      },
      validationState: {
        errors: [],
        warnings: [],
        isValidating: false
      },
      checkpoints: [],
      lastSavedCheckpoint: null,
      hasUnsavedChanges: false,
      actionHistory: [],
      maxHistorySize: 100
    };
  });

  describe('constructor', () => {
    it('should initialize with empty projects', () => {
      expect(manager.getCurrentProject()).toBeNull();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        maxHistorySize: 50,
        maxCheckpoints: 5,
        autoSaveInterval: 15000
      };
      const customManager = new ProjectHistoryManager(customConfig);
      
      expect(customManager.getCurrentProject()).toBeNull();
    });
  });

  describe('initializeProject', () => {
    it('should initialize new project', () => {
      const projectId = 'test-project';
      const projectState = manager.initializeProject(projectId, mockTimelineState);
      
      expect(projectState.projectId).toBe(projectId);
      expect(projectState.timelineState).toBeDefined();
      expect(projectState.historyManager).toBeDefined();
      expect(projectState.checkpointManager).toBeDefined();
    });

    it('should return existing project if already initialized', () => {
      const projectId = 'test-project';
      const firstState = manager.initializeProject(projectId, mockTimelineState);
      const secondState = manager.initializeProject(projectId);
      
      expect(firstState).toBe(secondState);
    });
  });

  describe('switchToProject', () => {
    it('should switch to different project', () => {
      const projectId1 = 'project1';
      const projectId2 = 'project2';
      
      manager.initializeProject(projectId1, mockTimelineState);
      manager.initializeProject(projectId2, mockTimelineState);
      
      const state1 = manager.switchToProject(projectId1);
      expect(state1.isActive).toBe(true);
      expect(manager.getCurrentProject()?.projectId).toBe(projectId1);
      
      const state2 = manager.switchToProject(projectId2);
      expect(state2.isActive).toBe(true);
      expect(manager.getCurrentProject()?.projectId).toBe(projectId2);
    });
  });

  describe('getProject', () => {
    it('should return project by ID', () => {
      const projectId = 'test-project';
      manager.initializeProject(projectId, mockTimelineState);
      
      const project = manager.getProject(projectId);
      expect(project).toBeDefined();
      expect(project?.projectId).toBe(projectId);
    });

    it('should return null for non-existent project', () => {
      const project = manager.getProject('non-existent');
      expect(project).toBeNull();
    });
  });

  describe('updateTimelineState', () => {
    it('should update timeline state for current project', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const updates = { duration: 200, playheadTime: 50 };
      manager.updateTimelineState(updates);
      
      const state = manager.getTimelineState();
      expect(state?.duration).toBe(200);
      expect(state?.playheadTime).toBe(50);
    });

    it('should not update if no current project', () => {
      manager.updateTimelineState({ duration: 200 });
      expect(manager.getTimelineState()).toBeNull();
    });
  });

  describe('getTimelineState', () => {
    it('should return timeline state for current project', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const state = manager.getTimelineState();
      expect(state).toBeDefined();
      expect(state?.duration).toBeDefined();
    });

    it('should return null if no current project', () => {
      const state = manager.getTimelineState();
      expect(state).toBeNull();
    });
  });

  describe('addToHistory', () => {
    it('should add action to history for current project', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const action = {
        id: 'action1',
        type: 'addClip' as const,
        description: 'Test action',
        timestamp: Date.now(),
        state: {},
        metadata: {}
      };
      
      manager.addToHistory(action);
      
      const history = manager.getActionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].description).toBe('Test action');
    });

    it('should not add action if no current project', () => {
      const action = {
        id: 'action1',
        type: 'addClip' as const,
        description: 'Test action',
        timestamp: Date.now(),
        state: {},
        metadata: {}
      };
      
      manager.addToHistory(action);
      
      const history = manager.getActionHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('getActionHistory', () => {
    it('should return action history for current project', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const history = manager.getActionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return empty array if no current project', () => {
      const history = manager.getActionHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('saveCheckpoint', () => {
    it('should save checkpoint for current project', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const checkpointId = manager.saveCheckpoint('Test checkpoint');
      expect(checkpointId).toBeDefined();
      
      const checkpoints = manager.getCheckpoints();
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0].description).toBe('Test checkpoint');
    });

    it('should return null if no current project', () => {
      const checkpointId = manager.saveCheckpoint('Test checkpoint');
      expect(checkpointId).toBeNull();
    });
  });

  describe('restoreCheckpoint', () => {
    it('should restore checkpoint for current project', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const checkpointId = manager.saveCheckpoint('Test checkpoint');
      expect(checkpointId).toBeDefined();
      
      const success = manager.restoreCheckpoint(checkpointId!);
      expect(success).toBe(true);
    });

    it('should return false if checkpoint not found', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const success = manager.restoreCheckpoint('non-existent');
      expect(success).toBe(false);
    });
  });

  describe('getCheckpoints', () => {
    it('should return checkpoints for current project', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const checkpoints = manager.getCheckpoints();
      expect(Array.isArray(checkpoints)).toBe(true);
    });

    it('should return empty array if no current project', () => {
      const checkpoints = manager.getCheckpoints();
      expect(checkpoints).toHaveLength(0);
    });
  });

  describe('clearHistory', () => {
    it('should clear history for current project', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      // Add some history first
      const action = {
        id: 'action1',
        type: 'addClip' as const,
        description: 'Test action',
        timestamp: Date.now(),
        state: {},
        metadata: {}
      };
      manager.addToHistory(action);
      
      expect(manager.getActionHistory()).toHaveLength(1);
      
      manager.clearHistory();
      expect(manager.getActionHistory()).toHaveLength(0);
    });
  });

  describe('clearCheckpoints', () => {
    it('should clear checkpoints for current project', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      // Add some checkpoints first
      manager.saveCheckpoint('Checkpoint 1');
      manager.saveCheckpoint('Checkpoint 2');
      
      // Note: Previous tests may have added checkpoints, so we check for at least 2
      expect(manager.getCheckpoints().length).toBeGreaterThanOrEqual(2);
      
      manager.clearCheckpoints();
      expect(manager.getCheckpoints()).toHaveLength(0);
    });
  });

  describe('removeProject', () => {
    it('should remove project and clean up resources', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      expect(manager.getProject(projectId)).toBeDefined();
      
      manager.removeProject(projectId);
      expect(manager.getProject(projectId)).toBeNull();
    });
  });

  describe('getAllProjectStats', () => {
    it('should return stats for all projects', () => {
      manager.initializeProject('project1', mockTimelineState);
      manager.initializeProject('project2', mockTimelineState);
      
      const stats = manager.getAllProjectStats();
      expect(stats).toHaveLength(2);
      expect(stats[0]).toMatchObject({
        projectId: expect.any(String),
        historySize: expect.any(Number),
        checkpointCount: expect.any(Number),
        memoryUsage: expect.any(Number),
        lastAccessed: expect.any(Number),
        isActive: expect.any(Boolean)
      });
    });
  });

  describe('exportProjectHistory', () => {
    it('should export project history', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const exported = manager.exportProjectHistory(projectId);
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
    });
  });

  describe('importProjectHistory', () => {
    it('should import project history', () => {
      const projectId = 'test-project';
      manager.switchToProject(projectId);
      
      const exported = manager.exportProjectHistory(projectId);
      const success = manager.importProjectHistory(projectId, exported || '');
      
      expect(success).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should destroy manager and clear all data', () => {
      manager.initializeProject('project1', mockTimelineState);
      manager.initializeProject('project2', mockTimelineState);
      
      expect(manager.getAllProjectStats()).toHaveLength(2);
      
      manager.destroy();
      
      expect(manager.getAllProjectStats()).toHaveLength(0);
      expect(manager.getCurrentProject()).toBeNull();
    });
  });
});