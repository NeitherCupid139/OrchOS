/**
 * Browser Notification API utility.
 * Provides helpers for requesting permission and sending desktop notifications.
 */

/**
 * Check if the Notification API is available in this environment.
 */
export function canUseNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get the current notification permission state.
 * Returns "granted" | "denied" | "default" | "unsupported".
 */
export function getNotificationPermissionState(): NotificationPermission | "unsupported" {
  if (!canUseNotifications()) return "unsupported";
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * Returns true if permission was granted, false otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!canUseNotifications()) return false;

  // Already granted
  if (Notification.permission === "granted") return true;

  // Already denied — can't ask again programmatically
  if (Notification.permission === "denied") return false;

  // "default" — ask the user
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Send a desktop notification.
 * Returns the Notification instance if sent, or null if permission is lacking.
 */
export function sendNotification(
  title: string,
  options?: NotificationOptions,
): Notification | null {
  if (!canUseNotifications()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const notification = new Notification(title, options);
    return notification;
  } catch {
    return null;
  }
}

/**
 * Send a test/greeting notification to confirm system notifications are working.
 * Only fires if permission is already granted.
 */
export function sendTestNotification(): Notification | null {
  return sendNotification(
    "OrchOS",
    {
      body: "System notifications enabled! You will now receive alerts for events and reminders.",
      icon: "/logo.svg",
      tag: "orchos-test",
    },
  );
}

/**
 * Ensure notification access is granted: request permission if needed,
 * then send a test notification on success.
 * Returns true if permission was (or already is) granted.
 */
export async function ensureSystemNotificationAccess(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (granted) {
    sendTestNotification();
    return true;
  }
  return false;
}
