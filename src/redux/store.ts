import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import projectReducer from './slices/projectSlice';
import uploadReducer from './slices/uploadSlice';
import transcriptReducer from './slices/transcriptSlice';
import timelineReducer from './slices/timelineSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    projects: projectReducer,
    upload: uploadReducer,
    transcript: transcriptReducer,
    timeline: timelineReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'upload/setFile'],
        ignoredPaths: ['upload.file'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

