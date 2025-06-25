import { useState, useRef, useCallback } from 'react';
import { sessionService, CreateSessionRequest, SessionData, SessionLabel } from '../services/sessionService';
import { eegService, EEGReading } from '../services/eegService';

interface UseSessionReturn {
  // Session state
  currentSession: SessionData | null;
  isSessionActive: boolean;
  sessionDuration: number;
  eegReadings: EEGReading[];
  
  // Session management
  startSession: (sessionData: CreateSessionRequest & { session_type?: string }) => Promise<boolean>;
  endSession: () => Promise<boolean>;
  pauseSession: () => void;
  resumeSession: () => void;
  
  // EEG data collection
  addEEGReading: (focusValue: number, stressValue: number) => void;
  
  // Session state
  isLoading: boolean;
  error: string | null;
  
  // Session statistics (real-time)
  sessionStats: {
    averageFocus: number;
    averageStress: number;
    peakFocus: number;
    focusTimePercentage: number;
    readingsCount: number;
  };
}

export const useSession = (): UseSessionReturn => {
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [eegReadings, setEegReadings] = useState<EEGReading[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sessionStartTime = useRef<Date | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const isPaused = useRef(false);
  const pausedDuration = useRef(0);

  const startSession = useCallback(async (sessionData: CreateSessionRequest & { session_type?: string }): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting new session...', sessionData);
      
      // Create session on backend
      const response = await sessionService.createSession(sessionData);
      
      if (response.success) {
        // Create a minimal session object for tracking
        const session: SessionData = {
          id: response.session_id,
          name: sessionData.label,
          session_type: (sessionData.session_type as any) || 'focus', // Use the actual session type selected
          status: 'active',
          start_time: new Date().toISOString(),
          planned_duration: sessionData.duration,
          labels: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setCurrentSession(session);
        setIsSessionActive(true);
        setEegReadings([]);
        setSessionDuration(0);
        sessionStartTime.current = new Date();
        isPaused.current = false;
        pausedDuration.current = 0;
        
        // Start duration timer
        durationInterval.current = setInterval(() => {
          if (!isPaused.current && sessionStartTime.current) {
            const elapsed = Math.floor((Date.now() - sessionStartTime.current.getTime()) / 1000);
            setSessionDuration(elapsed - pausedDuration.current);
          }
        }, 1000);
        
        console.log('Session started successfully:', session);
        return true;
      } else {
        throw new Error(response.message || 'Failed to create session');
      }
    } catch (err: any) {
      console.error('Error starting session:', err);
      setError(err.message || 'Failed to start session');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endSession = useCallback(async (): Promise<boolean> => {
    if (!currentSession || !isSessionActive) {
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Ending session...', currentSession.id);
      
      // Stop duration timer
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      
      // Calculate actual duration in minutes
      const actualDurationMinutes = Math.max(1, Math.floor(sessionDuration / 60)); // Ensure at least 1 minute
      console.log(`Session duration: ${sessionDuration} seconds (${actualDurationMinutes} minutes)`);
      
      // Update session duration in backend
      try {
        await sessionService.updateSession(currentSession.id, {
          duration: actualDurationMinutes
        });
        console.log('✅ Session duration updated in backend');
      } catch (updateError) {
        console.error('⚠️ Failed to update session duration in backend:', updateError);
        // Don't fail the entire session end process if backend update fails
      }
      
      // Upload EEG data if we have any
      if (eegReadings.length > 0) {
        console.log(`Uploading ${eegReadings.length} EEG readings...`);
        
        await eegService.uploadSessionData(
          eegReadings,
          currentSession.session_type as 'focus' | 'meditation' | 'general',
          currentSession.id
        );
        
        console.log('EEG data uploaded successfully');
      }
      
      // Mark session as completed
      setIsSessionActive(false);
      setCurrentSession(prev => prev ? {
        ...prev,
        status: 'completed',
        end_time: new Date().toISOString(),
        actual_duration: actualDurationMinutes,
        eeg_data_count: eegReadings.length
      } : null);
      
      console.log('Session ended successfully');
      return true;
    } catch (err: any) {
      console.error('Error ending session:', err);
      setError(err.message || 'Failed to end session');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, isSessionActive, sessionDuration, eegReadings]);

  const pauseSession = useCallback(() => {
    if (isSessionActive && !isPaused.current) {
      isPaused.current = true;
      console.log('Session paused');
    }
  }, [isSessionActive]);

  const resumeSession = useCallback(() => {
    if (isSessionActive && isPaused.current) {
      isPaused.current = false;
      console.log('Session resumed');
    }
  }, [isSessionActive]);

  const addEEGReading = useCallback((focusValue: number, stressValue: number) => {
    if (!isSessionActive || !currentSession || isPaused.current) {
      return;
    }

    const reading = eegService.createEEGReading(focusValue, stressValue, currentSession.id);
    setEegReadings(prev => [...prev, reading]);
  }, [isSessionActive, currentSession]);

  // Calculate real-time session statistics
  const sessionStats = useCallback(() => {
    if (eegReadings.length === 0) {
      return {
        averageFocus: 0,
        averageStress: 0,
        peakFocus: 0,
        focusTimePercentage: 0,
        readingsCount: 0
      };
    }

    const focusValues = eegReadings.map(r => r.focus_value);
    const stressValues = eegReadings.map(r => r.stress_value);
    
    const averageFocus = focusValues.reduce((sum, val) => sum + val, 0) / focusValues.length;
    const averageStress = stressValues.reduce((sum, val) => sum + val, 0) / stressValues.length;
    const peakFocus = Math.max(...focusValues);
    
    // Calculate focus time percentage (readings where focus > 2.0)
    const focusReadings = eegReadings.filter(r => r.focus_value > 2.0).length;
    const focusTimePercentage = (focusReadings / eegReadings.length) * 100;

    return {
      averageFocus: Math.round(averageFocus * 10) / 10,
      averageStress: Math.round(averageStress * 10) / 10,
      peakFocus: Math.round(peakFocus * 10) / 10,
      focusTimePercentage: Math.round(focusTimePercentage),
      readingsCount: eegReadings.length
    };
  }, [eegReadings])();

  return {
    // Session state
    currentSession,
    isSessionActive,
    sessionDuration,
    eegReadings,
    
    // Session management
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    
    // EEG data collection
    addEEGReading,
    
    // Session state
    isLoading,
    error,
    
    // Session statistics
    sessionStats,
  };
}; 