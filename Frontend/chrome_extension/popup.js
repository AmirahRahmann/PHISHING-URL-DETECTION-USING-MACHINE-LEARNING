// popup.js
// Runs when the user clicks the extension's toolbar icon.
// Reads whatever background.js last saved to chrome.storage.local
// (see chrome.storage.local.set({lastResult: ...}) in background.js)
// and displays it - just a convenience view, doesn't trigger a new check.

chrome.storage.local.get("lastResult", (data) => {
  const box = document.getElementById("result-box");

  if (!data.lastResult) {
    return; // keep the default "No page checked yet." message
  }

  const { url, result } = data.lastResult;

  box.textContent = `${result}: ${url}`;
  box.className = result === "Phishing" ? "phish" : "legit";
});
