// Project related types
export interface Project {
  _id: string;  // Changed from 'id' to '_id' to match backend
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  duration?: number;
  timelineState?: TimelineState;
  transcriptState?: TranscriptState;
}

// Upload related types
export interface UploadState {
  file: File | null;
  progress: number;
  isUploading: boolean;
  error: string | null;
}

// Transcript related types
export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  isFiller?: boolean;
}

export interface TranscriptState {
  words: TranscriptWord[];
  isTranscribing: boolean;
  error: string | null;
  selectedWords: string[];
}

// Timeline related types
export interface Clip {
  id: string;
  type: 'video' | 'audio' | 'text' | 'effect' | 'overlay';
  startTime: number; // Timeline position
  endTime: number;
  duration: number;
  originalStartTime?: number; // Original video time (for video clips)
  sourcePath?: string;
  content?: string;
  properties: {
    opacity?: number;
    scale?: number;
    position?: { x: number; y: number };
    rotation?: number;
    [key: string]: any;
  };
  keyframes: Keyframe[];
}

export interface Layer {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'effect' | 'overlay';
  clips: Clip[];
  isVisible: boolean;
  isLocked: boolean;
  isMuted: boolean;
  order: number;
  segments?: LayerSegment[]; // Internal segments for trim operations
  isMainVideo?: boolean; // Flag to identify the main video layer
}

export interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: any;
  easing?: string;
}

export interface Marker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface TimelineState {
  layers: Layer[];
  playheadTime: number;
  zoom: number;
  duration: number;
  markers: Marker[];
  selectedClips: string[];
  isPlaying: boolean;
  isSnapping: boolean;
  undoStack: TimelineState[];
  redoStack: TimelineState[];
  selectedLayer: string | null; // Currently selected layer for editing
  trimState: TrimState; // Current trim operation state
  validationState: ValidationState; // Validation and error state
}

// Validation and error state
export interface ValidationState {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isValidating: boolean;
}

export interface ValidationError {
  id: string;
  type: 'deletion' | 'trim' | 'boundary' | 'duration';
  message: string;
  layerId?: string;
  clipId?: string;
  timestamp: number;
}

export interface ValidationWarning {
  id: string;
  type: 'performance' | 'quality' | 'compatibility';
  message: string;
  layerId?: string;
  clipId?: string;
  timestamp: number;
}

// Trim and Delete operation types
export interface LayerSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  isDeleted?: boolean; // Mark segments for deletion
  originalStartTime?: number; // Track original position for gap filling
}

export interface TrimRange {
  startTime: number;
  endTime: number;
  layerId: string;
  isValid: boolean;
}

export interface TrimState {
  isActive: boolean; // Whether trim mode is active
  selectedRange: TrimRange | null; // Currently selected range
  isDragging: boolean; // Whether user is dragging to select range
  dragStartTime: number | null; // Start time of drag operation
  pendingOperations: TrimOperation[]; // Operations waiting to be applied
}

export interface TrimOperation {
  id: string;
  type: 'trim' | 'delete' | 'split';
  layerId: string;
  startTime: number;
  endTime: number;
  segments: LayerSegment[]; // Affected segments
  timestamp: number; // When operation was created
}

export interface DeleteOperation {
  layerId: string;
  segmentIds: string[];
  fillGaps: boolean; // Whether to fill gaps (main video only)
}

// Auth related types
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  projectId: string;
  filePath: string;
  duration: number;
}

export interface TranscribeResponse {
  transcript: TranscriptWord[];
  duration: number;
}

export interface RemoveFillersResponse {
  processedVideoPath: string;
  removedSegments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface TrimDeleteResponse {
  success: boolean;
  processedVideoPath: string;
  newDuration: number;
  operations: TrimOperation[];
  message: string;
}

// Component prop types
export interface TimelineProps {
  projectId: string;
}

export interface TranscriptEditorProps {
  projectId: string;
  onComplete: () => void;
}

export interface UploadProps {
  onUploadComplete: (projectId: string) => void;
}

// Gesture types
export interface GestureState {
  delta: [number, number];
  movement: [number, number];
  velocity: [number, number];
  direction: [number, number];
  distance: number;
  elapsed: number;
  first: boolean;
  last: boolean;
  active: boolean;
  timeStamp: number;
  event: Event;
}

