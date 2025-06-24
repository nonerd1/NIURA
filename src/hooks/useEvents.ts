import { useState, useEffect, useCallback } from 'react';
import { eventsService, Event, CreateEventRequest, BackendEventCreate, UpdateEventRequest, EventFilters } from '../services/eventsService';

interface UseEventsReturn {
  // Data
  events: Event[];
  todaysEvents: Event[];
  
  // Actions
  createEvent: (eventData: CreateEventRequest | BackendEventCreate) => Promise<Event | null>;
  updateEvent: (eventData: UpdateEventRequest) => Promise<Event | null>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  refreshEvents: () => Promise<void>;
  getEventsForDate: (date: string) => Event[];
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Filters
  filters: EventFilters;
  setFilters: (filters: EventFilters) => void;
}

export const useEvents = (initialFilters?: EventFilters): UseEventsReturn => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<EventFilters>(initialFilters || {});

  // Load events from backend
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const eventsData = await eventsService.getEvents(filters);
      setEvents(eventsData);
      setError(null);
    } catch (error) {
      console.error('Failed to load events:', error);
      setError('Failed to load events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Create a new event
  const createEvent = useCallback(async (eventData: CreateEventRequest | BackendEventCreate): Promise<Event | null> => {
    try {
      setError(null);
      
      const newEvent = await eventsService.createEvent(eventData);
      
      // Add to local state
      setEvents(prev => [...prev, newEvent]);
      
      return newEvent;
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
      return null;
    }
  }, []);

  // Update an existing event
  const updateEvent = useCallback(async (eventData: UpdateEventRequest): Promise<Event | null> => {
    try {
      setError(null);
      
      const updatedEvent = await eventsService.updateEvent(eventData);
      
      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      ));
      
      return updatedEvent;
    } catch (err: any) {
      console.error('Error updating event:', err);
      setError(err.message || 'Failed to update event');
      return null;
    }
  }, []);

  // Delete an event
  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Check if event still exists in local state
      const eventToDelete = events.find(event => event.id === eventId);
      if (!eventToDelete) {
        console.log('Event already deleted from local state:', eventId);
        return true; // Consider it successful if already gone
      }
      
      const success = await eventsService.deleteEvent(eventId, eventToDelete);
      
      if (success) {
        // Remove from local state
        setEvents(prev => prev.filter(event => event.id !== eventId));
        return true;
      }
      
      return false;
    } catch (err: any) {
      console.error('Error deleting event:', err);
      
      // If the error is "Event not found" (404), consider it successful since it's already gone
      if (err.message && (err.message.includes('Event not found') || err.message.includes('404'))) {
        console.log('Event was already deleted from backend, removing from local state');
        setEvents(prev => prev.filter(event => event.id !== eventId));
        // Don't set error state for 404 errors since we treat them as successful
        return true;
      }
      
      // Only set error state for genuine failures (not 404s)
      setError(err.message || 'Failed to delete event');
      return false;
    }
  }, [events]);

  // Refresh events
  const refreshEvents = useCallback(async () => {
    await loadEvents();
  }, [loadEvents]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: string): Event[] => {
    return events.filter(event => event.date === date);
  }, [events]);

  // Set filters
  const setFilters = useCallback((newFilters: EventFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Get today's events
  const todaysEvents = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return events.filter(event => event.date === today);
  }, [events])();

  return {
    // Data
    events,
    todaysEvents,
    
    // Actions
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents,
    getEventsForDate,
    
    // State
    isLoading,
    error,
    
    // Filters
    filters,
    setFilters,
  };
}; 