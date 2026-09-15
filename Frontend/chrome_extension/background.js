// background.js
// This runs in the background, invisibly, for as long as Chrome is open.
// It does NOT have access to a webpage's HTML directly - it can only
// make network requests and send messages to content scripts.

// Switch between versions just by changing this one line
// const API_URL = "http://127.0.0.1:8000/predict_url";   // v1
const API_URL = "http://127.0.0.1:8000/predict_url"; // v2

// chrome.webNavigation.onCompleted fires every time ANY frame finishes
// loading on ANY tab. We filter to frameId === 0, which means "the main
// page itself", not an iframe/ad/embed inside it - we only want to check
// the actual page the user navigated to, not every iframe on it.
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;

  // Reset to neutral immediately when a new page starts loading, so the
  // icon doesn't keep showing the PREVIOUS page's result while we wait
  // for the new check to finish (avoids a misleading stale icon).
  setIcon(details.tabId, "neutral");

  checkUrl(details.url, details.tabId);
});

// Centralizes the icon-swapping logic in one place. tabId scopes the
// change to just this tab - other open tabs keep their own icon state.
function setIcon(tabId, status) {
  const iconPaths = {
    safe: "icons/icon-safe.png",
    danger: "icons/icon-danger.png",
    neutral: "icons/icon-neutral.png",
  };
  chrome.action.setIcon({ tabId: tabId, path: iconPaths[status] });
}

async function checkUrl(url, tabId) {
  // Skip Chrome's own internal pages (chrome://, chrome-extension://, etc.)
  // - our model has no concept of these and our API would just error out.
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url }),
    });

    if (!response.ok) {
      // API returned an error (e.g. malformed URL it couldn't extract
      // features from). We just silently skip rather than warning the user
      // about something we're not confident about.
      console.warn("Phishing API error:", await response.text());
      return;
    }

    const data = await response.json();

    // Store the latest result so popup.html can show it when clicked later.
    chrome.storage.local.set({ lastResult: { url, ...data } });

    if (data.result === "Phishing") {
      setIcon(tabId, "danger");

      // Tell the content script running on THIS specific tab to show
      // the warning overlay. We inject content.js fresh each time
      // (rather than declaring it as always-running) to keep things light.
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ["content.js"],
        },
        () => {
          // After content.js is injected, send it the data it needs
          // to build the warning message.
          chrome.tabs.sendMessage(tabId, {
            type: "SHOW_PHISHING_WARNING",
            url: url,
            prediction: data,
          });
        }
      );
    } else {
      setIcon(tabId, "safe");
    }
  } catch (err) {
    // Network error (e.g. backend server not running). Logged for
    // debugging, but we don't interrupt the user's browsing for this.
    console.error("Could not reach phishing detection API:", err);
  }
}