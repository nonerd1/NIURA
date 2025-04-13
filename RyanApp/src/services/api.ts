import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for the FastAPI backend
const API_URL = 'http://216.37.99.68:8001';  // Local development server

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication token to requests
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('AsyncStorage error in interceptor:', error);
    // Continue without authorization header if AsyncStorage fails
  }
  return config;
});

// Auth API
export const authAPI = {
  /**
   * Register a new user
   */
  register: async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  /**
   * Login user and store JWT token
   */
  login: async (email: string, password: string) => {
    try {
      console.log('Attempting login to:', API_URL);
      // Note: The OAuth2 spec requires form data for token endpoint
      const formData = new FormData();
      formData.append('username', email);  // OAuth2 uses 'username' parameter
      formData.append('password', password);
      
      const response = await api.post('/auth/token', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Login response received:', response.status);
      const { access_token } = response.data;
      
      // Store token in AsyncStorage
      try {
        await AsyncStorage.setItem('auth_token', access_token);
        console.log('Token stored successfully');
      } catch (storageError) {
        console.warn('AsyncStorage error when storing token:', storageError);
        // Continue even if we couldn't store the token
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      throw error;
    }
  },

  /**
   * Login with Google
   */
  googleLogin: async (accessToken: string) => {
    try {
      console.log('Attempting Google login to:', API_URL);
      
      const response = await api.post('/auth/google', { token: accessToken });
      
      console.log('Google login response received:', response.status);
      const { access_token } = response.data;
      
      // Store token in AsyncStorage
      try {
        await AsyncStorage.setItem('auth_token', access_token);
        console.log('Token stored successfully');
      } catch (storageError) {
        console.warn('AsyncStorage error when storing token:', storageError);
        // Continue even if we couldn't store the token
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Google login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },
  
  /**
   * Logout user
   */
  logout: async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
};

// Metrics API
interface MetricsData {
  stress: number;
  focus: number;
  mental_readiness: number;
}

export const metricsAPI = {
  /**
   * Save new metrics to the server
   */
  saveMetrics: async (metrics: MetricsData) => {
    try {
      const response = await api.post('/metrics', metrics);
      return response.data;
    } catch (error) {
      console.error('Error saving metrics:', error);
      throw error;
    }
  },
  
  /**
   * Get all metrics for the current user
   */
  getAllMetrics: async (page = 1, limit = 100) => {
    try {
      const skip = (page - 1) * limit;
      const response = await api.get(`/metrics?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  },
  
  /**
   * Get metrics for today
   */
  getTodayMetrics: async () => {
    try {
      const response = await api.get('/metrics/today');
      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s metrics:', error);
      throw error;
    }
  },
  
  /**
   * Get metrics for a date range
   */
  getMetricsRange: async (startDate: Date, endDate: Date) => {
    try {
      const response = await api.get('/metrics/range', {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics range:', error);
      throw error;
    }
  },
  
  /**
   * Get average metrics
   */
  getAverageMetrics: async (startDate?: Date, endDate?: Date) => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate.toISOString();
      if (endDate) params.end_date = endDate.toISOString();
      
      const response = await api.get('/metrics/average', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching average metrics:', error);
      throw error;
    }
  }
}; 