import { useState, useRef, useCallback } from 'react';
import { eegService, EEGReading, BulkEEGUploadResponse } from '../services/eegService';

interface EEGSessionHookReturn {
  isRecording: boolean;
  sessionData: EEGReading[];
  startSession: (sessionType?: 'focus' | 'meditation' | 'general') => void;
  stopSession: () => Promise<BulkEEGUploadResponse | null>;
  addReading: (focusValue: number, stressValue: number) => void;
  clearSession: () => void;
  sessionDuration: number;
  isUploading: boolean;
  uploadError: string | null;
}

export const useEEGSession = (): EEGSessionHookReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionData, setSessionData] = useState<EEGReading[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const sessionStartTime = useRef<Date | null>(null);
  const sessionId = useRef<string | null>(null);
  const sessionType = useRef<'focus' | 'meditation' | 'general'>('focus');
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const startSession = useCallback((type: 'focus' | 'meditation' | 'general' = 'focus') => {
    if (isRecording) return;

    console.log('Starting EEG session:', type);
    
    sessionStartTime.current = new Date();
    sessionId.current = `session_${Date.now()}`;
    sessionType.current = type;
    
    setIsRecording(true);
    setSessionData([]);
    setSessionDuration(0);
    setUploadError(null);

    // Start duration timer
    durationInterval.current = setInterval(() => {
      if (sessionStartTime.current) {
        const duration = Math.floor((Date.now() - sessionStartTime.current.getTime()) / 1000);
        setSessionDuration(duration);
      }
    }, 1000);
  }, [isRecording]);

  const stopSession = useCallback(async (): Promise<BulkEEGUploadResponse | null> => {
    if (!isRecording || sessionData.length === 0) {
      setIsRecording(false);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      return null;
    }

    console.log('Stopping EEG session and uploading data...');
    setIsRecording(false);
    setIsUploading(true);

    // Clear duration timer
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    try {
      const response = await eegService.uploadSessionData(
        sessionData,
        sessionType.current,
        sessionId.current || undefined
      );

      console.log('Session data uploaded successfully:', response);
      setUploadError(null);
      return response;
    } catch (error: any) {
      console.error('Failed to upload session data:', error);
      setUploadError(error.message || 'Failed to upload session data');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [isRecording, sessionData]);

  const addReading = useCallback((focusValue: number, stressValue: number) => {
    if (!isRecording || !sessionId.current) return;

    const reading = eegService.createEEGReading(focusValue, stressValue, sessionId.current);
    
    setSessionData(prev => [...prev, reading]);
  }, [isRecording]);

  const clearSession = useCallback(() => {
    setIsRecording(false);
    setSessionData([]);
    setSessionDuration(0);
    setUploadError(null);
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    sessionStartTime.current = null;
    sessionId.current = null;
  }, []);

  return {
    isRecording,
    sessionData,
    startSession,
    stopSession,
    addReading,
    clearSession,
    sessionDuration,
    isUploading,
    uploadError,
  };
}; 