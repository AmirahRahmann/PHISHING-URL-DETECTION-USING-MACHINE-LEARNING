// content.js
// This script is injected directly into the webpage by background.js.
// Unlike background.js, this CAN read/modify the page's HTML, because it
// runs "inside" the page's context (sandboxed from the page's own JS, but
// sharing the same DOM).

// chrome.runtime.onMessage listens for messages sent from background.js
// via chrome.tabs.sendMessage(). This is how the two scripts talk to
// each other, since they run in completely separate processes.
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_PHISHING_WARNING") {
    showWarningBanner(message.url, message.prediction);
  }
});

function showWarningBanner(url, prediction) {
  // Avoid stacking multiple banners if somehow triggered twice
  if (document.getElementById("phishing-warning-overlay")) return;

  // We build the entire warning as one big semi-transparent overlay that
  // covers the whole page, forcing the user to consciously dismiss it
  // before continuing - similar to how real browsers warn about
  // dangerous sites.
  const overlay = document.createElement("div");
  overlay.id = "phishing-warning-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: 2147483647;          /* max possible z-index, so it sits above EVERYTHING on the page */
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    background: #fff;
    border-radius: 12px;
    max-width: 480px;
    width: 90%;
    padding: 28px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    text-align: center;
  `;

  box.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 8px;">⚠️</div>
    <h2 style="color:#c62828; margin: 0 0 12px 0;">Warning: Suspected Phishing Site</h2>
    <p style="color:#333; font-size: 14px; line-height: 1.5;">
      Our detection model flagged this page as <strong>likely phishing</strong>.
      Avoid entering passwords, card numbers, or personal information here.
    </p>
    <p style="color:#777; font-size: 12px; word-break: break-all; margin: 12px 0;">${escapeHtml(url)}</p>
    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
      <button id="phishing-leave-btn" style="
        background:#c62828; color:#fff; border:none; padding:10px 20px;
        border-radius:6px; cursor:pointer; font-size:14px;">Leave this site</button>
      <button id="phishing-dismiss-btn" style="
        background:#eee; color:#333; border:none; padding:10px 20px;
        border-radius:6px; cursor:pointer; font-size:14px;">Continue anyway</button>
    </div>
  `;

  overlay.appendChild(box);
  document.documentElement.appendChild(overlay);

  // "Leave this site" sends the user somewhere safe instead of staying
  // on the suspected phishing page.
  document.getElementById("phishing-leave-btn").addEventListener("click", () => {
    window.location.href = "https://www.google.com";
  });

  // "Continue anyway" just removes the overlay, letting an informed user
  // proceed at their own risk (mirrors how real browser warnings work).
  document.getElementById("phishing-dismiss-btn").addEventListener("click", () => {
    overlay.remove();
  });
}

// Basic escaping so a malicious URL containing HTML/script-like text can't
// break out of our innerHTML and execute on the page (defensive coding,
// since we're inserting the raw URL string into innerHTML above).
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
