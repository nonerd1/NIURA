import { sessionService } from './sessionService';
import { apiClient } from './apiClient';
import { apiConfig } from '../config/amplify';

export interface Goal {
  id: string;
  name: string; // Changed from 'title' to match backend
  target: number;
  current: number;
  unit: string; // Added to match backend
  // Keep these for backward compatibility and additional frontend features
  startDate?: string;
  endDate?: string;
  type?: 'focus' | 'stress' | 'custom';
  trackingType?: 'sessions' | 'minutes' | 'focus_score' | 'stress_episodes' | 'manual';
  targetMetric?: string;
}

// Backend response interface
interface BackendGoalProgress {
  name: string;
  current: number;
  target: number;
  unit: string;
}

interface BackendGoalsResponse {
  goals: BackendGoalProgress[];
}

class GoalsService {
  private static instance: GoalsService;
  private goals: Goal[] = [];
  private listeners: ((goals: Goal[]) => void)[] = [];
  private isLoading: boolean = false;

  private constructor() {
    // Don't initialize with hardcoded goals anymore
    this.fetchGoalsFromBackend();
  }

  static getInstance(): GoalsService {
    if (!GoalsService.instance) {
      GoalsService.instance = new GoalsService();
    }
    return GoalsService.instance;
  }

  // Fetch goals from backend API
  async fetchGoalsFromBackend(): Promise<void> {
    try {
      this.isLoading = true;
      console.log('🎯 Fetching goals from backend...');
      
      // Debug: Check if we have auth token
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔑 Auth token available:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      
      const response = await apiClient.get<BackendGoalsResponse>(
        apiConfig.endpoints.getCurrentGoals
      );
      
      console.log('🎯 Backend goals response status:', response.status);
      console.log('🎯 Backend goals response data:', JSON.stringify(response.data, null, 2));
      
      // Transform backend goals to frontend format
      const backendGoals = response.data.goals || [];
      console.log('🎯 Number of backend goals received:', backendGoals.length);
      
      this.goals = backendGoals.map((backendGoal, index) => {
        console.log(`🎯 Processing goal ${index + 1}: ${backendGoal.name} - ${backendGoal.current}/${backendGoal.target} ${backendGoal.unit}`);
        return {
          id: `goal-${index + 1}`, // Generate consistent IDs
          name: backendGoal.name,
          target: backendGoal.target,
          current: backendGoal.current, // This should preserve the backend progress!
          unit: backendGoal.unit,
          // Set reasonable defaults for optional fields
          type: this.inferGoalType(backendGoal.name),
          trackingType: this.inferTrackingType(backendGoal.unit)
        };
      });
      
      console.log('🎯 Final transformed goals:');
      this.goals.forEach((goal, index) => {
        console.log(`  ${index + 1}. ${goal.name}: ${goal.current}/${goal.target} ${goal.unit}`);
      });
      
      this.notifyListeners();
      console.log('🎯 Goals successfully fetched and updated from backend!');
    } catch (error: any) {
      console.error('❌ Error fetching goals from backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      // Fallback to default goals if API fails
      console.log('🎯 Falling back to default goals due to API error');
      this.initializeFallbackGoals();
    } finally {
      this.isLoading = false;
    }
  }

  // Infer goal type from name for backward compatibility
  private inferGoalType(name: string): Goal['type'] {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('focus') || lowerName.includes('concentration')) {
      return 'focus';
    } else if (lowerName.includes('stress') || lowerName.includes('meditation') || lowerName.includes('relax')) {
      return 'stress';
    }
    return 'custom';
  }

  // Infer tracking type from unit for backward compatibility
  private inferTrackingType(unit: string): Goal['trackingType'] {
    const lowerUnit = unit.toLowerCase();
    if (lowerUnit.includes('min')) {
      return 'minutes';
    } else if (lowerUnit.includes('session') || lowerUnit.includes('exercise')) {
      return 'sessions';
    }
    return 'manual';
  }

  // Fallback goals if backend is unavailable
  private initializeFallbackGoals() {
    console.log('🎯 Using fallback goals due to API error');
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    const yearEnd = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];

    this.goals = [
      {
        id: '1',
        name: 'Complete Deep Work Sessions',
        target: 10,
        current: 0,
        unit: 'sessions',
        startDate: yearStart,
        endDate: yearEnd,
        type: 'stress',
        trackingType: 'sessions'
      },
      {
        id: '2',
        name: 'Focus Training Hours',
        target: 25,
        current: 0,
        unit: 'minutes',
        startDate: yearStart,
        endDate: yearEnd,
        type: 'focus',
        trackingType: 'minutes'
      },
      {
        id: '3',
        name: 'Mindfulness Practice',
        target: 15,
        current: 0,
        unit: 'sessions',
        startDate: yearStart,
        endDate: yearEnd,
        type: 'custom',
        trackingType: 'sessions'
      }
    ];
    this.notifyListeners();
  }

  // Subscribe to goal updates
  subscribe(listener: (goals: Goal[]) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.goals]));
  }

  // Get all goals
  getGoals(): Goal[] {
    return [...this.goals];
  }

  // Get top 3 goals for HomeScreen
  getTopGoals(): Goal[] {
    return this.goals.slice(0, 3);
  }

  // Add a new goal (for user-created goals)
  addGoal(goal: Omit<Goal, 'id' | 'current'>): Goal {
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      current: 0
    };
    this.goals.push(newGoal);
    this.notifyListeners();
    return newGoal;
  }

  // Update a goal
  updateGoal(id: string, updates: Partial<Goal>): boolean {
    const index = this.goals.findIndex(goal => goal.id === id);
    if (index !== -1) {
      this.goals[index] = { ...this.goals[index], ...updates };
      this.notifyListeners();
      return true;
    }
    return false;
  }

  // Delete a goal
  deleteGoal(id: string): boolean {
    const index = this.goals.findIndex(goal => goal.id === id);
    if (index !== -1) {
      this.goals.splice(index, 1);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  // Calculate goal progress from session data (kept for user-created goals)
  calculateGoalProgress(goal: Goal, sessions: any[]): number {
    if (!sessions || sessions.length === 0) return goal.current;
    
    const goalStartDate = goal.startDate ? new Date(goal.startDate) : new Date();
    const goalEndDate = goal.endDate ? new Date(goal.endDate) : new Date();
    
    // Filter sessions within goal date range
    const relevantSessions = sessions.filter(session => {
      const sessionDate = new Date(session.start_time);
      return sessionDate >= goalStartDate && sessionDate <= goalEndDate;
    });
    
    switch (goal.trackingType) {
      case 'sessions':
        // Count completed sessions of specific type
        if (goal.type === 'focus') {
          return relevantSessions.filter(s => s.session_type === 'focus').length;
        } else if (goal.type === 'stress') {
          return relevantSessions.filter(s => s.session_type === 'meditation').length;
        } else {
          return relevantSessions.length;
        }
        
      case 'minutes':
        // Sum duration of relevant sessions
        if (goal.type === 'focus') {
          return relevantSessions
            .filter(s => s.session_type === 'focus')
            .reduce((sum, s) => sum + (s.actual_duration || s.planned_duration || 0), 0);
        } else if (goal.type === 'stress') {
          return relevantSessions
            .filter(s => s.session_type === 'meditation')
            .reduce((sum, s) => sum + (s.actual_duration || s.planned_duration || 0), 0);
        } else {
          return relevantSessions
            .reduce((sum, s) => sum + (s.actual_duration || s.planned_duration || 0), 0);
        }
        
      case 'focus_score':
        // Count sessions with high focus (avg_focus > 2.0)
        return relevantSessions.filter(s => (s.avg_focus || 0) > 2.0).length;
        
      case 'stress_episodes':
        // Count days with low stress (avg_stress < 1.5)
        const lowStressDays = new Set();
        relevantSessions.forEach(s => {
          if ((s.avg_stress || 0) < 1.5) {
            const day = new Date(s.start_time).toDateString();
            lowStressDays.add(day);
          }
        });
        return lowStressDays.size;
        
      default:
        return goal.current;
    }
  }

  // Refresh goals from backend
  async refreshGoals(): Promise<void> {
    await this.fetchGoalsFromBackend();
  }

  // Update goals from session data (now only for user-created goals, backend goals are already calculated)
  async updateGoalsFromSessions(): Promise<void> {
    try {
      // First refresh from backend to get latest calculated progress
      await this.fetchGoalsFromBackend();
      
      // Then update any user-created goals from session data
      const sessionResponse = await sessionService.getSessionHistory();
      const sessions = sessionResponse.sessions || [];
      
      let hasChanges = false;
      const updatedGoals = this.goals.map(goal => {
        // Only calculate progress for user-created goals (those with tracking type)
        if (goal.trackingType && goal.startDate && goal.endDate) {
          const newProgress = this.calculateGoalProgress(goal, sessions);
          if (newProgress !== goal.current) {
            hasChanges = true;
            console.log(`🎯 User Goal "${goal.name}": ${goal.current} → ${newProgress}`);
            return { ...goal, current: newProgress };
          }
        }
        return goal;
      });

      if (hasChanges) {
        this.goals = updatedGoals;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error updating goals:', error);
    }
  }

  // Check if goals are currently loading
  isLoadingGoals(): boolean {
    return this.isLoading;
  }
}

export const goalsService = GoalsService.getInstance(); 