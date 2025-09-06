# Task List: Trim and Delete Functionality

## Relevant Files

- `src/redux/slices/timelineSlice.ts` - Extend Redux state management for trim/delete operations, layer selection, and segment management
- `src/types/index.ts` - Add new interfaces for trim operations, layer segments, and editing state
- `src/components/TimelineToolbar.tsx` - Add trim/delete buttons that appear when layer is selected (COMPLETED)
- `src/components/TimelineEditor.tsx` - Implement layer selection, range selection, and visual feedback
- `src/components/TimelineTrack.tsx` - Add layer selection handling and trim range visualization
- `src/components/VideoPreview.tsx` - Integrate trim preview display during range selection
- `src/pages/TimelinePage.tsx` - Add "Done" button and handle backend processing integration
- `backend/api/media.py` - Add new endpoint for processing trim/delete operations
- `backend/services/media_service.py` - Implement FFmpeg-based video trimming functionality
- `src/components/TrimRangeSelector.tsx` - New component for visual range selection on timeline
- `src/components/LayerHandle.tsx` - New component for draggable handles on layer edges
- `src/components/ErrorToast.tsx` - New component for displaying error messages
- `src/utils/timelineUtils.ts` - Utility functions for timeline calculations and segment management
- `src/utils/timelineUtils.test.ts` - Unit tests for timeline utility functions
- `src/components/TimelineToolbar.test.tsx` - Unit tests for TimelineToolbar component
- `src/components/TrimRangeSelector.test.tsx` - Unit tests for TrimRangeSelector component

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Extend Redux State Management for Trim/Delete Operations
  - [x] 1.1 Add new interfaces to types/index.ts for trim operations and layer segments
  - [x] 1.2 Extend TimelineState interface with selectedLayer and trimState properties
  - [x] 1.3 Add Redux actions for layer selection (selectLayer, clearLayerSelection)
  - [x] 1.4 Add Redux actions for trim operations (setTrimRange, clearTrimRange)
  - [x] 1.5 Add Redux actions for delete operations (deleteSegment, applyTrimOperations)
  - [x] 1.6 Add Redux actions for segment management (splitSegment, mergeSegments)
- [ ] 2.0 Implement Layer Selection and Visual Feedback
  - [x] 2.1 Add layer selection handling to TimelineTrack component
  - [ ] 2.2 Implement visual highlighting for selected layers
  - [x] 2.3 Add click handlers for layer selection in timeline
  - [x] 2.4 Update TimelineEditor to handle layer selection state
- [ ] 3.0 Create Trim Range Selection Components
  - [x] 3.1 Create TrimRangeSelector component for visual range selection
  - [ ] 3.2 Implement click and drag functionality for range selection
  - [ ] 3.3 Create LayerHandle component for edge handle dragging
  - [ ] 3.4 Add range validation and boundary checking
  - [ ] 3.5 Integrate range selector with TimelineEditor
- [ ] 4.0 Implement Delete Functionality with Gap Filling
  - [ ] 4.1 Implement segment deletion logic with gap filling for main video
  - [ ] 4.2 Add validation to prevent deletion of entire main video
  - [ ] 4.3 Update timeline duration calculations after deletions
  - [ ] 4.4 Implement segment merging for continuous playback
- [ ] 5.0 Add Timeline Toolbar Integration
  - [ ] 5.1 Add trim/delete buttons to TimelineToolbar that appear on layer selection
  - [ ] 5.2 Implement button state management (enabled/disabled based on selection)
  - [ ] 5.3 Add "Done" button for applying all changes
  - [ ] 5.4 Connect toolbar buttons to Redux actions
- [ ] 6.0 Integrate Video Preview with Trim Operations
  - [ ] 6.1 Add trim preview display to VideoPreview component
  - [ ] 6.2 Implement real-time preview updates during range selection
  - [ ] 6.3 Sync video preview with timeline trim operations
  - [ ] 6.4 Update video duration display after trimming
- [ ] 7.0 Implement Backend Video Processing
  - [ ] 7.1 Add trim/delete endpoint to backend API
  - [ ] 7.2 Implement FFmpeg-based video trimming in media service
  - [ ] 7.3 Add batch processing for multiple trim operations
  - [ ] 7.4 Implement progress tracking for video processing
- [ ] 8.0 Add Error Handling and Validation
  - [ ] 8.1 Create ErrorToast component for user feedback
  - [ ] 8.2 Add validation for trim operations (boundaries, duration)
  - [ ] 8.3 Implement error handling for failed operations
  - [ ] 8.4 Add loading states for backend processing
- [ ] 9.0 Create Utility Functions and Helpers
  - [ ] 9.1 Create timelineUtils.ts with segment calculation functions
  - [ ] 9.2 Implement time-to-pixels and pixels-to-time conversions
  - [ ] 9.3 Add segment validation and boundary checking utilities
  - [ ] 9.4 Create gap filling and merging logic utilities
- [ ] 10.0 Add Comprehensive Testing
  - [ ] 10.1 Add unit tests for timeline utility functions
  - [ ] 10.2 Add unit tests for TimelineToolbar component
  - [ ] 10.3 Add unit tests for TrimRangeSelector component
  - [ ] 10.4 Add integration tests for trim/delete workflow
