"use strict";

const configuredApiBaseUrl = typeof window.CEBUSTAYS_CONFIG?.apiBaseUrl === "string"
  ? window.CEBUSTAYS_CONFIG.apiBaseUrl.trim().replace(/\/+$/, "")
  : "";
const isLocalApiPreview = window.location.port === "5505" ||
  window.location.port === "5506" ||
  /^[a-z0-9-]+-550[56]\.app\.github\.dev$/i.test(window.location.hostname);
const API_BASE_URL = isLocalApiPreview
  ? ""
  : configuredApiBaseUrl;
const status = document.getElementById("developer-status");
const destinations = document.getElementById("developer-destinations");
const actions = document.getElementById("developer-actions");
const retryButton = document.getElementById("developer-retry");

async function requestAccountApi(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
    credentials: "include",
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The account request could not be completed.");
  }

  return data;
}

async function checkDeveloperSession() {
  status.textContent = "Checking your developer session…";
  retryButton.hidden = true;
  destinations.hidden = true;
  actions.hidden = true;

  try {
    const data = await requestAccountApi("/me");
    if (data.user?.role !== "developer") {
      window.location.replace("./");
      return;
    }

    document.getElementById("developer-email").textContent = data.user.email;
    status.textContent = "You're signed in as a developer. Choose a project to continue.";
    destinations.hidden = false;
    actions.hidden = false;
  } catch (error) {
    status.textContent = `${error.message} Check your connection and try again.`;
    retryButton.hidden = false;
  }
}

retryButton.addEventListener("click", checkDeveloperSession);

document.getElementById("developer-logout").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  status.textContent = "Signing out…";

  try {
    await requestAccountApi("/logout", { method: "POST" });
    window.location.replace("./");
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});

checkDeveloperSession();
