import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Event } from './eventsService';
import { authService } from './auth';

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
  
  // 🚨 NEW: Threshold alert state tracking to prevent notification spam
  private alertStates = {
    focusAlertSent: false,    // Track if focus alert has been sent for current breach
    stressAlertSent: false,   // Track if stress alert has been sent for current breach
    lastFocusValue: 0,        // Track last focus value to detect crossing
    lastStressValue: 0,       // Track last stress value to detect crossing
  };

  // Request notification permissions
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      this.permissionGranted = finalStatus === 'granted';
      
      return {
        granted: finalStatus === 'granted',
        canAskAgain: finalStatus !== 'denied'
      };
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return { granted: false, canAskAgain: true };
    }
  }

  // Check current notification permissions
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  // 🔧 ENHANCED: Check threshold alerts with intelligent throttling
  async checkThresholdAlerts(focusValue: number, stressValue: number): Promise<void> {
    try {
      // Get user preferences
      const preferences = await authService.getUserPreferences();
      
      if (!preferences.notifications_enabled) {
        return; // User has disabled notifications
      }

      const focusThreshold = preferences.focus_alert_threshold;
      const stressThreshold = preferences.stress_alert_threshold;

      // 🎯 FOCUS THRESHOLD LOGIC WITH THROTTLING
      const isFocusBelowThreshold = focusValue < focusThreshold;
      const wasFocusBelowThreshold = this.alertStates.lastFocusValue < focusThreshold;
      
      if (isFocusBelowThreshold && !wasFocusBelowThreshold && !this.alertStates.focusAlertSent) {
        // Focus just dropped below threshold - send alert
        await this.sendFocusAlert(focusValue, focusThreshold);
        this.alertStates.focusAlertSent = true;
        console.log('🎯 Focus alert sent - focus dropped below threshold');
      } else if (!isFocusBelowThreshold && wasFocusBelowThreshold) {
        // Focus recovered above threshold - reset alert state
        this.alertStates.focusAlertSent = false;
        console.log('✅ Focus recovered - alert state reset');
      }

      // 🔥 STRESS THRESHOLD LOGIC WITH THROTTLING  
      const isStressAboveThreshold = stressValue > stressThreshold;
      const wasStressAboveThreshold = this.alertStates.lastStressValue > stressThreshold;
      
      if (isStressAboveThreshold && !wasStressAboveThreshold && !this.alertStates.stressAlertSent) {
        // Stress just exceeded threshold - send alert
        await this.sendStressAlert(stressValue, stressThreshold);
        this.alertStates.stressAlertSent = true;
        console.log('🔥 Stress alert sent - stress exceeded threshold');
      } else if (!isStressAboveThreshold && wasStressAboveThreshold) {
        // Stress dropped below threshold - reset alert state
        this.alertStates.stressAlertSent = false;
        console.log('✅ Stress normalized - alert state reset');
      }

      // Update last values for next comparison
      this.alertStates.lastFocusValue = focusValue;
      this.alertStates.lastStressValue = stressValue;

    } catch (error) {
      console.error('Error checking threshold alerts:', error);
    }
  }

  // 🎯 Send focus alert notification
  private async sendFocusAlert(currentValue: number, threshold: number): Promise<void> {
    try {
      if (!await this.checkPermissions()) {
        console.log('Notifications not permitted - skipping focus alert');
        return;
      }

      const percentage = Math.round((currentValue / 3) * 100);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎯 Focus Alert',
          body: `Your focus level dropped to ${percentage}% (${currentValue.toFixed(1)}/3.0). Time for a break or refocus technique?`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'focus_alert',
            value: currentValue,
            threshold: threshold,
            timestamp: new Date().toISOString(),
          },
        },
        trigger: null, // Send immediately
      });
      
      console.log(`🎯 Focus alert sent: ${percentage}% (${currentValue.toFixed(1)}/3.0)`);
    } catch (error) {
      console.error('Error sending focus alert:', error);
    }
  }

  // 🔥 Send stress alert notification
  private async sendStressAlert(currentValue: number, threshold: number): Promise<void> {
    try {
      if (!await this.checkPermissions()) {
        console.log('Notifications not permitted - skipping stress alert');
        return;
      }

      const percentage = Math.round((currentValue / 3) * 100);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Stress Alert',
          body: `Your stress level is high at ${percentage}% (${currentValue.toFixed(1)}/3.0). Consider taking a moment to relax.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'stress_alert',
            value: currentValue,
            threshold: threshold,
            timestamp: new Date().toISOString(),
          },
        },
        trigger: null, // Send immediately
      });
      
      console.log(`🔥 Stress alert sent: ${percentage}% (${currentValue.toFixed(1)}/3.0)`);
    } catch (error) {
      console.error('Error sending stress alert:', error);
    }
  }

  // 🔄 Reset alert states (useful for testing or manual reset)
  resetAlertStates(): void {
    this.alertStates = {
      focusAlertSent: false,
      stressAlertSent: false,
      lastFocusValue: 0,
      lastStressValue: 0,
    };
    console.log('🔄 Alert states reset');
  }

  // 📊 Get current alert states (for debugging)
  getAlertStates() {
    return { ...this.alertStates };
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