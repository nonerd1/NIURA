import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '../config/amplify';

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: apiConfig.headers,
    });

    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        console.log('🔑 Auth token from storage:', token ? `${token.substring(0, 20)}...` : 'null');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 Authorization header set:', config.headers.Authorization ? 'YES' : 'NO');
          
          // Enhanced token logging - show full details
          console.log('🔑 FULL JWT TOKEN:', token);
          
          // Decode and show JWT payload
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('🔑 Token payload:', JSON.stringify(payload, null, 2));
            console.log('🔑 Token expires:', new Date(payload.exp * 1000).toLocaleString());
            console.log('🔑 Token issued for user ID:', payload.sub);
            console.log('🔑 Token issued at:', new Date(payload.iat * 1000).toLocaleString());
          } catch (decodeError) {
            console.log('⚠️ Could not decode JWT token payload');
          }
        } else {
          console.log('⚠️ No auth token found in storage');
        }
        console.log('📡 Making request to:', config.url);
        console.log('📡 Request method:', config.method);
        console.log('📡 Request headers:', JSON.stringify(config.headers, null, 2));
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear stored auth data
          await AsyncStorage.multiRemove(['authToken', 'user']);
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get(url, config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post(url, data, config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put(url, data, config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete(url, config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    console.log('🚨 Full error object in handleError:', JSON.stringify(error, null, 2));
    console.log('🚨 Error properties:', {
      message: error.message,
      code: error.code,
      config: error.config ? 'present' : 'missing',
      request: error.request ? 'present' : 'missing',
      response: error.response ? 'present' : 'missing'
    });
    
    if (error.response) {
      // Server responded with error status
      console.log('🚨 Server response error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
      
      const data = error.response.data;
      
      // Handle FastAPI validation errors (array of error objects)
      if (data?.detail && Array.isArray(data.detail)) {
        const validationErrors = data.detail.map((err: any) => 
          `${err.loc?.join('.')} - ${err.msg}`
        ).join('; ');
        return new Error(`Validation error: ${validationErrors}`);
      }
      
      // Handle string detail messages
      if (data?.detail && typeof data.detail === 'string') {
        return new Error(data.detail);
      }
      
      // Handle other error formats
      const message = data?.message || data?.error || 'An error occurred';
      return new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      console.log('🚨 Network error - no response received:', {
        request: error.request,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      });
      return new Error(`Network error: ${error.code || 'Connection failed'}. Please check your connection.`);
    } else {
      // Something else happened in setting up the request
      console.log('🚨 Request setup error:', error.message);
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  // Helper method to build URL with parameters
  buildUrl(endpoint: string, params?: Record<string, string | number>): string {
    let url = endpoint;
    if (params) {
      Object.keys(params).forEach(key => {
        url = url.replace(`{${key}}`, String(params[key]));
      });
    }
    return url;
  }
}

export const apiClient = new ApiClient(); 