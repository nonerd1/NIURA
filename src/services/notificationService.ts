import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Event } from './eventsService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

class NotificationService {
  private permissionGranted: boolean | null = null;

  // Request notification permissions
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      
      // If permission not already granted, ask for it
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      const granted = finalStatus === 'granted';
      this.permissionGranted = granted;
      
      return {
        granted,
        canAskAgain: finalStatus !== 'denied'
      };
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return { granted: false, canAskAgain: false };
    }
  }

  // Check if permissions are already granted
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === 'granted';
      this.permissionGranted = granted;
      return granted;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  // Schedule a notification for an event
  async scheduleEventNotification(event: Event): Promise<string | null> {
    try {
      // Check if we have permission
      if (this.permissionGranted === null) {
        await this.checkPermissions();
      }
      
      if (!this.permissionGranted) {
        console.log('No notification permission, skipping notification scheduling');
        return null;
      }

      // Parse event date and time
      const eventDateTime = new Date(`${event.date}T${event.time}:00`);
      const now = new Date();
      
      // Don't schedule notifications for past events
      if (eventDateTime <= now) {
        console.log('Event is in the past, not scheduling notification');
        return null;
      }

      // Schedule notification for event time
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${event.title}`,
          body: `Your ${event.type.replace('-', ' ')} starts now • ${event.duration}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            eventId: event.id,
            eventType: event.type,
          },
        },
        trigger: {
          type: 'date',
          date: eventDateTime,
        } as Notifications.DateTriggerInput,
      });

      console.log(`Notification scheduled for ${event.title} at ${eventDateTime.toLocaleString()}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Cancel a notification
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Cancel all notifications for a specific event
  async cancelEventNotifications(eventId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      const eventNotifications = scheduledNotifications.filter(
        notification => notification.content.data?.eventId === eventId
      );
      
      for (const notification of eventNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      
      console.log(`Cancelled ${eventNotifications.length} notifications for event ${eventId}`);
    } catch (error) {
      console.error('Error cancelling event notifications:', error);
    }
  }

  // Get all scheduled notifications (for debugging)
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}

export const notificationService = new NotificationService(); 