/**
 * login.js
 * Handles the SAFEGROUND AI login page: role switching (Authority /
 * Citizen), citizen login vs. register sub-tabs, browser geolocation
 * permission for registration, and the actual API calls against the
 * FastAPI backend (see backend/api.py).
 *
 * API_BASE points at the local dev backend. Update this if your
 * backend runs on a different host/port (the VS Code autopilot setup
 * referenced in this project runs it on 127.0.0.1:8002).
 */

const API_BASE = "http://127.0.0.1:8002";


let capturedLocation = null; // { lat, lng } once geolocation succeeds

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  initRoleSwitch();
  initCitizenSubtabs();
  initForgotPasswordToggle();
  initLocationRequest();
  initAuthorityLoginForm();
  initCitizenLoginForm();
  initCitizenRegisterForm();
  initForgotPasswordForm();
});

// ------------------------------------------------------------------
// Role switch (Authority / Citizen) — also honors ?role= in the URL
// so links like login.html?role=citizen land on the right tab.
// ------------------------------------------------------------------
function initRoleSwitch() {
  const authorityBtn = document.getElementById("roleAuthorityBtn");
  const citizenBtn = document.getElementById("roleCitizenBtn");
  const authorityPanel = document.getElementById("authorityPanel");
  const citizenPanel = document.getElementById("citizenPanel");

  function showAuthority() {
    authorityBtn.classList.add("is-active");
    authorityBtn.setAttribute("aria-selected", "true");
    citizenBtn.classList.remove("is-active");
    citizenBtn.setAttribute("aria-selected", "false");
    authorityPanel.style.display = "";
    citizenPanel.style.display = "none";
  }

  function showCitizen() {
    citizenBtn.classList.add("is-active");
    citizenBtn.setAttribute("aria-selected", "true");
    authorityBtn.classList.remove("is-active");
    authorityBtn.setAttribute("aria-selected", "false");
    citizenPanel.style.display = "";
    authorityPanel.style.display = "none";
  }

  authorityBtn.addEventListener("click", showAuthority);
  citizenBtn.addEventListener("click", showCitizen);

  const params = new URLSearchParams(window.location.search);
  if (params.get("role") === "citizen") {
    showCitizen();
  } else {
    showAuthority();
  }
}

// ------------------------------------------------------------------
// Citizen sub-tabs: Log In vs Register
// ------------------------------------------------------------------
function initCitizenSubtabs() {
  const loginTab = document.getElementById("citizenLoginTab");
  const registerTab = document.getElementById("citizenRegisterTab");
  const loginPanel = document.getElementById("citizenLoginPanel");
  const registerPanel = document.getElementById("citizenRegisterPanel");

  loginTab.addEventListener("click", () => {
    loginTab.classList.add("is-active");
    registerTab.classList.remove("is-active");
    loginPanel.style.display = "";
    registerPanel.style.display = "none";
  });

  registerTab.addEventListener("click", () => {
    registerTab.classList.add("is-active");
    loginTab.classList.remove("is-active");
    registerPanel.style.display = "";
    loginPanel.style.display = "none";
  });
}

// ------------------------------------------------------------------
// Forgot password panel toggle (authority side)
// ------------------------------------------------------------------
function initForgotPasswordToggle() {
  const link = document.getElementById("forgotPasswordLink");
  const backBtn = document.getElementById("backToLoginBtn");
  const loginForm = document.getElementById("authorityForm");
  const forgotPanel = document.getElementById("forgotPasswordPanel");

  link.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    document.querySelector('#authorityPanel .auth-row').style.display = "none";
    forgotPanel.style.display = "";
  });

  backBtn.addEventListener("click", () => {
    forgotPanel.style.display = "none";
    loginForm.style.display = "";
  });
}

// ------------------------------------------------------------------
// Geolocation permission request (citizen registration)
// ------------------------------------------------------------------
function initLocationRequest() {
  const btn = document.getElementById("requestLocationBtn");
  const status = document.getElementById("locationStatus");

  btn.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      status.textContent = "Your browser doesn't support location access. You can still register — we'll use your village center instead.";
      status.className = "location-status is-denied";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Requesting…";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        capturedLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        status.textContent = `Location captured (accuracy ~${Math.round(position.coords.accuracy)}m). Thank you.`;
        status.className = "location-status is-granted";
        btn.innerHTML = '<i data-lucide="check"></i> Location granted';
        if (window.lucide) lucide.createIcons();
      },
      (error) => {
        status.textContent = "Location access was denied. You can still register — we'll use your selected village's location instead.";
        status.className = "location-status is-denied";
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="crosshair"></i> Allow location access';
        if (window.lucide) lucide.createIcons();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ------------------------------------------------------------------
// API helpers
// ------------------------------------------------------------------
async function apiLogin(email, password) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Incorrect email or password.");
  }
  return data; // { access_token, token_type, user }
}

async function apiRegisterCitizen(payload) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Could not create your account. Please try again.");
  }
  return data;
}

async function apiForgotPassword(email) {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}

function persistSession(data) {
  sessionStorage.setItem("safeground_token", data.access_token);
  sessionStorage.setItem("safeground_user", JSON.stringify(data.user));
}

function friendlyNetworkError() {
  return "Couldn't reach the SAFEGROUND AI server. Make sure the backend is running (uvicorn api:app --port 800) and try again.";
}

// ------------------------------------------------------------------
// Authority login form
// ------------------------------------------------------------------
function initAuthorityLoginForm() {
  const form = document.getElementById("authorityForm");
  const errorBox = document.getElementById("authorityError");
  const errorText = document.getElementById("authorityErrorText");
  const successBox = document.getElementById("authoritySuccess");
  const submitBtn = document.getElementById("authoritySubmitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    successBox.style.display = "none";

    const email = document.getElementById("authorityEmail").value.trim();
    const password = document.getElementById("authorityPassword").value;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try {
      const data = await apiLogin(email, password);
      if (!data.user.is_authority) {
        throw new Error("This account is not registered as a disaster management authority.");
      }
      persistSession(data);
      successBox.style.display = "flex";
      setTimeout(() => { window.location.href = "dashboard.html"; }, 700);
    } catch (err) {
      errorText.textContent = err.message === "Failed to fetch" ? friendlyNetworkError() : err.message;
      errorBox.style.display = "flex";
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="log-in"></i> Sign In';
      if (window.lucide) lucide.createIcons();
    }
  });
}

// ------------------------------------------------------------------
// Citizen login form
// ------------------------------------------------------------------
function initCitizenLoginForm() {
  const form = document.getElementById("citizenLoginForm");
  const errorBox = document.getElementById("citizenLoginError");
  const errorText = document.getElementById("citizenLoginErrorText");
  const successBox = document.getElementById("citizenLoginSuccess");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    successBox.style.display = "none";

    const email = document.getElementById("citizenLoginEmail").value.trim();
    const password = document.getElementById("citizenLoginPassword").value;

    try {
      const data = await apiLogin(email, password);
      persistSession(data);
      successBox.style.display = "flex";
      setTimeout(() => { window.location.href = "citizen.html"; }, 700);
    } catch (err) {
      errorText.textContent = err.message === "Failed to fetch" ? friendlyNetworkError() : err.message;
      errorBox.style.display = "flex";
    }
  });
}
// ------------------------------------------------------------------
// Citizen registration form
// ------------------------------------------------------------------
function initCitizenRegisterForm() {
  const form = document.getElementById("citizenRegisterForm");
  const errorBox = document.getElementById("citizenRegisterError");
  const errorText = document.getElementById("citizenRegisterErrorText");
  const successBox = document.getElementById("citizenRegisterSuccess");

  // Village center fallback coordinates, used if the user doesn't
  // grant browser location access — keeps registration usable either way.
  const VILLAGE_COORDS = {
    "1024": { lat: 11.685, lng: 76.132 },
    "2048": { lat: 10.786, lng: 76.653 },
    "3012": { lat: 9.720, lng: 76.750 },
    "4055": { lat: 11.450, lng: 76.070 },
    "5090": { lat: 9.700, lng: 76.950 },
    "6110": { lat: 9.560, lng: 76.930 },
    "7020": { lat: 11.590, lng: 76.140 },
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    successBox.style.display = "none";

    const fullName = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const villageId = document.getElementById("registerVillage").value;
    const password = document.getElementById("registerPassword").value;
    const consent = document.getElementById("registerConsent").checked;

    if (!consent) {
      errorText.textContent = "Please confirm consent to store your village and location before continuing.";
      errorBox.style.display = "flex";
      return;
    }
    if (!villageId) {
      errorText.textContent = "Please select your village.";
      errorBox.style.display = "flex";
      return;
    }

    const location = capturedLocation || VILLAGE_COORDS[villageId];

    try {
      const data = await apiRegisterCitizen({
        full_name: fullName,
        email,
        password,
        village_id: parseInt(villageId, 10),
        location_lat: location.lat,
        location_lng: location.lng,
      });
      persistSession(data);
      successBox.style.display = "flex";
      setTimeout(() => { window.location.href = "citizen.html"; }, 900);
    } catch (err) {
      errorText.textContent = err.message === "Failed to fetch" ? friendlyNetworkError() : err.message;
      errorBox.style.display = "flex";
    }
  });
}

// ------------------------------------------------------------------
// Forgot password form
// ------------------------------------------------------------------
function initForgotPasswordForm() {
  const form = document.getElementById("forgotPasswordForm");
  const successBox = document.getElementById("forgotSuccess");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim();
    await apiForgotPassword(email).catch(() => {});
    // Always show success — the backend intentionally never reveals
    // whether an email is registered (see api.py forgot_password()).
    successBox.style.display = "flex";
    form.reset();
  });
}
