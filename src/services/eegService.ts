import { apiClient } from './apiClient';
import { apiConfig } from '../config/amplify';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  
  // EEG Data Buffering and Upload System for Earbuds
  private eegDataBuffer: Array<{
    sample_index: number;
    timestamp: string;
    eeg: number[];
  }> = [];
  
  private uploadInterval: NodeJS.Timeout | null = null;
  private isUploading = false;

  // Get Current Goals - GET /api/eeg/current-goals
  async getCurrentGoals(): Promise<Goal[]> {
    try {
      const response = await apiClient.get<any>(
        apiConfig.endpoints.getCurrentGoals
      );
      
      // Transform backend response to frontend format
      const backendGoals = response.data.goals || [];
      const goals: Goal[] = backendGoals.map((backendGoal: any, index: number) => ({
        id: backendGoal.id || index + 1, // Generate ID if not provided
        title: backendGoal.name || backendGoal.title || 'Untitled Goal',
        description: backendGoal.description || `Track your ${backendGoal.name || 'goal'} progress`,
        target_value: backendGoal.target || backendGoal.target_value || 0,
        current_value: backendGoal.current || backendGoal.current_value || 0,
        progress: backendGoal.progress || (backendGoal.current && backendGoal.target ? 
          Math.min(Math.max((backendGoal.current / backendGoal.target) * 100, 0), 100) : 0),
        status: backendGoal.status || 'active',
        created_at: backendGoal.created_at,
        updated_at: backendGoal.updated_at
      }));
      
      return goals;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch current goals');
    }
  }

  // Get Recommendations - GET /api/eeg/recommendations
  async getRecommendations(): Promise<Recommendation[]> {
    try {
      const response = await apiClient.get<any>(
        apiConfig.endpoints.getRecommendations
      );
      
      // Transform backend response to frontend format
      const backendRecommendations = response.data.recommendations || [];
      const recommendations: Recommendation[] = backendRecommendations.map((backendRec: any, index: number) => ({
        id: backendRec.id || index + 1, // Generate ID if not provided
        title: backendRec.label || backendRec.title || 'Recommendation',
        description: backendRec.description || 'No description available',
        type: backendRec.type || 'general', // Default to general type
        priority: backendRec.priority || 'medium', // Default to medium priority
        action_items: backendRec.action_items || [],
        created_at: backendRec.created_at
      }));
      
      return recommendations;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch recommendations');
    }
  }

  // Get Music Suggestion - GET /api/eeg/music-suggestion
  async getMusicSuggestion(): Promise<MusicSuggestion[]> {
    try {
      const response = await apiClient.get<any>(
        apiConfig.endpoints.getMusicSuggestion
      );
      
      // Transform backend response to frontend format
      const backendData = response.data;
      
      // Backend returns single object, frontend expects array
      const suggestion: MusicSuggestion = {
        id: 1, // Generate ID since backend doesn't provide it
        title: backendData.suggestion || 'Music Suggestion',
        artist: 'Unknown Artist', // Backend doesn't provide artist
        genre: 'Focus Music', // Default genre
        mood: 'Concentration', // Default mood
        duration: 180, // Default 3 minutes
        spotify_url: undefined,
        youtube_url: undefined,
        preview_url: backendData.music_url || undefined,
        recommended_for: 'focus' // Based on the suggestion type
      };
      
      const suggestions = [suggestion]; // Convert to array
      
      return suggestions;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch music suggestions');
    }
  }

  // Get Best Focus Time - GET /api/eeg/best-focus-time
  async getBestFocusTime(): Promise<FocusTimeData> {
    try {
      const response = await apiClient.get<any>(
        apiConfig.endpoints.getBestFocusTime
      );
      
      // Transform backend response to frontend format
      const backendData = response.data;
      
      // Handle null values from backend
      let focusTimeData: FocusTimeData;
      
      if (backendData.best_time_range && backendData.avg_focus) {
        // If backend has data, use it
        focusTimeData = {
          best_time_start: backendData.best_time_range.start || '09:00',
          best_time_end: backendData.best_time_range.end || '11:00',
          focus_score: Math.round((backendData.avg_focus / 3) * 100), // Convert 0-3 scale to 0-100
          confidence: 85, // Default confidence
          day_of_week: backendData.day_of_week
        };
      } else {
        // Fallback data when backend returns null
        focusTimeData = {
          best_time_start: '09:00',
          best_time_end: '11:00',
          focus_score: 75,
          confidence: 50, // Lower confidence for fallback data
          day_of_week: 'weekday'
        };
      }
      
      return focusTimeData;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch best focus time');
    }
  }

  // Get EEG Aggregate Data - GET /api/eeg/aggregate?range={range}
  async getEEGAggregate(range: AggregateRange = 'hourly'): Promise<EEGAggregateResponse> {
    try {
      const response = await apiClient.get<any>(
        `${apiConfig.endpoints.eegAggregate}?range=${range}`
      );
      
      // Backend returns chart-ready format, not raw data format
      // We need to transform it to match what the frontend expects
      const backendData = response.data;
      
      // Check if backend returned chart format
      if (backendData.datasets && backendData.labels) {
        // Extract focus and stress data from datasets
        const focusDataset = backendData.datasets.find((d: any) => d.label === 'Focus');
        const stressDataset = backendData.datasets.find((d: any) => d.label === 'Stress');
        
        // Transform to raw data format with proper timestamps
        const now = new Date();
        const transformedData: EEGAggregateDataPoint[] = backendData.labels.map((label: string, index: number) => {
          let timestamp: string;
          
          // Generate proper ISO timestamps based on range and label
          switch (range) {
            case 'hourly':
              // For hourly data like "09:00", "10:00", create timestamps for today
              const hour = parseInt(label.split(':')[0]) || index;
              const hourDate = new Date(now);
              hourDate.setHours(hour, 0, 0, 0);
              timestamp = hourDate.toISOString();
              break;
              
            case 'daily':
            case 'weekly':
              // For daily/weekly data like "Mon", "Tue", create timestamps for past week
              const daysAgo = 6 - index; // Start from 6 days ago
              const dayDate = new Date(now);
              dayDate.setDate(dayDate.getDate() - daysAgo);
              dayDate.setHours(12, 0, 0, 0); // Set to noon for consistency
              timestamp = dayDate.toISOString();
              break;
              
            case 'monthly':
              // For monthly data, create timestamps for past weeks/months
              const weeksAgo = (3 - index) * 7; // 4 weeks back
              const weekDate = new Date(now);
              weekDate.setDate(weekDate.getDate() - weeksAgo);
              weekDate.setHours(12, 0, 0, 0);
              timestamp = weekDate.toISOString();
              break;
              
            default:
              // Fallback: use current time with index offset
              const fallbackDate = new Date(now.getTime() - (index * 60 * 60 * 1000));
              timestamp = fallbackDate.toISOString();
          }
          
          return {
            timestamp,
            focus_avg: focusDataset?.data[index] || 0,
            stress_avg: stressDataset?.data[index] || 0,
            focus_max: focusDataset?.data[index] || 0,
            stress_max: stressDataset?.data[index] || 0,
            focus_min: focusDataset?.data[index] || 0,
            stress_min: stressDataset?.data[index] || 0,
            sample_count: 1,
            quality_avg: 85
          };
        });
        
        const aggregateResponse: EEGAggregateResponse = {
          range: range,
          data: transformedData,
          total_samples: transformedData.length,
          start_date: transformedData[0]?.timestamp || now.toISOString(),
          end_date: transformedData[transformedData.length - 1]?.timestamp || now.toISOString(),
          timezone: 'UTC'
        };
        
        return aggregateResponse;
      } else {
        // If backend already returns raw format, use it directly
        return response.data;
      }
    } catch (error: any) {
      // Provide fallback data when backend fails (especially for daily range)
      if (range === 'daily') {
        const today = new Date();
        const fallbackData: EEGAggregateDataPoint[] = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(date.getDate() - (6 - i)); // Create dates for the past 7 days
          return {
            timestamp: date.toISOString(),
            focus_avg: 0,
            stress_avg: 0,
            focus_max: 0,
            stress_max: 0,
            focus_min: 0,
            stress_min: 0,
            sample_count: 0,
            quality_avg: 0
          };
        });
        
        return {
          range: range,
          data: fallbackData,
          total_samples: 0,
          start_date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: today.toISOString(),
          timezone: 'UTC'
        };
      }
      
      throw new Error(error.message || 'Failed to fetch EEG aggregate data');
    }
  }

  // Get Latest EEG Data - GET /api/eeg/latest
  async getLatestEEG(): Promise<LatestEEGData> {
    try {
      const response = await apiClient.get<any>(
        apiConfig.endpoints.getLatestEEG
      );
      
      // Transform backend response to frontend format
      const backendData = response.data;
      const latestData: LatestEEGData = {
        focus_value: backendData.focus_label || 0,
        stress_value: backendData.stress_label || 0,
        timestamp: backendData.timestamp || new Date().toISOString(),
        session_id: backendData.session_id,
        quality_score: backendData.quality_score,
        device_id: backendData.device_id,
        session_type: backendData.session_type
      };
      
      return latestData;
    } catch (error: any) {
      // Check if this is a "no data" error (expected for new users)
      const isNoDataError = error.message?.includes('No EEG record found') || 
                           error.message?.includes('not found') ||
                           error.status === 404;
      
      if (isNoDataError) {
        throw new Error('No EEG record found for this user');
      } else {
        throw new Error(error.message || 'Failed to fetch latest EEG data');
      }
    }
  }

  // Bulk EEG Upload - POST /api/eeg/bulk
  async uploadBulkEEGData(uploadData: BulkEEGUploadRequest): Promise<BulkEEGUploadResponse> {
    try {
      const response = await apiClient.post<BulkEEGUploadResponse>(
        apiConfig.endpoints.bulkEegUpload,
        uploadData
      );
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to upload EEG data');
    }
  }

  // Helper method to format aggregate data for charts
  formatAggregateForChart(aggregateData: EEGAggregateResponse) {
    if (!aggregateData || !aggregateData.data || !Array.isArray(aggregateData.data) || aggregateData.data.length === 0) {
      return null;
    }

    try {
      let invalidTimestampCount = 0;
      const labels = aggregateData.data.map((point, index) => {
        const date = new Date(point.timestamp);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          invalidTimestampCount++;
          // For invalid dates, just return the timestamp as-is
          return point.timestamp;
        }
        
        switch (aggregateData.range) {
          case 'hourly':
            // Return all labels - let frontend handle 4-hour filtering
            const hour = date.getHours();
            const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            return `${hour12}${ampm}`;
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

      if (invalidTimestampCount > 0) {
        console.log(`Handled ${invalidTimestampCount} pre-formatted timestamps for ${aggregateData.range} range`);
      }

      const focusData = aggregateData.data.map(point => point.focus_avg);
      const stressData = aggregateData.data.map(point => point.stress_avg);

      const result = {
        labels,
        focusData,
        stressData,
        range: aggregateData.range,
        totalSamples: aggregateData.total_samples
      };

      return result;
    } catch (error) {
      return null;
    }
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

  // Get EEG Data with Smart Fallback Logic
  async getEEGDataWithFallback(): Promise<{
    focusValue: number;
    stressValue: number;
    source: 'backend' | 'default';
    isLive: boolean;
    isRecent: boolean;
    timeAgo?: string;
  }> {
    try {
      console.log('🧠 Attempting to fetch latest EEG data from backend...');
      
      // Try to get latest EEG data from backend
      const latestData = await this.getLatestEEG();
      
      // Check if data is recent (within last 24 hours)
      const dataTime = new Date(latestData.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - dataTime.getTime()) / (1000 * 60 * 60);
      const isRecent = hoursDiff < 24;
      
      // Format time ago
      let timeAgo = '';
      if (hoursDiff < 1) {
        const minutesDiff = Math.floor(hoursDiff * 60);
        timeAgo = `${minutesDiff} minutes ago`;
      } else if (hoursDiff < 24) {
        timeAgo = `${Math.floor(hoursDiff)} hours ago`;
      } else {
        const daysDiff = Math.floor(hoursDiff / 24);
        timeAgo = `${daysDiff} days ago`;
      }
      
      console.log(`✅ Backend EEG data found: Focus ${latestData.focus_value}, Stress ${latestData.stress_value} (${timeAgo})`);
      
      return {
        focusValue: latestData.focus_value,
        stressValue: latestData.stress_value,
        source: 'backend',
        isLive: false,
        isRecent,
        timeAgo
      };
      
    } catch (error: any) {
      console.log('⚠️ Could not fetch backend EEG data:', error.message);
      
      // Return default fallback values
      console.log('🔄 Using default fallback EEG values');
      return {
        focusValue: 1.5,
        stressValue: 1.5,
        source: 'default',
        isLive: false,
        isRecent: false
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

  // Add raw EEG data to buffer (called by earbuds integration)
  addRawEEGData(rawEEGData: {
    sample_index: number;
    timestamp: Date | string;
    eeg: number[]; // Raw 8-channel EEG data from earbuds
  }): void {
    try {
      const formattedData = {
        sample_index: rawEEGData.sample_index,
        timestamp: typeof rawEEGData.timestamp === 'string' 
          ? rawEEGData.timestamp 
          : rawEEGData.timestamp.toISOString(),
        eeg: rawEEGData.eeg
      };

      this.eegDataBuffer.push(formattedData);
      
      console.log(`📊 EEG data buffered: ${this.eegDataBuffer.length} samples in buffer`);
      
      // Start auto-upload if not already running
      if (!this.uploadInterval) {
        this.startAutoUpload();
      }
      
    } catch (error) {
      console.error('Error adding EEG data to buffer:', error);
    }
  }

  // Start automatic upload every 30 seconds
  startAutoUpload(): void {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
    }

    this.uploadInterval = setInterval(async () => {
      await this.uploadBufferedData();
    }, 30000); // 30 seconds

    console.log('🔄 Auto-upload started: will upload EEG data every 30 seconds');
  }

  // Stop automatic upload
  stopAutoUpload(): void {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
      console.log('⏹️ Auto-upload stopped');
    }
  }

  // Upload buffered data to backend
  async uploadBufferedData(): Promise<void> {
    if (this.isUploading || this.eegDataBuffer.length === 0) {
      return;
    }

    this.isUploading = true;

    try {
      const dataToUpload = [...this.eegDataBuffer]; // Copy buffer
      this.eegDataBuffer = []; // Clear buffer immediately

      console.log(`⬆️ Uploading ${dataToUpload.length} EEG samples to backend...`);

      const batchData = {
        records: dataToUpload,
        duration: 4 // Default 4-second processing window
      };

      const response = await apiClient.post<any>(
        apiConfig.endpoints.bulkEegUpload,
        batchData
      );

      console.log(`✅ EEG data upload successful: ${response.data.message}`);
      
    } catch (error: any) {
      console.error('❌ Failed to upload EEG data:', error.message);
      
      // On failure, we could optionally re-add data to buffer for retry
      // For now, we'll just log the error and continue
    } finally {
      this.isUploading = false;
    }
  }

  // Manual upload trigger (for testing or immediate upload)
  async forceUploadBuffer(): Promise<boolean> {
    try {
      await this.uploadBufferedData();
      return true;
    } catch (error) {
      console.error('Force upload failed:', error);
      return false;
    }
  }

  // Get buffer status for debugging
  getBufferStatus(): {
    bufferSize: number;
    isAutoUploading: boolean;
    isCurrentlyUploading: boolean;
  } {
    return {
      bufferSize: this.eegDataBuffer.length,
      isAutoUploading: !!this.uploadInterval,
      isCurrentlyUploading: this.isUploading
    };
  }

  // Debug method to check authentication and EEG data access
  async debugEEGDataAccess(): Promise<{
    isAuthenticated: boolean;
    currentUser?: any;
    eegRecordsCount: number;
    latestRecord?: any;
    error?: string;
  }> {
    try {
      console.log('🔍 DEBUG: Checking EEG data access...');
      
      // Check if we have a valid auth token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        return {
          isAuthenticated: false,
          eegRecordsCount: 0,
          error: 'No authentication token found'
        };
      }

      console.log('🔑 Auth token found:', token.substring(0, 30) + '...');

      // Try to get EEG records to see how many we have access to
      try {
        const recordsResponse = await apiClient.get<any>(
          `${apiConfig.endpoints.eegAggregate.replace('/aggregate', '/records')}?limit=1`
        );
        
        console.log('📊 EEG records response:', recordsResponse.data);
        
        return {
          isAuthenticated: true,
          eegRecordsCount: recordsResponse.data.count || 0,
          latestRecord: recordsResponse.data.records?.[0],
        };
      } catch (recordsError: any) {
        console.log('❌ Error fetching EEG records:', recordsError.message);
        
        // Try to get latest EEG as fallback
        try {
          const latestData = await this.getLatestEEG();
          return {
            isAuthenticated: true,
            eegRecordsCount: 1,
            latestRecord: latestData,
          };
        } catch (latestError: any) {
          return {
            isAuthenticated: true,
            eegRecordsCount: 0,
            error: `Cannot access EEG data: ${latestError.message}`
          };
        }
      }
      
    } catch (error: any) {
      console.error('🚨 Debug EEG access failed:', error);
      return {
        isAuthenticated: false,
        eegRecordsCount: 0,
        error: error.message
      };
    }
  }
}

export const eegService = new EEGService(); 