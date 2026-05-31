/**
 * Browser Notification API utility.
 * Provides helpers for requesting permission and sending desktop notifications.
 *
 * IMPORTANT: The Notification constructor MUST be called synchronously within
 * a user gesture (click, keypress) in most browsers. After an `await`, the
 * transient user activation is lost and `new Notification(...)` may fail
 * silently. Use `scheduleNotification` or call `sendNotification` directly
 * inside click handlers to avoid this.
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
export function getNotificationPermissionState():
  | NotificationPermission
  | "unsupported" {
  if (!canUseNotifications()) return "unsupported";
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * MUST be called from a user gesture (click handler).
 * Returns true if permission was granted, false otherwise.
 */
async function requestNotificationPermission(): Promise<boolean> {
  if (!canUseNotifications()) {
    console.warn(
      "[OrchOS Notifications] Notification API not available in this environment.",
    );
    return false;
  }

  // Already granted
  if (Notification.permission === "granted") return true;

  // Already denied — can't ask again programmatically
  if (Notification.permission === "denied") {
    console.warn(
      "[OrchOS Notifications] Permission was previously denied. " +
        "The user must manually re-enable notifications in browser settings.",
    );
    return false;
  }

  // "default" — ask the user
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      console.log("[OrchOS Notifications] Permission granted.");
      return true;
    }
    console.warn("[OrchOS Notifications] Permission result:", result);
    return false;
  } catch (err) {
    console.error("[OrchOS Notifications] Failed to request permission:", err);
    return false;
  }
}

export interface SendNotificationResult {
  sent: boolean;
  reason?: "unsupported" | "denied" | "error" | "no_user_gesture";
  error?: unknown;
}

/**
 * Send a desktop notification.
 * Returns detailed result so callers can handle failures appropriately.
 *
 * WARNING: Must be called synchronously within a user gesture (click handler).
 * If called after `await`, the notification may be silently dropped by the browser.
 */
export function sendNotification(
  title: string,
  options?: NotificationOptions,
): SendNotificationResult {
  if (!canUseNotifications()) {
    return { sent: false, reason: "unsupported" };
  }

  if (Notification.permission !== "granted") {
    return { sent: false, reason: "denied" };
  }

  try {
    new Notification(title, options);
    console.log("[OrchOS Notifications] Sent:", title);
    return { sent: true };
  } catch (err) {
    // Common causes:
    // 1. Not called from a user gesture (transient activation lost)
    // 2. Browser blocked the notification at the OS level
    // 3. Too many notifications in a short period (rate limiting)
    console.error("[OrchOS Notifications] Failed to create notification:", err);
    return { sent: false, reason: "error", error: err };
  }
}

/**
 * Send a test/greeting notification to confirm system notifications are working.
 * Only fires if permission is already granted.
 */
export function sendTestNotification(): SendNotificationResult {
  return sendNotification("OrchOS", {
    body: "System notifications enabled! You will now receive alerts for events and reminders.",
    icon: "/logo.svg",
    tag: "orchos-test",
  });
}

/**
 * Ensure notification access is granted: request permission if needed,
 * then send a test notification on success.
 *
 * NOTE: Due to browser restrictions, the test notification may fail silently
 * after an async permission request (user gesture is lost after `await`).
 * Callers should verify the result and offer a manual test button if needed.
 *
 * Returns an object with `granted` and `testSent` booleans.
 */
export async function ensureSystemNotificationAccess(): Promise<{
  granted: boolean;
  testSent: boolean;
}> {
  const granted = await requestNotificationPermission();
  if (!granted) {
    return { granted: false, testSent: false };
  }

  const result = sendTestNotification();
  return { granted: true, testSent: result.sent };
}




