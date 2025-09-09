import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8001',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        // Get auth tokens from localStorage (same as authService)
        const tokens = localStorage.getItem('auth_tokens');
        console.log('🔑 API Service - Tokens from localStorage:', tokens);
        
        if (tokens) {
          try {
            const parsedTokens = JSON.parse(tokens);
            const accessToken = parsedTokens.access_token || parsedTokens.accessToken;
            console.log('🔑 API Service - Access token:', accessToken ? 'EXISTS' : 'MISSING');
            
            if (accessToken) {
              config.headers.Authorization = `Bearer ${accessToken}`;
              console.log('🔑 API Service - Authorization header added:', `Bearer ${accessToken.substring(0, 20)}...`);
            }
          } catch (error) {
            console.error('🔑 API Service - Error parsing tokens:', error);
            // Clear invalid tokens
            localStorage.removeItem('auth_tokens');
            localStorage.removeItem('auth_user');
          }
        } else {
          console.log('🔑 API Service - No tokens found in localStorage');
        }
        
        console.log('🔑 API Service - Request headers:', config.headers);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle both 401 and 403 errors (both indicate authentication issues)
        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const tokens = localStorage.getItem('auth_tokens');
            console.log('🔄 Token refresh attempt - tokens from localStorage:', tokens);
            
            if (tokens) {
              try {
                const parsedTokens = JSON.parse(tokens);
                const refreshToken = parsedTokens.refresh_token || parsedTokens.refreshToken;
                
                console.log('🔄 Refresh token found:', refreshToken ? 'EXISTS' : 'MISSING');
                
                if (refreshToken) {
                  // Import authService to use refreshToken method
                  const { authService } = await import('./authService');
                  console.log('🔄 Calling authService.refreshToken...');
                  
                  const newTokens = await authService.refreshToken(refreshToken);
                  console.log('🔄 New tokens received:', newTokens);
                  
                  const accessToken = newTokens.access_token;
                  
                  // Store the new tokens in localStorage
                  localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
                  console.log('🔄 New tokens stored in localStorage');
                  
                  originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                  console.log('🔄 Retrying original request with new token');
                  
                  return this.api(originalRequest);
                }
              } catch (parseError) {
                console.error('🔄 Error parsing tokens:', parseError);
                // Clear invalid tokens
                localStorage.removeItem('auth_tokens');
                localStorage.removeItem('auth_user');
              }
            }
          } catch (refreshError) {
            console.error('🔄 Token refresh failed:', refreshError);
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
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.put<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.delete<T>(url, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.patch<T>(url, data, config);
  }

  // Upload file with progress tracking
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.api.post<T>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.api.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Set auth token
  setAuthToken(token: string): void {
    // Store token in the same format as authService
    const tokens = { access_token: token };
    localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    this.api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  // Remove auth token
  removeAuthToken(): void {
    localStorage.removeItem('auth_tokens');
    delete this.api.defaults.headers.common.Authorization;
  }

  // Trim video based on timeline segments
  async trimVideo(projectId: string, segments: Array<{ startTime: number; duration: number }>): Promise<AxiosResponse<any>> {
    return this.api.post('/media/trim-video', {
      project_id: projectId,
      segments: segments
    });
  }
}

export const apiService = new ApiService();

