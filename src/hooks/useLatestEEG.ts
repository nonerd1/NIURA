import { useState, useEffect, useCallback } from 'react';
import { eegService, LatestEEGData } from '../services/eegService';

interface UseLatestEEGReturn {
  latestData: LatestEEGData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  timeAgo: string;
  isRecent: boolean;
  lastRefresh: Date | null;
}

export const useLatestEEG = (autoRefreshInterval?: number): UseLatestEEGReturn => {
  const [latestData, setLatestData] = useState<LatestEEGData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchLatestData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await eegService.getLatestEEG();
      setLatestData(data);
      setLastRefresh(new Date());
      
      console.log('Latest EEG data refreshed:', data);
    } catch (err: any) {
      console.error('Error fetching latest EEG data:', err);
      setError(err.message || 'Failed to fetch latest EEG data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLatestData();
  }, [fetchLatestData]);

  // Auto-refresh if interval is provided
  useEffect(() => {
    if (!autoRefreshInterval) return;

    const interval = setInterval(() => {
      // Only auto-refresh if we're not currently loading
      if (!isLoading) {
        fetchLatestData();
      }
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, isLoading, fetchLatestData]);

  // Calculate time ago and recency
  const getTimeInfo = useCallback(() => {
    if (!latestData) {
      return { timeAgo: 'No data', isRecent: false };
    }

    const formatted = eegService.formatLatestEEGForDisplay(latestData);
    return {
      timeAgo: formatted.timeAgoText,
      isRecent: formatted.isRecent
    };
  }, [latestData]);

  const { timeAgo, isRecent } = getTimeInfo();

  return {
    latestData,
    isLoading,
    error,
    refresh: fetchLatestData,
    timeAgo,
    isRecent,
    lastRefresh,
  };
}; 