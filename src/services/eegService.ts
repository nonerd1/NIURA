import { apiClient } from './apiClient';
import { apiConfig } from '../config/amplify';

// EEG Data Types
export interface Goal {
  id: string | number;
  title: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  progress?: number;
  status?: 'active' | 'completed' | 'paused';
  created_at?: string;
  updated_at?: string;
}

export interface Recommendation {
  id: string | number;
  title: string;
  description: string;
  type: 'focus' | 'stress' | 'general';
  priority: 'high' | 'medium' | 'low';
  action_items?: string[];
  created_at?: string;
}

export interface MusicSuggestion {
  id: string | number;
  title: string;
  artist?: string;
  genre?: string;
  mood?: string;
  duration?: number; // in seconds
  spotify_url?: string;
  youtube_url?: string;
  preview_url?: string;
  recommended_for?: 'focus' | 'relaxation' | 'energy';
}

export interface FocusTimeData {
  best_time_start: string; // e.g., "09:00"
  best_time_end: string;   // e.g., "11:00"
  focus_score: number;     // 0-100
  confidence: number;      // 0-100
  day_of_week?: string;
  historical_data?: {
    time: string;
    score: number;
  }[];
}

// Bulk EEG Upload Types
export interface EEGReading {
  timestamp: string;        // ISO string format
  focus_value: number;      // 0-3 scale
  stress_value: number;     // 0-3 scale
  session_id?: string;      // Optional session identifier
  device_id?: string;       // Optional device identifier
  quality_score?: number;   // Optional signal quality (0-100)
}

export interface BulkEEGUploadRequest {
  readings: EEGReading[];
  session_metadata?: {
    session_id: string;
    start_time: string;
    end_time: string;
    session_type: 'focus' | 'meditation' | 'general';
    duration_seconds: number;
  };
  device_info?: {
    device_id: string;
    device_type: string;
    firmware_version?: string;
  };
}

export interface BulkEEGUploadResponse {
  success: boolean;
  message: string;
  uploaded_count: number;
  failed_count?: number;
  session_id?: string;
  errors?: string[];
}

// EEG Aggregate Types
export interface EEGAggregateDataPoint {
  timestamp: string;        // ISO string or time label
  focus_avg: number;        // Average focus (0-3)
  stress_avg: number;       // Average stress (0-3)
  focus_max?: number;       // Max focus in period
  stress_max?: number;      // Max stress in period
  focus_min?: number;       // Min focus in period
  stress_min?: number;      // Min stress in period
  sample_count?: number;    // Number of readings in this period
  quality_avg?: number;     // Average signal quality
}

export interface EEGAggregateResponse {
  range: 'hourly' | 'daily' | 'weekly' | 'monthly';
  data: EEGAggregateDataPoint[];
  total_samples: number;
  start_date: string;
  end_date: string;
  timezone?: string;
}

export type AggregateRange = 'hourly' | 'daily' | 'weekly' | 'monthly';

// Latest EEG Types
export interface LatestEEGData {
  focus_value: number;      // Most recent focus value (0-3)
  stress_value: number;     // Most recent stress value (0-3)
  timestamp: string;        // When this reading was taken
  session_id?: string;      // Session this reading belongs to
  quality_score?: number;   // Signal quality (0-100)
  minutes_ago?: number;     // How many minutes ago this was recorded
  device_id?: string;       // Device that recorded this
  session_type?: 'focus' | 'meditation' | 'general';
}

export interface LatestEEGResponse {
  success: boolean;
  data: LatestEEGData;
  message?: string;
}

// Backend response interfaces
interface EEGApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

class EEGService {
  
  // Get Current Goals - GET /api/eeg/current-goals
  async getCurrentGoals(): Promise<Goal[]> {
    try {
      console.log('Fetching current goals...');
      
      const response = await apiClient.get<EEGApiResponse<Goal[]> | Goal[]>(
        apiConfig.endpoints.getCurrentGoals
      );
      
      // Handle different response formats
      const goals = Array.isArray(response.data) 
        ? response.data 
        : (response.data as EEGApiResponse<Goal[]>).data;
      
      console.log('Current goals fetched successfully:', goals);
      return goals || [];
    } catch (error: any) {
      console.error('Error fetching current goals:', error);
      throw new Error(error.message || 'Failed to fetch current goals');
    }
  }

  // Get Recommendations - GET /api/eeg/recommendations
  async getRecommendations(): Promise<Recommendation[]> {
    try {
      console.log('Fetching recommendations...');
      
      const response = await apiClient.get<EEGApiResponse<Recommendation[]> | Recommendation[]>(
        apiConfig.endpoints.getRecommendations
      );
      
      // Handle different response formats
      const recommendations = Array.isArray(response.data) 
        ? response.data 
        : (response.data as EEGApiResponse<Recommendation[]>).data;
      
      console.log('Recommendations fetched successfully:', recommendations);
      return recommendations || [];
    } catch (error: any) {
      console.error('Error fetching recommendations:', error);
      throw new Error(error.message || 'Failed to fetch recommendations');
    }
  }

  // Get Music Suggestion - GET /api/eeg/music-suggestion
  async getMusicSuggestion(): Promise<MusicSuggestion[]> {
    try {
      console.log('Fetching music suggestions...');
      
      const response = await apiClient.get<EEGApiResponse<MusicSuggestion[]> | MusicSuggestion[]>(
        apiConfig.endpoints.getMusicSuggestion
      );
      
      // Handle different response formats
      const suggestions = Array.isArray(response.data) 
        ? response.data 
        : (response.data as EEGApiResponse<MusicSuggestion[]>).data;
      
      console.log('Music suggestions fetched successfully:', suggestions);
      return suggestions || [];
    } catch (error: any) {
      console.error('Error fetching music suggestions:', error);
      throw new Error(error.message || 'Failed to fetch music suggestions');
    }
  }

  // Get Best Focus Time - GET /api/eeg/best-focus-time
  async getBestFocusTime(): Promise<FocusTimeData> {
    try {
      console.log('Fetching best focus time...');
      
      const response = await apiClient.get<EEGApiResponse<FocusTimeData> | FocusTimeData>(
        apiConfig.endpoints.getBestFocusTime
      );
      
      // Handle different response formats
      const focusTimeData = 'best_time_start' in response.data 
        ? response.data as FocusTimeData
        : (response.data as EEGApiResponse<FocusTimeData>).data;
      
      console.log('Best focus time fetched successfully:', focusTimeData);
      return focusTimeData;
    } catch (error: any) {
      console.error('Error fetching best focus time:', error);
      throw new Error(error.message || 'Failed to fetch best focus time');
    }
  }

  // Get EEG Aggregate Data - GET /api/eeg/aggregate?range={range}
  async getEEGAggregate(range: AggregateRange = 'hourly'): Promise<EEGAggregateResponse> {
    try {
      console.log('Fetching EEG aggregate data for range:', range);
      
      const response = await apiClient.get<EEGAggregateResponse>(
        `${apiConfig.endpoints.eegAggregate}?range=${range}`
      );
      
      console.log('EEG aggregate data fetched successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching EEG aggregate data:', error);
      throw new Error(error.message || 'Failed to fetch EEG aggregate data');
    }
  }

  // Get Latest EEG Data - GET /api/eeg/latest
  async getLatestEEG(): Promise<LatestEEGData> {
    try {
      console.log('Fetching latest EEG data...');
      
      const response = await apiClient.get<LatestEEGResponse | LatestEEGData>(
        apiConfig.endpoints.getLatestEEG
      );
      
      // Handle different response formats
      const latestData = 'focus_value' in response.data 
        ? response.data as LatestEEGData
        : (response.data as LatestEEGResponse).data;
      
      console.log('Latest EEG data fetched successfully:', latestData);
      return latestData;
    } catch (error: any) {
      console.error('Error fetching latest EEG data:', error);
      throw new Error(error.message || 'Failed to fetch latest EEG data');
    }
  }

  // Bulk EEG Upload - POST /api/eeg/bulk
  async uploadBulkEEGData(uploadData: BulkEEGUploadRequest): Promise<BulkEEGUploadResponse> {
    try {
      console.log('Uploading bulk EEG data...', {
        readingsCount: uploadData.readings.length,
        sessionId: uploadData.session_metadata?.session_id
      });
      
      const response = await apiClient.post<BulkEEGUploadResponse>(
        apiConfig.endpoints.bulkEegUpload,
        uploadData
      );
      
      console.log('Bulk EEG data uploaded successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error uploading bulk EEG data:', error);
      throw new Error(error.message || 'Failed to upload EEG data');
    }
  }

  // Helper method to format aggregate data for charts
  formatAggregateForChart(aggregateData: EEGAggregateResponse) {
    const labels = aggregateData.data.map(point => {
      const date = new Date(point.timestamp);
      
      switch (aggregateData.range) {
        case 'hourly':
          return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            hour12: true 
          });
        case 'daily':
          return date.toLocaleDateString('en-US', { 
            weekday: 'short' 
          });
        case 'weekly':
          return `Week ${Math.ceil(date.getDate() / 7)}`;
        case 'monthly':
          return date.toLocaleDateString('en-US', { 
            month: 'short' 
          });
        default:
          return point.timestamp;
      }
    });

    const focusData = aggregateData.data.map(point => point.focus_avg);
    const stressData = aggregateData.data.map(point => point.stress_avg);

    return {
      labels,
      focusData,
      stressData,
      range: aggregateData.range,
      totalSamples: aggregateData.total_samples
    };
  }

  // Helper method to format latest EEG data for display
  formatLatestEEGForDisplay(latestData: LatestEEGData) {
    const timestamp = new Date(latestData.timestamp);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    let timeAgoText = 'Just now';
    if (minutesAgo > 0) {
      if (minutesAgo < 60) {
        timeAgoText = `${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago`;
      } else {
        const hoursAgo = Math.floor(minutesAgo / 60);
        timeAgoText = `${hoursAgo} hour${hoursAgo === 1 ? '' : 's'} ago`;
      }
    }

    return {
      focusValue: latestData.focus_value,
      stressValue: latestData.stress_value,
      timeAgoText,
      sessionType: latestData.session_type || 'general',
      qualityScore: latestData.quality_score || 0,
      isRecent: minutesAgo < 30 // Consider data recent if less than 30 minutes old
    };
  }

  // Helper method to check if we should use latest EEG data as fallback
  async getEEGDataWithFallback(currentFocus?: number, currentStress?: number) {
    // If we have current real-time data, use it
    if (currentFocus !== undefined && currentStress !== undefined) {
      return {
        focusValue: currentFocus,
        stressValue: currentStress,
        isLive: true,
        source: 'earbuds'
      };
    }

    // Otherwise, try to get latest data from backend
    try {
      const latestData = await this.getLatestEEG();
      const formatted = this.formatLatestEEGForDisplay(latestData);
      
      return {
        focusValue: formatted.focusValue,
        stressValue: formatted.stressValue,
        isLive: false,
        source: 'backend',
        timeAgo: formatted.timeAgoText,
        isRecent: formatted.isRecent
      };
    } catch (error) {
      // Final fallback to default values
      return {
        focusValue: 1.5,
        stressValue: 1.5,
        isLive: false,
        source: 'default',
        timeAgo: 'No data available'
      };
    }
  }

  // Helper method to create EEG reading from current values
  createEEGReading(focusValue: number, stressValue: number, sessionId?: string): EEGReading {
    return {
      timestamp: new Date().toISOString(),
      focus_value: Math.max(0, Math.min(3, focusValue)), // Clamp between 0-3
      stress_value: Math.max(0, Math.min(3, stressValue)), // Clamp between 0-3
      session_id: sessionId,
      quality_score: 85 // Mock quality score, replace with real data
    };
  }

  // Helper method to batch upload readings from a session
  async uploadSessionData(
    readings: EEGReading[],
    sessionType: 'focus' | 'meditation' | 'general' = 'focus',
    sessionId?: string
  ): Promise<BulkEEGUploadResponse> {
    if (readings.length === 0) {
      throw new Error('No readings to upload');
    }

    const startTime = readings[0].timestamp;
    const endTime = readings[readings.length - 1].timestamp;
    const durationSeconds = Math.floor(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
    );

    const uploadData: BulkEEGUploadRequest = {
      readings,
      session_metadata: {
        session_id: sessionId || `session_${Date.now()}`,
        start_time: startTime,
        end_time: endTime,
        session_type: sessionType,
        duration_seconds: durationSeconds
      },
      device_info: {
        device_id: 'mobile_app',
        device_type: 'react_native'
      }
    };

    return this.uploadBulkEEGData(uploadData);
  }

  // Helper method to format time for display
  formatTimeRange(start: string, end: string): string {
    try {
      const startTime = new Date(`2000-01-01T${start}:00`);
      const endTime = new Date(`2000-01-01T${end}:00`);
      
      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      };
      
      return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    } catch (error) {
      return `${start} - ${end}`;
    }
  }

  // Helper method to get priority color
  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ff9500';
      case 'low': return '#4a90e2';
      default: return '#4a90e2';
    }
  }

  // Helper method to get goal progress percentage
  getGoalProgress(goal: Goal): number {
    if (goal.progress !== undefined) {
      return Math.min(Math.max(goal.progress, 0), 100);
    }
    
    if (goal.current_value !== undefined && goal.target_value !== undefined && goal.target_value > 0) {
      return Math.min(Math.max((goal.current_value / goal.target_value) * 100, 0), 100);
    }
    
    return 0;
  }
}

export const eegService = new EEGService(); 