import { apiClient } from './apiClient';
import { apiConfig } from '../config/amplify';

// Session Types
export interface SessionLabel {
  id: string | number;
  name: string;
  color?: string;
  description?: string;
  category?: 'work' | 'meditation' | 'study' | 'break' | 'custom';
  created_at?: string;
}

export interface CreateSessionRequest {
  name: string;
  session_type: 'focus' | 'meditation' | 'study' | 'break' | 'custom';
  planned_duration?: number; // in minutes
  labels?: string[]; // Array of label IDs or names
  goals?: string[]; // Session goals
  notes?: string;
}

export interface CreateSessionResponse {
  success: boolean;
  session_id: string;
  message?: string;
  session: SessionData;
}

export interface SessionData {
  id: string;
  name: string;
  session_type: 'focus' | 'meditation' | 'study' | 'break' | 'custom';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  start_time: string; // ISO string
  end_time?: string; // ISO string
  planned_duration?: number; // in minutes
  actual_duration?: number; // in minutes
  labels: SessionLabel[];
  goals?: string[];
  notes?: string;
  eeg_data_count?: number; // Number of EEG readings
  avg_focus?: number; // Average focus score (0-3)
  avg_stress?: number; // Average stress score (0-3)
  peak_focus?: number; // Peak focus achieved
  focus_time_percentage?: number; // Percentage of time in focus state
  created_at: string;
  updated_at: string;
}

export interface SessionHistoryResponse {
  success: boolean;
  sessions: SessionData[];
  total_count: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
}

export interface SessionHistoryFilters {
  session_type?: 'focus' | 'meditation' | 'study' | 'break' | 'custom';
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  labels?: string[]; // Filter by label IDs
  page?: number;
  per_page?: number;
  sort_by?: 'start_time' | 'duration' | 'avg_focus' | 'avg_stress';
  sort_order?: 'asc' | 'desc';
}

export interface CreateSessionLabelRequest {
  name: string;
  color?: string;
  description?: string;
  category?: 'work' | 'meditation' | 'study' | 'break' | 'custom';
}

export interface SessionLabelsResponse {
  success: boolean;
  labels: SessionLabel[];
  message?: string;
}

// Backend response interfaces
interface SessionApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

class SessionService {
  
  // Create Session Labels - POST /api/eeg/session-labels
  async createSessionLabel(labelData: CreateSessionLabelRequest): Promise<SessionLabel> {
    try {
      console.log('Creating session label...', labelData);
      
      const response = await apiClient.post<SessionApiResponse<SessionLabel> | SessionLabel>(
        apiConfig.endpoints.sessionLabels,
        labelData
      );
      
      // Handle different response formats
      const label = 'name' in response.data 
        ? response.data as SessionLabel
        : (response.data as SessionApiResponse<SessionLabel>).data;
      
      console.log('Session label created successfully:', label);
      return label;
    } catch (error: any) {
      console.error('Error creating session label:', error);
      throw new Error(error.message || 'Failed to create session label');
    }
  }

  // Get Session Labels - GET /api/eeg/session-labels (assuming this exists)
  async getSessionLabels(): Promise<SessionLabel[]> {
    try {
      console.log('Fetching session labels...');
      
      const response = await apiClient.get<SessionLabelsResponse | SessionLabel[]>(
        apiConfig.endpoints.sessionLabels
      );
      
      // Handle different response formats
      const labels = Array.isArray(response.data) 
        ? response.data 
        : (response.data as SessionLabelsResponse).labels;
      
      console.log('Session labels fetched successfully:', labels);
      return labels || [];
    } catch (error: any) {
      console.error('Error fetching session labels:', error);
      
      // If backend doesn't support GET for session labels (only POST), provide fallback
      if (error.response?.status === 405 || error.message?.includes('Method Not Allowed')) {
        console.warn('Session labels endpoint only supports POST, providing default labels');
        return this.getDefaultLabels();
      }
      
      // For any other error, also provide default labels instead of throwing
      console.warn('Session labels API failed, providing default labels');
      return this.getDefaultLabels();
    }
  }

  // Create Session - POST /api/sessions/create
  async createSession(sessionData: CreateSessionRequest): Promise<CreateSessionResponse> {
    try {
      console.log('Creating new session...', sessionData);
      
      const response = await apiClient.post<CreateSessionResponse>(
        apiConfig.endpoints.createSession,
        sessionData
      );
      
      console.log('Session created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating session:', error);
      throw new Error(error.message || 'Failed to create session');
    }
  }

  // Get Session History - GET /api/sessions/history
  async getSessionHistory(filters?: SessionHistoryFilters): Promise<SessionHistoryResponse> {
    try {
      console.log('Fetching session history...', filters);
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(item => queryParams.append(key, item.toString()));
            } else {
              queryParams.append(key, value.toString());
            }
          }
        });
      }
      
      const url = queryParams.toString() 
        ? `${apiConfig.endpoints.sessionHistory}?${queryParams.toString()}`
        : apiConfig.endpoints.sessionHistory;
      
      const response = await apiClient.get<SessionHistoryResponse>(url);
      
      console.log('Session history fetched successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching session history:', error);
      throw new Error(error.message || 'Failed to fetch session history');
    }
  }

  // Helper method to format session duration
  formatSessionDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  // Helper method to get session type color
  getSessionTypeColor(sessionType: string): string {
    switch (sessionType) {
      case 'focus': return '#4287f5';
      case 'meditation': return '#9C27B0';
      case 'study': return '#FF9800';
      case 'break': return '#4CAF50';
      case 'custom': return '#607D8B';
      default: return '#757575';
    }
  }

  // Helper method to get session type icon
  getSessionTypeIcon(sessionType: string): string {
    switch (sessionType) {
      case 'focus': return 'target';
      case 'meditation': return 'meditation';
      case 'study': return 'book-open';
      case 'break': return 'coffee';
      case 'custom': return 'cog';
      default: return 'circle';
    }
  }

  // Helper method to calculate session statistics
  calculateSessionStats(sessions: SessionData[]) {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalDuration: 0,
        averageDuration: 0,
        averageFocus: 0,
        averageStress: 0,
        mostUsedType: 'focus',
        totalFocusTime: 0
      };
    }

    const totalDuration = sessions.reduce((sum, session) => 
      sum + (session.actual_duration || session.planned_duration || 0), 0
    );

    const averageFocus = sessions
      .filter(s => s.avg_focus !== undefined)
      .reduce((sum, session, _, arr) => sum + (session.avg_focus || 0) / arr.length, 0);

    const averageStress = sessions
      .filter(s => s.avg_stress !== undefined)
      .reduce((sum, session, _, arr) => sum + (session.avg_stress || 0) / arr.length, 0);

    // Calculate most used session type
    const typeCounts = sessions.reduce((acc, session) => {
      acc[session.session_type] = (acc[session.session_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'focus';

    // Calculate total focus time (sessions where avg_focus > 2.0)
    const totalFocusTime = sessions
      .filter(s => (s.avg_focus || 0) > 2.0)
      .reduce((sum, session) => sum + (session.actual_duration || session.planned_duration || 0), 0);

    return {
      totalSessions: sessions.length,
      totalDuration,
      averageDuration: Math.round(totalDuration / sessions.length),
      averageFocus: Math.round(averageFocus * 10) / 10,
      averageStress: Math.round(averageStress * 10) / 10,
      mostUsedType,
      totalFocusTime
    };
  }

  // Helper method to get default session labels
  getDefaultLabels(): SessionLabel[] {
    return [
      { id: 'work', name: 'Work', color: '#4287f5', category: 'work' },
      { id: 'meditation', name: 'Meditation', color: '#9C27B0', category: 'meditation' },
      { id: 'study', name: 'Study', color: '#FF9800', category: 'study' },
      { id: 'break', name: 'Break', color: '#4CAF50', category: 'break' },
      { id: 'deep-work', name: 'Deep Work', color: '#3F51B5', category: 'work' },
      { id: 'creative', name: 'Creative', color: '#E91E63', category: 'custom' },
      { id: 'reading', name: 'Reading', color: '#795548', category: 'study' },
      { id: 'planning', name: 'Planning', color: '#607D8B', category: 'work' }
    ];
  }
}

export const sessionService = new SessionService(); 