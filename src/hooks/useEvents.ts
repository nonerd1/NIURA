import { useState, useEffect, useCallback } from 'react';
import { eventsService, Event, CreateEventRequest, UpdateEventRequest, EventFilters } from '../services/eventsService';

interface UseEventsReturn {
  // Data
  events: Event[];
  todaysEvents: Event[];
  
  // Actions
  createEvent: (eventData: CreateEventRequest) => Promise<Event | null>;
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
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading events...', filters);
      
      const eventsData = await eventsService.getEvents(filters);
      setEvents(eventsData);
      
      console.log('Events loaded successfully:', eventsData);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError(err.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Create a new event
  const createEvent = useCallback(async (eventData: CreateEventRequest): Promise<Event | null> => {
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
      
      const success = await eventsService.deleteEvent(eventId);
      
      if (success) {
        // Remove from local state
        setEvents(prev => prev.filter(event => event.id !== eventId));
      }
      
      return success;
    } catch (err: any) {
      console.error('Error deleting event:', err);
      setError(err.message || 'Failed to delete event');
      return false;
    }
  }, []);

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