// This file is kept as a placeholder for future authentication configuration
// The AWS Amplify configuration has been removed as it's no longer needed

import { Platform } from 'react-native';

// Function to determine the correct base URL based on environment
const getBaseURL = (): string => {
  // For iOS Simulator, use localhost
  if (Platform.OS === 'ios' && __DEV__) {
    // Check if we're in iOS Simulator by trying to detect simulator-specific characteristics
    // In iOS Simulator, we need to use localhost instead of the network IP
    return 'http://localhost:8000/api';
  }
  
  // For physical devices or Android, use the network IP
  return 'http://192.168.86.42:8000/api';
};

// API Configuration for NIURA Backend
export const apiConfig = {
  // Base URL for your backend API - automatically detects environment
  baseURL: getBaseURL(),
  
  // API endpoints (matching your backend exactly)
  endpoints: {
    // Authentication endpoints
    register: '/register',
    login: '/login',
    logout: '/logout',
    
    // Password management endpoints
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    
    // User management endpoints  
    deleteUser: '/users/{id}',
    updateUser: '/users/{id}',
    getUserProfile: '/users/profile',
    
    // EEG-related endpoints
    getCurrentGoals: '/eeg/current-goals',
    getRecommendations: '/eeg/recommendations',
    getMusicSuggestion: '/eeg/music-suggestion',
    getBestFocusTime: '/eeg/best-focus-time',
    bulkEegUpload: '/eeg/bulk',
    eegAggregate: '/eeg/aggregate',
    getLatestEEG: '/eeg/latest',
    sessionLabels: '/eeg/session-labels',
    
    // Session management endpoints
    createSession: '/sessions/create',
    sessionHistory: '/sessions/history',
    
    // Event management endpoints (Calendar)
    createEvent: '/events',
    updateEvent: '/events/{id}',
    deleteEvent: '/events/{id}',
    getEvents: '/events',
    
    // Task management endpoints (DeepWork Sessions)
    createTask: '/tasks',
    updateTask: '/tasks/{id}',
    deleteTask: '/tasks/{id}',
    getTasks: '/tasks',
    
    // Add other endpoints as needed
  },
  
  // Request timeout in milliseconds
  timeout: 10000,
  
  // Default headers
  headers: {
    'Content-Type': 'application/json',
  },
};

export const authConfig = {
  // Add any future auth configuration here
}; 