import { useState, useEffect, useCallback } from 'react';
import { sessionService, SessionData, SessionHistoryFilters, SessionLabel } from '../services/sessionService';

interface UseSessionHistoryReturn {
  // Data
  sessions: SessionData[];
  labels: SessionLabel[];
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  
  // Filtering
  filters: SessionHistoryFilters;
  setFilters: (filters: SessionHistoryFilters) => void;
  clearFilters: () => void;
  
  // Actions
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  
  // State
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  
  // Statistics
  stats: {
    totalSessions: number;
    totalDuration: number;
    averageDuration: number;
    averageFocus: number;
    averageStress: number;
    mostUsedType: string;
    totalFocusTime: number;
  };
}

export const useSessionHistory = (initialFilters?: SessionHistoryFilters): UseSessionHistoryReturn => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [labels, setLabels] = useState<SessionLabel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFiltersState] = useState<SessionHistoryFilters>({
    page: 1,
    per_page: 20,
    sort_by: 'start_time',
    sort_order: 'desc',
    ...initialFilters
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session history
  const loadSessionHistory = useCallback(async (appendToExisting = false) => {
    try {
      if (!appendToExisting) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);
      
      console.log('Loading session history...', filters);
      
      const response = await sessionService.getSessionHistory(filters);
      
      if (appendToExisting) {
        setSessions(prev => [...prev, ...response.sessions]);
      } else {
        setSessions(response.sessions);
      }
      
      setCurrentPage(response.page || 1);
      setTotalPages(response.total_pages || 1);
      setTotalCount(response.total_count);
      
      console.log('Session history loaded successfully:', response);
    } catch (err: any) {
      console.error('Error loading session history:', err);
      
      // If the endpoint doesn't exist (404) or other backend issues, provide empty fallback
      if (err.response?.status === 404 || err.message?.includes('Not Found') || 
          err.response?.status === 500 || err.message?.includes('Internal Server Error')) {
        console.warn('Session history endpoint not available, using empty fallback');
        setSessions([]);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(0);
        setError(null); // Don't show error for missing endpoint
      } else {
        setError(err.message || 'Failed to load session history');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters]);

  // Load session labels
  const loadSessionLabels = useCallback(async () => {
    try {
      const labelsData = await sessionService.getSessionLabels();
      setLabels(labelsData);
    } catch (err: any) {
      console.error('Error loading session labels:', err);
      // Use default labels if API fails
      setLabels(sessionService.getDefaultLabels());
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSessionHistory();
    loadSessionLabels();
  }, [loadSessionHistory, loadSessionLabels]);

  // Reload when filters change
  useEffect(() => {
    if (filters.page === 1) {
      loadSessionHistory();
    }
  }, [filters, loadSessionHistory]);

  // Set filters with page reset
  const setFilters = useCallback((newFilters: SessionHistoryFilters) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page when filters change
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({
      page: 1,
      per_page: 20,
      sort_by: 'start_time',
      sort_order: 'desc'
    });
  }, []);

  // Refresh current data
  const refresh = useCallback(async () => {
    await loadSessionHistory(false);
  }, [loadSessionHistory]);

  // Load more data (pagination)
  const loadMore = useCallback(async () => {
    if (currentPage < totalPages && !isLoadingMore) {
      setFiltersState(prev => ({
        ...prev,
        page: (prev.page || 1) + 1
      }));
      await loadSessionHistory(true);
    }
  }, [currentPage, totalPages, isLoadingMore, loadSessionHistory]);

  // Calculate statistics
  const stats = useCallback(() => {
    // Ensure sessions is always an array before passing to calculateSessionStats
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    return sessionService.calculateSessionStats(safeSessions);
  }, [sessions])();

  return {
    // Data
    sessions,
    labels,
    
    // Pagination
    currentPage,
    totalPages,
    totalCount,
    
    // Filtering
    filters,
    setFilters,
    clearFilters,
    
    // Actions
    refresh,
    loadMore,
    
    // State
    isLoading,
    isLoadingMore,
    error,
    
    // Statistics
    stats,
  };
}; 