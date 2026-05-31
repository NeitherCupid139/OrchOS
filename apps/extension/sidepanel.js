// OrchOS Dashboard URL
// For local development:
const DEV_URL = "http://localhost:3000/dashboard";
// Use dev URL by default, change to production URL for production builds
const ORCHOS_URL = DEV_URL;

// Load the dashboard in the iframe
const iframe = document.getElementById("orchos-frame");
if (iframe) {
  iframe.src = ORCHOS_URL;
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "navigate" && message.url) {
    iframe.src = message.url;
    sendResponse({ success: true });
  }
  return true;
});
