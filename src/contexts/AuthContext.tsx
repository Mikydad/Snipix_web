/**
 * Authentication Context for React
 */
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { UserResponse, TokenResponse } from '../types/auth';

// Auth State Interface
interface AuthState {
  user: UserResponse | null;
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth Actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: UserResponse; tokens: TokenResponse } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_UPDATE_USER'; payload: UserResponse }
  | { type: 'AUTH_REFRESH_TOKENS'; payload: TokenResponse }
  | { type: 'AUTH_INIT_COMPLETE' };

// Initial State
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: {
          accessToken: action.payload.tokens.access_token,
          refreshToken: action.payload.tokens.refresh_token,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    
    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'AUTH_INIT_COMPLETE':
      return {
        ...state,
        isLoading: false,
        error: null,
      };
    
    case 'AUTH_UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    
    case 'AUTH_REFRESH_TOKENS':
      return {
        ...state,
        tokens: {
          accessToken: action.payload.access_token,
          refreshToken: action.payload.refresh_token,
        },
      };
    
    default:
      return state;
  }
};

// Auth Context Interface
interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    username?: string;
  }) => Promise<void>;
  googleLogin: (token: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateUser: (userData: Partial<UserResponse>) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<void>;
  clearError: () => void;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const isInitializedRef = React.useRef(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    // Check if already initialized
    if (isInitializedRef.current) {
      console.log('🔄 AuthContext - Already initialized, skipping');
      return;
    }
    
    console.log('🔄 AuthContext - Starting initialization');
    isInitializedRef.current = true; // Set immediately to prevent double runs
    
    const initializeAuth = async () => {
      // Add a small delay to ensure localStorage is fully available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const storedTokens = localStorage.getItem('auth_tokens');
        const storedUser = localStorage.getItem('auth_user');
        
        console.log('🔄 AuthContext - Initializing auth from localStorage');
        console.log('🔄 AuthContext - Stored tokens:', storedTokens);
        console.log('🔄 AuthContext - Stored user:', storedUser);
        console.log('🔄 AuthContext - All localStorage keys:', Object.keys(localStorage));
        console.log('🔄 AuthContext - Raw localStorage auth_tokens:', localStorage.getItem('auth_tokens'));
        
        if (storedTokens && storedUser) {
          const tokens = JSON.parse(storedTokens);
          const user = JSON.parse(storedUser);
          
          // Handle both camelCase and snake_case token formats
          const accessToken = tokens.accessToken || tokens.access_token;
          const refreshToken = tokens.refreshToken || tokens.refresh_token;
          
          // Verify tokens are still valid
          console.log('🔄 AuthContext - Verifying token:', accessToken);
          const isValid = await authService.verifyToken(accessToken);
          console.log('🔄 AuthContext - Token verification result:', isValid);
          
          if (isValid) {
            // Create a complete TokenResponse object for consistency
            const completeTokenResponse = {
              access_token: accessToken,
              refresh_token: refreshToken,
              token_type: 'Bearer',
              expires_in: 1800, // 30 minutes default
              user: user,
            };
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user, tokens: completeTokenResponse },
            });
          } else {
            // Try to refresh tokens
            console.log('🔄 AuthContext - Token invalid, trying to refresh...');
            try {
              const newTokens = await authService.refreshToken(refreshToken);
              console.log('🔄 AuthContext - Token refresh successful:', newTokens);
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, tokens: newTokens },
              });
            } catch (refreshError) {
              console.error('🔄 AuthContext - Token refresh failed:', refreshError);
              // Clear invalid tokens
              localStorage.removeItem('auth_tokens');
              localStorage.removeItem('auth_user');
              dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
            }
          }
        } else {
          console.log('🔄 AuthContext - No stored tokens or user found');
          // Set loading to false and mark as not authenticated
          dispatch({ type: 'AUTH_INIT_COMPLETE' });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to initialize authentication' });
      }
    };

    initializeAuth();
  }, []); // Empty dependency array

  // Save auth state to localStorage when it changes
  useEffect(() => {
    // Don't clear localStorage during initial loading phase
    if (state.isLoading) {
      return;
    }
    
    if (state.isAuthenticated && state.tokens && state.user) {
      // Save tokens in backend format (snake_case) for apiService compatibility
      const backendFormatTokens = {
        access_token: state.tokens.accessToken,
        refresh_token: state.tokens.refreshToken,
      };
      localStorage.setItem('auth_tokens', JSON.stringify(backendFormatTokens));
      localStorage.setItem('auth_user', JSON.stringify(state.user));
    } else if (!state.isAuthenticated) {
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
    }
  }, [state.isAuthenticated, state.tokens, state.user, state.isLoading]);

  // Auth Methods
  const login = async (email: string, password: string, rememberMe = false) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.login(email, password, rememberMe);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          tokens: response,
        },
      });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Login failed',
      });
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    username?: string;
  }) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.register({
        email: userData.email,
        password: userData.password,
        confirm_password: userData.confirmPassword,
        name: userData.name,
        username: userData.username,
      });
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          tokens: response,
        },
      });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Registration failed',
      });
      throw error;
    }
  };

  const googleLogin = async (token: string, rememberMe = false) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.googleLogin(token, rememberMe);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          tokens: response,
        },
      });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Google login failed',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (state.tokens?.accessToken) {
        await authService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const refreshTokens = async () => {
    if (!state.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const newTokens = await authService.refreshToken(state.tokens.refreshToken);
      dispatch({
        type: 'AUTH_REFRESH_TOKENS',
        payload: newTokens,
      });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Token refresh failed',
      });
      throw error;
    }
  };

  const updateUser = async (userData: Partial<UserResponse>) => {
    if (!state.tokens?.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const updatedUser = await authService.updateProfile(userData);
      dispatch({
        type: 'AUTH_UPDATE_USER',
        payload: updatedUser,
      });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Profile update failed',
      });
      throw error;
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      await authService.verifyEmail(token);
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Email verification failed',
      });
      throw error;
    }
  };

  const resendVerification = async () => {
    if (!state.tokens?.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      await authService.resendVerification();
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Failed to resend verification',
      });
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await authService.forgotPassword(email);
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Password reset request failed',
      });
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string, confirmPassword: string) => {
    try {
      await authService.resetPassword(token, newPassword, confirmPassword);
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Password reset failed',
      });
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    state,
    login,
    register,
    googleLogin,
    logout,
    refreshTokens,
    updateUser,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook to use Auth Context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
