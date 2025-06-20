import { apiClient } from './apiClient';
import { apiConfig } from '../config/amplify';

// Event Types
export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time string (HH:MM)
  duration: string; // Duration string (e.g., "30 min", "1 hour")
  type: 'mindful-break' | 'workout' | 'custom' | 'meeting' | 'reminder';
  reminder: boolean;
  reminder_time?: number; // Minutes before event to remind
  location?: string;
  notes?: string;
  color?: string; // Hex color for calendar display
  recurring?: boolean;
  recurring_pattern?: 'daily' | 'weekly' | 'monthly';
  all_day?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time string (HH:MM)
  duration: string; // Duration string
  type: 'mindful-break' | 'workout' | 'custom' | 'meeting' | 'reminder';
  reminder?: boolean;
  reminder_time?: number;
  location?: string;
  notes?: string;
  color?: string;
  recurring?: boolean;
  recurring_pattern?: 'daily' | 'weekly' | 'monthly';
  all_day?: boolean;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  id: string;
}

export interface EventsResponse {
  success: boolean;
  events: Event[];
  total_count?: number;
  message?: string;
}

export interface EventResponse {
  success: boolean;
  event: Event;
  message?: string;
}

export interface DeleteEventResponse {
  success: boolean;
  message?: string;
}

export interface EventFilters {
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  type?: 'mindful-break' | 'workout' | 'custom' | 'meeting' | 'reminder';
  date?: string; // Specific date filter
}

// Backend response interfaces
interface EventApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

class EventsService {
  
  // Type guard to check if response is an Event
  private isEvent(obj: any): obj is Event {
    return obj && typeof obj === 'object' && 'title' in obj && 'id' in obj && 'date' in obj;
  }

  // Type guard to check if response has data property
  private hasDataProperty(obj: any): obj is EventApiResponse<Event> {
    return obj && typeof obj === 'object' && 'data' in obj;
  }

  // Type guard to check if response has event property
  private hasEventProperty(obj: any): obj is EventResponse {
    return obj && typeof obj === 'object' && 'event' in obj;
  }
  
  // Create Event - POST /api/events
  async createEvent(eventData: CreateEventRequest): Promise<Event> {
    try {
      console.log('Creating event...', eventData);
      
      const response = await apiClient.post<any>(
        apiConfig.endpoints.createEvent,
        eventData
      );
      
      // Handle different response formats
      let event: Event;
      if (this.isEvent(response.data)) {
        event = response.data;
      } else if (this.hasDataProperty(response.data)) {
        event = response.data.data;
      } else if (this.hasEventProperty(response.data)) {
        event = response.data.event;
      } else {
        throw new Error('Invalid response format');
      }
      
      console.log('Event created successfully:', event);
      return event;
    } catch (error: any) {
      console.error('Error creating event:', error);
      throw new Error(error.message || 'Failed to create event');
    }
  }

  // Update Event - PUT /api/events/{id}
  async updateEvent(eventData: UpdateEventRequest): Promise<Event> {
    try {
      console.log('Updating event...', eventData);
      
      const endpoint = apiConfig.endpoints.updateEvent.replace('{id}', eventData.id);
      const { id, ...updateData } = eventData;
      
      const response = await apiClient.put<any>(
        endpoint,
        updateData
      );
      
      // Handle different response formats
      let event: Event;
      if (this.isEvent(response.data)) {
        event = response.data;
      } else if (this.hasDataProperty(response.data)) {
        event = response.data.data;
      } else if (this.hasEventProperty(response.data)) {
        event = response.data.event;
      } else {
        throw new Error('Invalid response format');
      }
      
      console.log('Event updated successfully:', event);
      return event;
    } catch (error: any) {
      console.error('Error updating event:', error);
      throw new Error(error.message || 'Failed to update event');
    }
  }

  // Delete Event - DELETE /api/events/{id}
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      console.log('Deleting event...', eventId);
      
      const endpoint = apiConfig.endpoints.deleteEvent.replace('{id}', eventId);
      
      const response = await apiClient.delete<DeleteEventResponse>(endpoint);
      
      console.log('Event deleted successfully');
      return response.data.success;
    } catch (error: any) {
      console.error('Error deleting event:', error);
      throw new Error(error.message || 'Failed to delete event');
    }
  }

  // Get Events - GET /api/events
  async getEvents(filters?: EventFilters): Promise<Event[]> {
    try {
      console.log('Fetching events...', filters);
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      
      const url = queryParams.toString() 
        ? `${apiConfig.endpoints.getEvents}?${queryParams.toString()}`
        : apiConfig.endpoints.getEvents;
      
      const response = await apiClient.get<EventsResponse | Event[]>(url);
      
      // Handle different response formats
      const events = Array.isArray(response.data) 
        ? response.data 
        : (response.data as EventsResponse).events;
      
      console.log('Events fetched successfully:', events);
      return events || [];
    } catch (error: any) {
      console.error('Error fetching events:', error);
      throw new Error(error.message || 'Failed to fetch events');
    }
  }

  // Get events for a specific date
  async getEventsForDate(date: string): Promise<Event[]> {
    return this.getEvents({ date });
  }

  // Get events for a date range
  async getEventsForDateRange(startDate: string, endDate: string): Promise<Event[]> {
    return this.getEvents({ start_date: startDate, end_date: endDate });
  }

  // Helper method to format event time
  formatEventTime(time: string): string {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return time; // Return original if parsing fails
    }
  }

  // Helper method to get event type color
  getEventTypeColor(eventType: string): string {
    switch (eventType) {
      case 'mindful-break': return '#9C27B0';
      case 'workout': return '#4CAF50';
      case 'meeting': return '#2196F3';
      case 'reminder': return '#FF9800';
      case 'custom': return '#607D8B';
      default: return '#757575';
    }
  }

  // Helper method to get event type icon
  getEventTypeIcon(eventType: string): string {
    switch (eventType) {
      case 'mindful-break': return 'meditation';
      case 'workout': return 'weight-lifter';
      case 'meeting': return 'account-group';
      case 'reminder': return 'bell';
      case 'custom': return 'calendar-check';
      default: return 'calendar';
    }
  }

  // Helper method to parse duration string
  parseDuration(duration: string): number {
    try {
      const match = duration.match(/(\d+)\s*(min|hour|hr|h)/i);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        
        if (unit === 'min') {
          return value;
        } else if (unit === 'hour' || unit === 'hr' || unit === 'h') {
          return value * 60;
        }
      }
      return 30; // Default 30 minutes
    } catch (error) {
      return 30; // Default 30 minutes
    }
  }

  // Helper method to format duration
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  // Helper method to check if event is today
  isEventToday(eventDate: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return eventDate === today;
  }

  // Helper method to check if event is upcoming
  isEventUpcoming(eventDate: string, eventTime: string): boolean {
    const now = new Date();
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    return eventDateTime > now;
  }

  // Helper method to get default event types
  getDefaultEventTypes(): Array<{ value: Event['type'], label: string, icon: string, color: string }> {
    return [
      { 
        value: 'mindful-break', 
        label: 'Mindful Break', 
        icon: 'meditation', 
        color: '#9C27B0' 
      },
      { 
        value: 'workout', 
        label: 'Workout', 
        icon: 'weight-lifter', 
        color: '#4CAF50' 
      },
      { 
        value: 'meeting', 
        label: 'Meeting', 
        icon: 'account-group', 
        color: '#2196F3' 
      },
      { 
        value: 'reminder', 
        label: 'Reminder', 
        icon: 'bell', 
        color: '#FF9800' 
      },
      { 
        value: 'custom', 
        label: 'Custom', 
        icon: 'calendar-check', 
        color: '#607D8B' 
      }
    ];
  }
}

export const eventsService = new EventsService(); 