import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { DayOfWeek, Reminder } from '@/types';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Storage keys
const NOTIFICATION_TOKEN_KEY = '@notification_token';
const SCHEDULED_NOTIFICATIONS_KEY = '@scheduled_notifications';

/**
 * Request notification permissions from the user
 * Returns true if permissions granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Notifications don't work on web
  if (Platform.OS === 'web') {
    console.warn('Push notifications are not supported on web');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Ask for permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Goal Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Create additional channels for different types
      await Notifications.setNotificationChannelAsync('workouts', {
        name: 'Workout Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4ECDC4',
      });

      await Notifications.setNotificationChannelAsync('nutrition', {
        name: 'Nutrition Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Get the device's push notification token (for push notifications from server)
 * This is optional - we're using local notifications primarily
 */
export async function getPushNotificationToken(): Promise<string | null> {
  try {
    // Check if we have a stored token
    const storedToken = await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
    if (storedToken) {
      return storedToken;
    }

    // Get new token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Schedule a local notification based on a reminder
 * Returns the notification identifier
 */
export async function scheduleReminderNotification(reminder: Reminder): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('No notification permission, cannot schedule');
      return null;
    }

    // Parse time (HH:mm format)
    const [hours, minutes] = reminder.time.split(':').map(Number);

    let trigger: Notifications.NotificationTriggerInput;

    switch (reminder.frequency) {
      case 'once': {
        // Schedule for next occurrence of this time
        const now = new Date();
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduledDate <= now) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        trigger = {
          date: scheduledDate,
        } as any;
        break;
      }

      case 'daily': {
        trigger = {
          hour: hours,
          minute: minutes,
          repeats: true,
        } as any;
        break;
      }

      case 'weekdays': {
        // Schedule for Monday-Friday
        trigger = {
          weekday: 2, // Monday (1 = Sunday, 2 = Monday, etc.)
          hour: hours,
          minute: minutes,
          repeats: true,
        } as any;
        // Note: For weekdays, we'll need to schedule 5 separate notifications
        // This is a limitation of expo-notifications
        break;
      }

      case 'weekends': {
        // Schedule for Saturday-Sunday
        trigger = {
          weekday: 7, // Saturday
          hour: hours,
          minute: minutes,
          repeats: true,
        } as any;
        break;
      }

      case 'custom': {
        if (!reminder.daysOfWeek || reminder.daysOfWeek.length === 0) {
          console.warn('Custom reminder needs daysOfWeek');
          return null;
        }

        // For custom days, schedule the first day
        // We'll need to schedule multiple notifications for multiple days
        const dayIndex = getDayOfWeekIndex(reminder.daysOfWeek[0]);
        trigger = {
          weekday: dayIndex,
          hour: hours,
          minute: minutes,
          repeats: true,
        } as any;
        break;
      }

      default:
        console.warn('Unknown reminder frequency');
        return null;
    }

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body || 'Time to work on your goal!',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        data: {
          reminderId: reminder.id,
          goalId: reminder.goalId,
          type: 'goal_reminder',
        },
      },
      trigger,
    });

    // Store the notification ID mapping
    await storeScheduledNotification(reminder.id, notificationId);

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Schedule notifications for multiple days (for weekdays or custom)
 */
export async function scheduleMultiDayReminder(
  reminder: Reminder,
  days: DayOfWeek[]
): Promise<string[]> {
  const notificationIds: string[] = [];

  for (const day of days) {
    const [hours, minutes] = reminder.time.split(':').map(Number);
    const dayIndex = getDayOfWeekIndex(day);

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body || 'Time to work on your goal!',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            reminderId: reminder.id,
            goalId: reminder.goalId,
            type: 'goal_reminder',
            day,
          },
        },
        trigger: {
          weekday: dayIndex,
          hour: hours,
          minute: minutes,
          repeats: true,
        } as any,
      });

      notificationIds.push(notificationId);
    } catch (error) {
      console.error(`Error scheduling notification for ${day}:`, error);
    }
  }

  // Store all notification IDs
  if (notificationIds.length > 0) {
    await storeScheduledNotification(reminder.id, notificationIds.join(','));
  }

  return notificationIds;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelReminderNotification(reminderId: string): Promise<void> {
  try {
    const notificationIds = await getScheduledNotification(reminderId);
    if (!notificationIds) {
      return;
    }

    // Handle multiple notification IDs (for weekdays/custom)
    const ids = notificationIds.split(',');
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }

    // Remove from storage
    await removeScheduledNotification(reminderId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Get all currently scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Add notification response listener
 * Fires when user taps on a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener
 * Fires when a notification is received while app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Present a local notification immediately (not scheduled)
 */
export async function presentNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data,
    },
    trigger: null, // null means present immediately
  });
}

/**
 * Set badge count (app icon badge)
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

/**
 * Clear badge count
 */
export async function clearBadgeCount(): Promise<void> {
  await setBadgeCount(0);
}

// Helper functions

function getDayOfWeekIndex(day: DayOfWeek): number {
  const dayMap: Record<DayOfWeek, number> = {
    sunday: 1,
    monday: 2,
    tuesday: 3,
    wednesday: 4,
    thursday: 5,
    friday: 6,
    saturday: 7,
  };
  return dayMap[day];
}

async function storeScheduledNotification(
  reminderId: string,
  notificationId: string
): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    const notifications = stored ? JSON.parse(stored) : {};
    notifications[reminderId] = notificationId;
    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error storing notification mapping:', error);
  }
}

async function getScheduledNotification(reminderId: string): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    if (!stored) return null;
    const notifications = JSON.parse(stored);
    return notifications[reminderId] || null;
  } catch (error) {
    console.error('Error getting notification mapping:', error);
    return null;
  }
}

async function removeScheduledNotification(reminderId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    if (!stored) return;
    const notifications = JSON.parse(stored);
    delete notifications[reminderId];
    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error removing notification mapping:', error);
  }
}
