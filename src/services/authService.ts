/**
 * Authentication Service for API calls
 */
import axios, { AxiosResponse } from 'axios';

// Types
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  auth_provider: 'email' | 'google';
  is_email_verified: boolean;
  last_login?: string;
  login_count: number;
  total_session_time: number;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirm_password: string;
  name: string;
  username?: string;
}

export interface GoogleAuthRequest {
  token: string;
  remember_me: boolean;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
  confirm_password: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface UserUpdate {
  name?: string;
  username?: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

// Create axios instance
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('auth_tokens');
    if (tokens) {
      const { access_token } = JSON.parse(tokens);
      if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = localStorage.getItem('auth_tokens');
        if (tokens) {
          const { refresh_token } = JSON.parse(tokens);
          if (refresh_token) {
            // Call refreshToken method directly
            const response: AxiosResponse<ApiResponse<TokenResponse>> = await apiClient.post('/refresh', {
              refresh_token: refresh_token,
            });

            if (response.data.success) {
              const newTokens = response.data.data;
              const { access_token } = newTokens;
              
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return apiClient(originalRequest);
            }
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth Service Class
class AuthService {
  // Login with email and password
  async login(email: string, password: string, rememberMe = false): Promise<TokenResponse> {
    try {
      const response: AxiosResponse<ApiResponse<TokenResponse>> = await apiClient.post('/login', {
        email,
        password,
        remember_me: rememberMe,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      // Check for specific error message in details.message first, then error field
      if (error.response?.data?.details?.message) {
        throw new Error(error.response.data.details.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Login failed. Please try again.');
    }
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<TokenResponse> {
    try {
      const response: AxiosResponse<ApiResponse<TokenResponse>> = await apiClient.post('/register', userData);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      // Check for specific error message in details.message first, then error field
      if (error.response?.data?.details?.message) {
        throw new Error(error.response.data.details.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Registration failed. Please try again.');
    }
  }

  // Google OAuth login
  async googleLogin(token: string, rememberMe = false): Promise<TokenResponse> {
    try {
      const response: AxiosResponse<ApiResponse<TokenResponse>> = await apiClient.post('/google', {
        token,
        remember_me: rememberMe,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Google login failed');
      }
    } catch (error: any) {
      // Check for specific error message in details.message first, then error field
      if (error.response?.data?.details?.message) {
        throw new Error(error.response.data.details.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Google login failed. Please try again.');
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response: AxiosResponse<ApiResponse<TokenResponse>> = await apiClient.post('/refresh', {
        refresh_token: refreshToken,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Token refresh failed');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Token refresh failed');
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await apiClient.post('/logout');
    } catch (error) {
      // Even if logout fails on server, we should clear local storage
      console.error('Logout error:', error);
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<UserResponse> {
    try {
      const response: AxiosResponse<ApiResponse<UserResponse>> = await apiClient.get('/me');

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get user profile');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to get user profile');
    }
  }

  // Update user profile
  async updateProfile(userData: UserUpdate): Promise<UserResponse> {
    try {
      const response: AxiosResponse<ApiResponse<UserResponse>> = await apiClient.put('/me', userData);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Profile update failed');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Profile update failed');
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post('/verify-email', {
        token,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Email verification failed');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Email verification failed');
    }
  }

  // Resend verification email
  async resendVerification(): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post('/resend-verification');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to resend verification');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to resend verification');
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post('/forgot-password', {
        email,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Password reset request failed');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Password reset request failed');
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post('/reset-password', {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Password reset failed');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Password reset failed');
    }
  }

  // Verify token validity
  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await apiClient.get('/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Get Google OAuth URL
  getGoogleAuthUrl(): string {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'openid email profile';
    
    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      scope,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
