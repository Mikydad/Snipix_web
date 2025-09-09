/**
 * Authentication Types
 */
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

// Auth State Types
export interface AuthState {
  user: UserResponse | null;
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth Context Types
export interface AuthContextType {
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

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  username?: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileFormData {
  name: string;
  username?: string;
  avatar_url?: string;
}

// Error Types
export interface AuthError {
  message: string;
  code?: string;
  field?: string;
}

// Google OAuth Types
export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export interface GoogleAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

// Password Strength Types
export interface PasswordStrength {
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  feedback: string[];
}

// Session Types
export interface SessionInfo {
  user: UserResponse;
  expiresAt: string;
  isActive: boolean;
}

// Admin Types
export interface AdminUserStats {
  total_users: number;
  active_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
}

export interface UserAnalytics {
  user_id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  created_at: string;
  last_login?: string;
  login_count: number;
  total_session_time: number;
  project_count: number;
  total_storage_used: number;
}

export interface AdminDashboardData {
  user_stats: AdminUserStats;
  user_analytics: UserAnalytics[];
  system_health: Record<string, any>;
}
