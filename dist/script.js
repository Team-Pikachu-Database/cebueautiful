"use strict";

const DEFAULT_REWARD_CATALOG = [
  { id: "gift-cafe", category: "coupon", title: "Cebu Coffee Treat", points: 120, description: "₱50 café and snack credit for quick breaks around the city.", rewardType: "coupon", code: "CB-CAFE-50", monetaryValue: 50 },
  { id: "city-market", category: "coupon", title: "City Market Voucher", points: 260, description: "₱150 voucher for groceries, essentials, and local finds.", rewardType: "coupon", code: "CB-MARKET-150", monetaryValue: 150 },
  { id: "grocery-bundle", category: "freebies", title: "Grocery Gift Basket", points: 450, description: "A curated bundle of pantry essentials and household basics.", rewardType: "coupon", code: "CB-GROC-250", monetaryValue: 250 },
  { id: "dining-pass", category: "coupon", title: "Cebu Dining Pass", points: 600, description: "Enjoy a ₱300 dining credit at a participating local restaurant.", rewardType: "coupon", code: "CB-DINE-300", monetaryValue: 300 },
  { id: "spa-voucher", category: "freebies", title: "Spa & Wellness Mini Pack", points: 700, description: "A relaxing spa voucher for pampering and rejuvenation.", rewardType: "coupon", code: "CB-SPA-500", monetaryValue: 500 },
  { id: "breakfast-for-two", category: "service", title: "Breakfast for Two", points: 750, description: "A breakfast set for two guests at a participating Cebu hotel.", rewardType: "coupon", code: "CB-BREAKFAST-450", monetaryValue: 450 },
  { id: "massage-session", category: "service", title: "Massage Session", points: 900, description: "A restorative wellness session for one person.", rewardType: "coupon", code: "CB-MASSAGE-650", monetaryValue: 650 },
  { id: "airport-transfer", category: "service", title: "Airport Transfer", points: 1000, description: "A convenient one-way airport transfer credit.", rewardType: "coupon", code: "CB-TRANSFER-700", monetaryValue: 700 },
  { id: "hotel-amenity-pack", category: "freebies", title: "Hotel Amenity Pack", points: 1100, description: "A welcome amenity bundle for a more comfortable stay.", rewardType: "coupon", code: "CB-AMENITY-800", monetaryValue: 800 },
  { id: "suite-upgrade", category: "package", title: "Hotel Room Upgrade", points: 1400, description: "Request a room upgrade at a participating Cebu property.", rewardType: "package", code: "CB-SUITE-UPGRADE" },
  { id: "weekend-getaway", category: "package", title: "Weekend Cebu Escape", points: 1800, description: "A two-day local getaway bundle with dining and leisure perks.", rewardType: "package", code: "CB-WEEKEND-ESCAPE" },
  { id: "sunset-stay", category: "package", title: "Sunset Stay Bundle", points: 2400, description: "A hotel or resort add-on package for a relaxing short stay.", rewardType: "package", code: "CB-SUNSET-STAY" }
];

const SPIN_WHEEL_REWARDS = [
  { id: "try-again", title: "Try again", weight: 70, color: "#e5e7eb", kind: "tryAgain" },
  { id: "voucher-100", title: "₱50 café treat", weight: 12, color: "#fbbf24", kind: "reward", reward: DEFAULT_REWARD_CATALOG[0] },
  { id: "market-voucher", title: "₱150 market voucher", weight: 7, color: "#f59e0b", kind: "reward", reward: DEFAULT_REWARD_CATALOG[1] },
  { id: "spa-pack", title: "Spa & wellness pack", weight: 5, color: "#14b8a6", kind: "reward", reward: DEFAULT_REWARD_CATALOG[4] },
  { id: "weekend-escape", title: "Weekend Cebu escape", weight: 4, color: "#8b5cf6", kind: "reward", reward: DEFAULT_REWARD_CATALOG[10] },
  {
    id: "grand-prize",
    title: "1 whole week free vacation",
    weight: 2,
    color: "#ffc107",
    kind: "reward",
    reward: {
      id: "grand-prize",
      title: "1 whole week free vacation",
      category: "package",
      rewardType: "grand",
      code: "CB-GRAND-1-WEEK",
      description: "Seven nights at a hotel of your choice with all hotel amenities included. Subject to hotel availability and confirmation."
    }
  }
];

const SPIN_WHEEL_TOTAL_WEIGHT = SPIN_WHEEL_REWARDS.reduce(
  (total, reward) => total + reward.weight,
  0
);

function selectWheelReward(ticket) {
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= SPIN_WHEEL_TOTAL_WEIGHT) {
    throw new RangeError("The spin ticket is outside the wheel odds.");
  }

  let boundary = 0;
  for (const reward of SPIN_WHEEL_REWARDS) {
    boundary += reward.weight;
    if (ticket < boundary) return reward;
  }

  throw new Error("The spin wheel could not select a reward.");
}

function buildWheelGradient() {
  let angle = 0;
  const stops = SPIN_WHEEL_REWARDS.map(reward => {
    const start = angle;
    angle += reward.weight / SPIN_WHEEL_TOTAL_WEIGHT * 360;
    return `${reward.color} ${start}deg ${angle}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

const configuredApiBaseUrl = typeof window.CEBUSTAYS_CONFIG?.apiBaseUrl === "string"
  ? window.CEBUSTAYS_CONFIG.apiBaseUrl.trim().replace(/\/+$/, "")
  : "";

function resolveApiBaseUrl() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  const codespaceMatch = hostname.match(/^([a-z0-9-]+)-(\d+)\.app\.github\.dev$/i);

  if (codespaceMatch) {
    const [, codespaceName, codespacePort] = codespaceMatch;
    if (codespacePort === "5505") {
      return `${protocol}//${codespaceName}-5506.app.github.dev`;
    }
    if (codespacePort === "5506") {
      return "";
    }
  }

  if (["localhost", "127.0.0.1"].includes(hostname)) {
    if (port === "5505") return `${protocol}//${hostname}:5506`;
    if (port === "5506") return "";
  }

  return configuredApiBaseUrl || "";
}

const API_BASE_URL = resolveApiBaseUrl();
const API_URL = `${API_BASE_URL}/api/hotels`;

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0
});

const VISIBLE_IMAGES = 4;
const DESCRIPTION_PREVIEW_LENGTH = 180;

/* ---------- HOTEL PRICE ---------- */

function hotelPriceText(hotel, nightCount = nights()) {
  const price = Number(hotel.price);

  if (!Number.isFinite(price) || price <= 0) {
    return "Rate not provided";
  }

  return peso.format(price * nightCount);
}

/* ---------- HOTEL IMAGE HELPERS ---------- */

function hotelImageCount(hotel) {
  return Array.isArray(hotel.images) ? hotel.images.length : 0;
}

function hotelImagePath(hotel, index) {
  const imageUrl = hotel.images?.[index - 1]?.url ?? "";
  if (!imageUrl.startsWith("/") || imageUrl.startsWith("//")) {
    return imageUrl;
  }

  const siteRoot = new URL(".", document.baseURI);
  return new URL(imageUrl.slice(1), siteRoot).href;
}

function hotelImageAlt(hotel, index) {
  return hotel.images?.[index - 1]?.alt ||
    `${hotel.name} - photo ${index}`;
}

/* ---------- MAIN ELEMENTS ---------- */

const feed = document.getElementById("results-feed");
const title = document.getElementById("results-title");
const publicHome = document.getElementById("public-home");
const hotelApp = document.getElementById("hotel-app");
const homeNavToggle = document.getElementById("home-nav-toggle");
const homeNavigationLinks = document.getElementById("home-navigation-links");
const sidebar = document.getElementById("site-sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const mobileSidebarToggle = document.getElementById("mobile-sidebar-toggle");
const sidebarClose = document.getElementById("sidebar-close");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");

const checkboxes = document.querySelectorAll(
  'input[name="town"]'
);

let hotels = [];
let signedInAccount = null;
let reservationHistoryLoading = false;
let reservationHistoryRefreshTimer = null;
let appliedCheckIn = "";
let appliedCheckOut = "";
let hotelViewLoaded = false;
let promotionSchedule = { campaigns: [], events: [] };
let couponWallet = [];
let activePromotionIndex = 0;
let promotionTimer = null;
let preferredCouponId = "";
let bookingRequestId = "";
let helpHistory = [];
let helpSending = false;
let selectedHelpHotelId = null;
let pendingSpinReward = null;
let pendingSpinRewardOwner = null;
let spinInProgress = false;

function readStorageJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Unable to read storage:", key, error);
    return fallback;
  }
}

function writeStorageJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Unable to write storage:", key, error);
  }
}

function getCurrentAccountStorageKey(prefix) {
  const email = (signedInAccount?.email || "guest").trim().toLowerCase();
  return `${prefix}:${email}`;
}

function calculateCebuPointsFromAmount(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < 5000) return 0;
  return 5 + Math.max(0, Math.floor((value - 5000) / 1000));
}

function getCebuPointsEntries() {
  const entries = readStorageJson(getCurrentAccountStorageKey("cebu-points-ledger"), []);
  return Array.isArray(entries) ? entries : [];
}

function setCebuPointsEntries(entries) {
  writeStorageJson(getCurrentAccountStorageKey("cebu-points-ledger"), entries);
}

function getCebuPointsBalance() {
  return getCebuPointsEntries().reduce((total, entry) => total + Number(entry.points || 0), 0);
}

function getLocalRewardWallet() {
  const rewards = readStorageJson(getCurrentAccountStorageKey("cebu-reward-wallet"), []);
  return Array.isArray(rewards) ? rewards : [];
}

function setLocalRewardWallet(rewards) {
  writeStorageJson(getCurrentAccountStorageKey("cebu-reward-wallet"), rewards);
}

function getLocalRewardHistory() {
  const history = readStorageJson(getCurrentAccountStorageKey("cebu-reward-history"), []);
  return Array.isArray(history) ? history : [];
}

function setLocalRewardHistory(history) {
  writeStorageJson(getCurrentAccountStorageKey("cebu-reward-history"), history);
}

function getRewardCatalog() {
  const savedCatalog = readStorageJson("cebu-reward-catalog", null);
  const catalog = new Map(
    (Array.isArray(savedCatalog) ? savedCatalog : [])
      .filter(reward => reward?.rewardType !== "grand" && reward?.id !== "grand-prize")
      .map(reward => [reward.id, reward])
  );
  DEFAULT_REWARD_CATALOG.forEach(reward => catalog.set(reward.id, reward));
  return [...catalog.values()];
}

function writeRewardCatalog(catalog) {
  writeStorageJson("cebu-reward-catalog", catalog);
}

function renderCebuPointsSummary() {
  const balanceEl = document.getElementById("cebu-points-balance");
  const historyEl = document.getElementById("cebu-points-history");
  if (!balanceEl || !historyEl) return;

  const entries = getCebuPointsEntries();
  const balance = entries.reduce((total, entry) => total + Number(entry.points || 0), 0);
  balanceEl.textContent = `${balance} pts`;

  const items = entries.length ? [...entries].slice(-8).reverse() : [];
  if (!items.length) {
    historyEl.innerHTML = '<p class="coupon-empty">You have not earned any points yet.</p>';
    return;
  }

  historyEl.innerHTML = items.map(entry => {
    const positive = Number(entry.points || 0) >= 0;
    const label = entry.label || entry.reference || "Reward activity";
    const date = new Date(entry.date || Date.now()).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    return `
      <article class="points-entry">
        <div>
          <strong>${label}</strong>
          <small>${date}</small>
        </div>
        <span class="points-value ${positive ? "positive" : "negative"}">${positive ? "+" : "-"}${Math.abs(Number(entry.points || 0))} pts</span>
      </article>
    `;
  }).join("");
}

function openCebuPointsDialog() {
  if (!signedInAccount) {
    setAccountView("login");
    accountDialog.showModal();
    return;
  }
  renderCebuPointsSummary();
  document.getElementById("cebu-points-dialog")?.showModal();
}

function mergeRewardWalletIntoCouponWallet(apiCoupons) {
  const rewards = getLocalRewardWallet();
  const mappedRewards = rewards.map(reward => ({
    id: reward.id,
    code: reward.code || "CB-REWARD",
    name: reward.title,
    status: reward.status || "available",
    discountType: reward.monetaryValue ? "fixed" : "reward",
    discountValue: Number(reward.monetaryValue || 0),
    rewardType: reward.rewardType,
    description: reward.description,
    minimumSubtotal: 0,
    expiresAt: reward.expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    eligibleHotelName: reward.shopName || "CebuStays rewards"
  }));
  return [...(Array.isArray(apiCoupons) ? apiCoupons : []), ...mappedRewards];
}

function recordPointEntry(label, points, reference) {
  const entries = getCebuPointsEntries();
  entries.push({
    id: reference || `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    points,
    reference: reference || label,
    date: new Date().toISOString()
  });
  setCebuPointsEntries(entries);
}

function recordPaidBookingPoints(booking) {
  if (!signedInAccount || !booking || String(booking.paymentStatus || "").toLowerCase() !== "paid") {
    return false;
  }

  const reference = String(booking.reference || `booking-${Date.now()}`).trim();
  const amount = Number(booking.totalPrice || booking.total || booking.amount || 0);
  const points = calculateCebuPointsFromAmount(amount);
  if (!points) return false;

  const entries = getCebuPointsEntries();
  const normalizedReference = reference.toLowerCase();
  if (entries.some(entry => String(entry.reference || "").toLowerCase() === normalizedReference)) {
    return false;
  }

  entries.push({
    id: `booking-${reference || Date.now()}`,
    label: `${booking.hotelName || "Hotel booking"} payment`,
    points,
    reference,
    date: booking.paidAt || booking.createdAt || new Date().toISOString()
  });
  setCebuPointsEntries(entries);
  renderCebuPointsSummary();
  return true;
}

async function syncCebuPointsFromPaidBookings(bookings = []) {
  if (!signedInAccount || !Array.isArray(bookings)) {
    return false;
  }

  const entries = getCebuPointsEntries();
  const existingReferences = new Set(
    entries
      .filter(entry => entry.reference)
      .map(entry => String(entry.reference).trim().toLowerCase())
  );

  let changed = false;
  bookings.forEach(booking => {
    const paymentStatus = String(booking.paymentStatus || "").toLowerCase();
    if (paymentStatus !== "paid") return;

    const reference = String(booking.reference || "").trim();
    if (!reference || existingReferences.has(reference.toLowerCase())) return;

    const amount = Number(booking.totalPrice || booking.total || booking.amount || 0);
    const points = calculateCebuPointsFromAmount(amount);
    if (!points) return;

    entries.push({
      id: `booking-${reference || Date.now()}`,
      label: `${booking.hotelName || "Hotel booking"} payment`,
      points,
      reference,
      date: booking.paidAt || booking.createdAt || new Date().toISOString()
    });
    existingReferences.add(reference.toLowerCase());
    changed = true;
  });

  if (!changed) {
    return false;
  }

  setCebuPointsEntries(entries);
  renderCebuPointsSummary();
  return true;
}

function renderRewardCatalog() {
  const list = document.getElementById("reward-catalog-list");
  const tabs = document.getElementById("reward-catalog-tabs");
  if (!list || !tabs) return;

  const categories = ["all", "coupon", "freebies", "package", "service"];
  const categoryLabels = {
    all: "All rewards",
    coupon: "Coupon reward",
    freebies: "Freebies reward",
    package: "Package reward",
    service: "Service reward"
  };
  const catalog = getRewardCatalog();
  const currentTab = tabs.dataset.activeCategory || "all";
  const balance = getCebuPointsBalance();

  tabs.replaceChildren(...categories.map(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `reward-category-tab${currentTab === category ? " is-active" : ""}`;
    button.textContent = categoryLabels[category];
    button.addEventListener("click", () => {
      tabs.dataset.activeCategory = category;
      renderRewardCatalog();
    });
    return button;
  }));

  const filtered = catalog.filter(reward => currentTab === "all" || reward.category === currentTab);
  list.replaceChildren(...filtered.map(reward => {
    const enough = balance >= Number(reward.points || 0);
    const card = el("article", "reward-card");
    const header = el("div", "reward-card-header");
    const title = el("h4", "", reward.title);
    const type = el("span", "reward-type", reward.category || "reward");
    const description = el("p", "reward-description", reward.description);
    const points = el("strong", "reward-points", `${Number(reward.points || 0)} pts`);
    const value = el(
      "small",
      "reward-value",
      reward.monetaryValue ? `₱${Number(reward.monetaryValue).toLocaleString("en-PH")} value` : "Package reward"
    );
    const action = el(
      "button",
      `btn ${enough ? "btn-primary" : "btn-ghost"}`,
      enough ? "Redeem reward" : "Need more points"
    );
    action.type = "button";
    action.disabled = !enough;
    action.addEventListener("click", () => redeemRewardCatalogReward(reward));
    header.append(title, type);
    card.append(header, description, points, value, action);
    return card;
  }));
}

function openRewardCatalog() {
  if (!signedInAccount) {
    setAccountView("login");
    accountDialog.showModal();
    return;
  }
  const tabs = document.getElementById("reward-catalog-tabs");
  if (tabs && !tabs.dataset.activeCategory) tabs.dataset.activeCategory = "all";
  renderRewardCatalog();
  document.getElementById("reward-catalog-dialog")?.showModal();
}

function redeemRewardCatalogReward(reward) {
  if (!signedInAccount) {
    setAccountView("login");
    accountDialog.showModal();
    return;
  }

  const balance = getCebuPointsBalance();
  const pointCost = Number(reward.points);
  if (!Number.isFinite(pointCost) || pointCost <= 0 || pointCost > balance) {
    const message = document.getElementById("coupon-wallet-message");
    if (message) message.textContent = pointCost > balance
      ? "You do not have enough points for this reward yet."
      : "This reward cannot be redeemed from the catalog.";
    return;
  }

  const wallet = getLocalRewardWallet();
  const rewardCode = `${reward.code || reward.title.toUpperCase().replace(/\s+/g, "-")}-${Date.now().toString().slice(-6)}`;
  wallet.push({
    id: `${reward.id}-${Date.now()}`,
    title: reward.title,
    code: rewardCode,
    status: "available",
    points: reward.points,
    rewardType: reward.rewardType,
    category: reward.category,
    description: reward.description,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
    monetaryValue: Number(reward.monetaryValue || 0),
    createdAt: new Date().toISOString()
  });
  setLocalRewardWallet(wallet);

  const entries = getCebuPointsEntries();
  entries.push({
    id: `reward-${Date.now()}`,
    label: `Redeemed ${reward.title}`,
    points: -Number(reward.points || 0),
    reference: `reward-${reward.id}`,
    date: new Date().toISOString()
  });
  setCebuPointsEntries(entries);

  renderCebuPointsSummary();
  renderRewardCatalog();
  refreshCouponWallet().catch(() => {});
  document.getElementById("coupon-wallet-dialog")?.showModal();
}

function secureRandomInt(maxExclusive) {
  const crypto = window.crypto;
  if (!crypto?.getRandomValues || !Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("Secure random selection is unavailable. Please try again later.");
  }

  const range = 0x100000000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return value[0] % maxExclusive;
}

function playWheelOutcomeSound(context, kind) {
  const notes = kind === "tryAgain"
    ? [{ frequency: 392, offset: 0, duration: 0.16 }, { frequency: 294, offset: 0.19, duration: 0.24 }]
    : [
        { frequency: 523, offset: 0, duration: 0.2 },
        { frequency: 659, offset: 0.13, duration: 0.2 },
        { frequency: 784, offset: 0.26, duration: 0.2 },
        { frequency: 1047, offset: 0.39, duration: 0.34 }
      ];
  const startAt = context.currentTime + 0.03;

  notes.forEach((note, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + note.offset;
    oscillator.type = kind === "tryAgain" ? "sine" : "triangle";
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.035, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + note.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    if (index === notes.length - 1) {
      oscillator.onended = () => context.close();
    }
    oscillator.start(noteStart);
    oscillator.stop(noteStart + note.duration + 0.02);
  });
}

function spinWheel() {
  if (spinInProgress) return;
  if (pendingSpinReward) {
    claimSpinReward();
    return;
  }

  if (!signedInAccount) {
    setAccountView("login");
    accountDialog.showModal();
    return;
  }

  const pointsBalance = getCebuPointsBalance();
  if (pointsBalance < 1) {
    const result = document.getElementById("spin-result");
    if (result) {
      result.textContent = `You need 1 Cebu Point to spin. Your balance is ${pointsBalance} pts. Earn points from paid hotel bookings.`;
    }
    return;
  }

  const wheel = document.getElementById("spin-wheel");
  const result = document.getElementById("spin-result");
  const spinButton = document.getElementById("spin-button");
  if (!wheel || !result) return;

  let winner;
  try {
    winner = selectWheelReward(secureRandomInt(SPIN_WHEEL_TOTAL_WEIGHT));
  } catch (error) {
    result.textContent = error.message;
    return;
  }
  if (spinButton) spinButton.disabled = true;
  spinInProgress = true;
  pendingSpinReward = winner;
  pendingSpinRewardOwner = signedInAccount.id;

  const entries = getCebuPointsEntries();
  const spinId = `spin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  entries.push({
    id: spinId,
    label: "Spin the wheel",
    points: -1,
    reference: spinId,
    date: new Date().toISOString()
  });
  setCebuPointsEntries(entries);
  renderCebuPointsSummary();
  const spinCost = document.querySelector(".spin-cost");
  if (spinCost) spinCost.textContent = `1 Cebu Point per spin · Balance: ${getCebuPointsBalance()} pts`;

  const winnerIndex = SPIN_WHEEL_REWARDS.findIndex(item => item.id === winner.id);
  const winnerStart = SPIN_WHEEL_REWARDS
    .slice(0, winnerIndex)
    .reduce((angle, item) => angle + item.weight / SPIN_WHEEL_TOTAL_WEIGHT * 360, 0);
  const winnerSize = winner.weight / SPIN_WHEEL_TOTAL_WEIGHT * 360;
  const targetAngle = (360 - winnerStart - winnerSize / 2 + 360) % 360;
  const currentRotation = Number(wheel.dataset.rotation || 0);
  const currentAngle = currentRotation % 360;
  const rotationDelta = 360 * 7 + (targetAngle - currentAngle + 360) % 360;
  const nextRotation = currentRotation + rotationDelta;
  wheel.style.background = buildWheelGradient();
  wheel.dataset.rotation = String(nextRotation);

  result.textContent = "Spinning… good luck!";
  const audioCtx = window.AudioContext || window.webkitAudioContext;
  let outcomeAudioContext = null;
  if (audioCtx) {
    try {
      outcomeAudioContext = new audioCtx();
      const resume = outcomeAudioContext.resume?.();
      resume?.catch(error => console.warn("The spin sound could not be enabled.", error));
    } catch (error) {
      console.warn("The spin sound could not be played.", error);
    }
  }

  let spinFinished = false;
  let fallbackTimer;
  const finishSpin = () => {
    if (spinFinished) return;
    spinFinished = true;
    window.clearTimeout(fallbackTimer);
    wheel.style.transform = `rotate(${nextRotation}deg)`;
    if (outcomeAudioContext) {
      try {
        playWheelOutcomeSound(outcomeAudioContext, winner.kind);
      } catch (error) {
        console.warn("The spin result sound could not be played.", error);
        outcomeAudioContext.close();
      }
    }
    result.textContent = winner.kind === "tryAgain"
      ? "Try again — your next spin could land on a reward."
      : `${winner.title} is yours! Claim it to add it to My coupons.`;
    spinInProgress = false;
    if (winner.kind === "tryAgain") {
      pendingSpinReward = null;
      pendingSpinRewardOwner = null;
    }
    if (spinButton) {
      spinButton.disabled = false;
      spinButton.textContent = winner.kind === "tryAgain" ? "Spin again" : "Claim it";
    }
  };

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const duration = prefersReducedMotion ? 1800 : 4200;
  let animationStarted = false;
  if (typeof wheel.animate === "function") {
    try {
      const animation = wheel.animate(
        [
          { transform: `rotate(${currentRotation}deg)` },
          { transform: `rotate(${nextRotation}deg)` }
        ],
        { duration, easing: "cubic-bezier(0.15, 0.8, 0.12, 1)", fill: "forwards" }
      );
      animation.onfinish = () => {
        finishSpin();
        animation.cancel();
      };
      animationStarted = true;
    } catch (error) {
      console.warn("The wheel animation API failed; using the CSS animation fallback.", error);
    }
  }
  if (!animationStarted) {
    wheel.style.transition = "none";
    wheel.style.transform = `rotate(${currentRotation}deg)`;
    void wheel.offsetWidth;
    window.requestAnimationFrame(() => {
      wheel.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.8, 0.12, 1)`;
      wheel.style.transform = `rotate(${nextRotation}deg)`;
    });
  }
  fallbackTimer = window.setTimeout(finishSpin, duration + 250);
}

function initializeSpinButton() {
  document.addEventListener("click", event => {
    const button = event.target.closest?.("#spin-button");
    if (!button) return;
    event.preventDefault();
    spinWheel();
  }, true);
}

function flyRewardToCoupons(reward, source, target) {
  if (!source || !target) return Promise.resolve();

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const flight = document.createElement("div");
  flight.className = "reward-flight-item";
  flight.setAttribute("aria-hidden", "true");
  flight.textContent = "★";
  flight.title = reward.title;
  flight.style.left = `${sourceRect.left + sourceRect.width / 2}px`;
  flight.style.top = `${sourceRect.top + sourceRect.height / 2}px`;
  flight.style.setProperty("--dx", `${targetRect.left + targetRect.width / 2 - sourceRect.left - sourceRect.width / 2}px`);
  flight.style.setProperty("--dy", `${targetRect.top + targetRect.height / 2 - sourceRect.top - sourceRect.height / 2}px`);

  return new Promise(resolve => {
    flight.addEventListener("animationend", () => {
      flight.remove();
      resolve();
    }, { once: true });
    document.body.appendChild(flight);
    window.setTimeout(() => {
      flight.remove();
      resolve();
    }, 1700);
  });
}

async function claimSpinReward() {
  if (
    !pendingSpinReward ||
    pendingSpinReward.kind === "tryAgain" ||
    pendingSpinRewardOwner !== signedInAccount?.id
  ) {
    const result = document.getElementById("spin-result");
    if (result) result.textContent = "No reward to claim yet.";
    pendingSpinReward = null;
    pendingSpinRewardOwner = null;
    return;
  }

  const reward = pendingSpinReward.reward || pendingSpinReward;
  const wallet = getLocalRewardWallet();
  const rewardCode = `${reward.code || reward.title.toUpperCase().replace(/\s+/g, "-")}-${Date.now().toString().slice(-6)}`;
  const rewardEntry = {
    id: `spin-reward-${Date.now()}`,
    title: reward.title,
    code: rewardCode,
    status: "available",
    points: reward.points || 0,
    rewardType: reward.rewardType || "coupon",
    category: reward.category || "coupon",
    description: reward.description || "Claimed from the spin wheel.",
    monetaryValue: Number(reward.monetaryValue || 0),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    createdAt: new Date().toISOString(),
    source: "spin-wheel"
  };
  wallet.push(rewardEntry);
  setLocalRewardWallet(wallet);

  const history = getLocalRewardHistory();
  history.push({ ...rewardEntry, claimedAt: new Date().toISOString() });
  setLocalRewardHistory(history);

  const spinDialog = document.getElementById("spin-wheel-dialog");
  const spinButton = document.getElementById("spin-button");
  const couponButton = document.getElementById("sidebar-coupons");
  if (spinButton) {
    spinButton.disabled = true;
    spinButton.textContent = "Claiming…";
  }
  pendingSpinReward = null;
  pendingSpinRewardOwner = null;
  renderCebuPointsSummary();
  await refreshCouponWallet();

  const result = document.getElementById("spin-result");
  if (result) result.textContent = `${reward.title} has been added to My coupons.`;
  const flight = flyRewardToCoupons(reward, spinButton, couponButton);
  if (spinButton) {
    spinButton.disabled = false;
    spinButton.textContent = "Spin now";
  }

  spinDialog?.close();
  await flight;

  const couponDialog = document.getElementById("coupon-wallet-dialog");
  if (couponDialog) {
    couponDialog.showModal();
    const message = document.getElementById("coupon-wallet-message");
    if (message) message.textContent = `${reward.title} is now in your My coupons.`;
  }
}

function initializeRewardsSystem() {
  const spinWheel = document.getElementById("spin-wheel");
  if (spinWheel) {
    spinWheel.style.background = buildWheelGradient();
  }

  document.getElementById("sidebar-points")?.addEventListener("click", openCebuPointsDialog);
  document.getElementById("sidebar-rewards")?.addEventListener("click", openRewardCatalog);
  document.getElementById("sidebar-spin-wheel")?.addEventListener("click", () => {
    const dialog = document.getElementById("spin-wheel-dialog");
    if (dialog) dialog.showModal();
    const spinCost = document.querySelector(".spin-cost");
    if (spinCost) spinCost.textContent = `1 Cebu Point per spin · Balance: ${getCebuPointsBalance()} pts`;
    const result = document.getElementById("spin-result");
    if (result) {
      result.textContent = pendingSpinReward
        ? `${pendingSpinReward.title} is yours! Claim it to add it to My coupons.`
        : "Ready to spin";
    }
    const spinButton = document.getElementById("spin-button");
    if (spinButton) {
      spinButton.disabled = spinInProgress;
      spinButton.textContent = pendingSpinReward
        ? "Claim it"
        : spinInProgress ? "Spinning…" : "Spin now";
    }
    if (!pendingSpinReward && !spinInProgress && result) {
      result.textContent = getCebuPointsBalance() < 1
        ? `You need 1 Cebu Point to spin. Your balance is ${getCebuPointsBalance()} pts. Earn points from paid hotel bookings.`
        : "Ready to spin";
    }
  });
  document.getElementById("cebu-points-reward-button")?.addEventListener("click", openRewardCatalog);

  if (DEFAULT_REWARD_CATALOG.length) {
    const currentData = getRewardCatalog();
    writeRewardCatalog(currentData.length ? currentData : DEFAULT_REWARD_CATALOG);
  }
  renderRewardCatalog();
  renderCebuPointsSummary();
}

const accountDialog = document.getElementById("account-dialog");
const accountMessage = document.getElementById("account-message");
const accountEntry = document.getElementById("account-entry");
const signedInPanel = document.getElementById("account-signed-in");

function getCurrentView() {
  return new URLSearchParams(window.location.search).get("view") === "hotels" ? "hotels" : "home";
}

function syncPageLinks(activeView) {
  document.querySelectorAll("[data-page-link]").forEach(link => {
    const isActive = link.dataset.pageLink === activeView;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function applyCurrentView(view = getCurrentView()) {
  const isHome = view === "home";
  document.body.classList.toggle("home-view", isHome);
  if (publicHome) publicHome.hidden = !isHome;
  if (hotelApp) hotelApp.hidden = isHome;
  syncPageLinks(view);

  if (!hotelViewLoaded) {
    hotelViewLoaded = true;
    loadHotels();
  }
}

function setAccountView(view) {
  document.querySelectorAll("[data-account-view]").forEach(tab => {
    const selected = tab.dataset.accountView === view;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  document.querySelectorAll("[data-account-form]").forEach(form => {
    form.hidden = form.dataset.accountForm !== view;
  });

  accountMessage.textContent = "";
}

function updateAccountDisplay(user) {
  const previousAccountId = signedInAccount?.id;
  signedInAccount = user;
  if (pendingSpinRewardOwner && pendingSpinRewardOwner !== user?.id) {
    pendingSpinReward = null;
    pendingSpinRewardOwner = null;
  }
  const isSignedIn = Boolean(user);
  if (isSignedIn && getCurrentView() === "home") {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("view", "hotels");
    window.history.replaceState({}, "", nextUrl);
    applyCurrentView("hotels");
  }

  const developerProjectLink = document.getElementById("developer-project-link");
  const sidebarGuestActions = document.getElementById("sidebar-guest-actions");
  const sidebarUserActions = document.getElementById("sidebar-user-actions");
  const sidebarUserName = document.getElementById("sidebar-user-name");
  const sidebarUserRole = document.getElementById("sidebar-user-role");
  const sidebarAvatar = document.getElementById("sidebar-avatar");

  if (accountEntry) accountEntry.hidden = isSignedIn;
  if (signedInPanel) signedInPanel.hidden = !isSignedIn;
  if (sidebarGuestActions) sidebarGuestActions.hidden = isSignedIn;
  if (sidebarUserActions) sidebarUserActions.hidden = !isSignedIn;
  if (developerProjectLink) developerProjectLink.hidden = user?.role !== "developer";
  const bookingForm = document.getElementById("booking-form");
  const bookingSignIn = document.getElementById("booking-sign-in");
  if (bookingSignIn) bookingSignIn.hidden = isSignedIn;
  if (!isSignedIn && bookingForm) {
    bookingForm.hidden = true;
    bookingForm.elements.namedItem("guestName").value = "";
    bookingForm.elements.namedItem("guestEmail").value = "";
  }

  if (isSignedIn) {
    if (previousAccountId && previousAccountId !== user.id) {
      couponWallet = [];
      renderCouponWallet();
      updateCouponCount();
    }
    const displayName = user.displayName || user.email.split("@", 1)[0];
    const safeName = displayName.charAt(0).toLocaleUpperCase() + displayName.slice(1);
    const roleLabel = user.role === "developer" ? "Developer account" : "Standard account";

    if (sidebarUserName) sidebarUserName.textContent = safeName;
    if (sidebarUserRole) sidebarUserRole.textContent = roleLabel;
    if (sidebarAvatar) sidebarAvatar.textContent = safeName.slice(0, 1).toLocaleUpperCase();

    const accountGreetingName = document.getElementById("account-greeting-name");
    const accountEmail = document.getElementById("account-email");
    const accountRole = document.getElementById("account-role");

    if (accountGreetingName) accountGreetingName.textContent = safeName;
    if (accountEmail) accountEmail.textContent = user.email;
    if (accountRole) accountRole.textContent = roleLabel;
    refreshCouponWallet().catch(error => {
      const walletMessage = document.getElementById("coupon-wallet-message");
      if (walletMessage && document.getElementById("coupon-wallet-dialog")?.open) {
        walletMessage.textContent = error.message;
      }
      console.warn("Unable to refresh the coupon wallet.", error);
    });
    requestApi("/api/bookings/mine")
      .then(data => syncCebuPointsFromPaidBookings(Array.isArray(data.reservations) ? data.reservations : []))
      .catch(() => {});
  } else {
    couponWallet = [];
    renderCouponWallet();
    updateCouponCount();
    if (sidebarUserName) sidebarUserName.textContent = "Guest";
    if (sidebarUserRole) sidebarUserRole.textContent = "Explore mode";
    if (sidebarAvatar) sidebarAvatar.textContent = "G";
    setAccountView("login");
  }
}

async function requestApi(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The account request could not be completed.");
  }

  return data;
}

async function requestAccountApi(path, options = {}) {
  return requestApi(`/api/auth${path}`, options);
}

function updateCouponCount() {
  const badge = document.getElementById("sidebar-coupon-count");
  if (!badge) return;
  const available = couponWallet.filter(coupon => coupon.status === "available").length;
  badge.textContent = String(available);
  badge.hidden = available === 0;
  const button = document.getElementById("sidebar-coupons");
  if (button) button.setAttribute("aria-label", `My coupons, ${available} available`);
}

function couponDiscountText(coupon) {
  if (coupon.rewardType === "grand") return "1-week free vacation";
  if (coupon.discountType === "reward") return "Special reward";
  return coupon.discountType === "percentage"
    ? `${coupon.discountValue}% off${coupon.maxDiscount ? `, up to ${peso.format(coupon.maxDiscount)}` : ""}`
    : `${peso.format(coupon.discountValue)} off`;
}

function renderCouponGroup(containerId, coupons, emptyText, used = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();
  if (coupons.length === 0) {
    container.append(el("p", "coupon-empty", emptyText));
    return;
  }

  coupons.forEach(coupon => {
    const card = el("article", `coupon-card${used ? " is-used" : ""}`);
    const title = el("h4", "", coupon.name);
    const discount = el("p", "coupon-discount", couponDiscountText(coupon));
    const minimum = el("p", "coupon-rule", `Minimum eligible room subtotal: ${peso.format(coupon.minimumSubtotal)}.`);
    const restriction = el(
      "p",
      "coupon-rule",
      coupon.eligibleHotelName
        ? `Valid only at ${coupon.eligibleHotelName}.`
        : "Eligible at participating CebuStays properties."
    );
    const expiry = el(
      "p",
      "coupon-expiry",
      used
        ? `Used ${formatCouponDate(coupon.redeemedAt)}`
        : coupon.status === "held"
          ? `Hold expires ${formatCouponDate(coupon.holdExpiresAt, true)}`
          : `Expires ${formatCouponDate(coupon.expiresAt)}`
    );
    const code = el("code", "coupon-code", coupon.code);
    const codeRow = el("div", "coupon-code-row");
    codeRow.append(code);

    if (!used && coupon.status === "available") {
      if (coupon.description) {
        card.append(el("p", "coupon-rule", coupon.description));
      }
      const copyButton = el("button", "btn btn-ghost coupon-copy", "Copy code");
      copyButton.type = "button";
      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(coupon.code);
          copyButton.textContent = "Copied";
        } catch {
          copyButton.textContent = "Copy unavailable";
        }
      });
      codeRow.append(copyButton);
    }
    card.append(title, discount, minimum, restriction, expiry, codeRow);

    if (used && coupon.redemption) {
      card.append(
        el(
          "p",
          "coupon-redemption",
          `${peso.format(coupon.redemption.discountAmount)} discount on reservation ${coupon.redemption.reservationReference || "recorded"}.`
        )
      );
    } else if (coupon.status === "held") {
      card.append(
        el(
          "p",
          "coupon-redemption",
          `Temporarily held for reservation ${coupon.heldReservationReference || "pending confirmation"}. The coupon will be released if the reservation expires without confirmation.`
        )
      );
    } else if (!used && coupon.status === "available") {
      const useButton = el("button", "btn btn-primary coupon-use", "Use coupon");
      useButton.type = "button";
      useButton.addEventListener("click", async () => {
        const walletDialog = document.getElementById("coupon-wallet-dialog");
        walletDialog.close();
        if (!hotelViewLoaded) {
          await loadHotels();
          hotelViewLoaded = true;
        }
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("view", "hotels");
        window.history.pushState({}, "", nextUrl);
        applyCurrentView("hotels");
        if (coupon.eligibleHotelId) {
          const hotel = hotels.find(item => item.id === coupon.eligibleHotelId);
          if (hotel) {
            preferredCouponId = coupon.id;
            openHotelDetails(hotel);
          }
        } else {
          preferredCouponId = coupon.id;
        }
      });
      card.append(useButton);
    }
    container.append(card);
  });
}

function formatCouponDate(value, withTime = false) {
  if (!value) return "date unavailable";
  return new Date(value).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {})
  });
}

function renderCouponWallet() {
  renderCouponGroup(
    "available-coupons",
    couponWallet.filter(coupon => coupon.status === "available"),
    "No available coupons right now."
  );
  renderCouponGroup(
    "held-coupons",
    couponWallet.filter(coupon => coupon.status === "held"),
    "No coupons are currently held for a reservation."
  );
  renderCouponGroup(
    "used-coupons",
    couponWallet.filter(coupon => coupon.status === "redeemed"),
    "You have not used a coupon yet.",
    true
  );
  renderCouponGroup(
    "expired-coupons",
    couponWallet.filter(coupon => coupon.status === "expired"),
    "No expired coupons."
  );
}

async function refreshCouponWallet() {
  if (!signedInAccount) return [];
  try {
    const data = await requestApi("/api/coupons/mine");
    if (!Array.isArray(data.coupons)) {
      throw new Error("The coupon wallet returned an invalid response.");
    }
    couponWallet = mergeRewardWalletIntoCouponWallet(data.coupons);
  } catch (error) {
    couponWallet = mergeRewardWalletIntoCouponWallet([]);
    console.warn("Unable to refresh remote coupon wallet. Using local wallet entries.", error);
  }
  renderCouponWallet();
  updateCouponCount();
  return couponWallet;
}

function showCouponWallet() {
  if (!signedInAccount) {
    setAccountView("login");
    accountDialog.showModal();
    return;
  }
  const message = document.getElementById("coupon-wallet-message");
  message.textContent = "Loading your coupons…";
  document.getElementById("coupon-wallet-dialog").showModal();
  refreshCouponWallet()
    .then(() => {
      message.textContent = couponWallet.length
        ? `${couponWallet.length} coupon${couponWallet.length === 1 ? "" : "s"} in your wallet.`
        : "Your personal coupon wallet is empty.";
    })
    .catch(error => {
      message.textContent = error.message;
    });
}

async function submitAccountForm(event, endpoint) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button[type=submit]");
  const values = Object.fromEntries(new FormData(form));

  submit.disabled = true;
  accountMessage.textContent = "";

  try {
    const data = await requestAccountApi(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    form.reset();
    updateAccountDisplay(data.user);
    if (data.user && endpoint !== "/register") accountDialog.close();
    if (data.user?.role === "developer") {
      window.location.assign("developer.html");
      return;
    }
    accountMessage.textContent = data.welcomeCouponAwarded
      ? "Welcome to CebuStays! Your new-account coupon is now available in My Coupons."
      : "You're signed in.";
  } catch (error) {
    accountMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

function initializeAccount() {
  document.querySelectorAll("[data-account-open]").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.accountViewTarget || "login";
      setAccountView(target);
      accountDialog.showModal();
    });
  });

  const accountCloseButton = document.getElementById("account-close");
  if (accountCloseButton) {
    accountCloseButton.addEventListener("click", () => accountDialog.close());
  }

  document.querySelectorAll("[data-dialog-close]").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });

  if (accountDialog) {
    accountDialog.addEventListener("click", event => {
      if (event.target === accountDialog) accountDialog.close();
    });
  }

  document.querySelectorAll("[data-account-view]").forEach(tab => {
    tab.addEventListener("click", () => setAccountView(tab.dataset.accountView));
  });

  const loginForm = document.getElementById("account-form-login");
  const registerForm = document.getElementById("account-form-register");
  const developerForm = document.getElementById("account-form-developer");

  if (loginForm) {
    loginForm.addEventListener("submit", event => submitAccountForm(event, "/login"));
  }

  if (registerForm) {
    registerForm.addEventListener("submit", event => submitAccountForm(event, "/register"));
  }

  if (developerForm) {
    developerForm.addEventListener("submit", event =>
      submitAccountForm(event, "/developer/register")
    );
  }

  const logoutButton = document.getElementById("account-logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      const button = logoutButton;
      button.disabled = true;
      try {
        await requestAccountApi("/logout", { method: "POST" });
        updateAccountDisplay(null);
        accountMessage.textContent = "You have signed out. Sign in again to access your account.";
        const loginField = document.querySelector('#account-form-login input[name="email"]');
        if (loginField) loginField.focus();
      } catch (error) {
        accountMessage.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  const sidebarSettingsButton = document.getElementById("sidebar-settings");
  const sidebarReservationsButton = document.getElementById("sidebar-reservations");
  const sidebarLogoutButton = document.getElementById("sidebar-logout");

  if (sidebarSettingsButton) {
    sidebarSettingsButton.addEventListener("click", () => {
      const settingsDialog = document.getElementById("account-settings-dialog");
      if (!settingsDialog) return;
      const nameField = document.getElementById("profile-display-name");
      const emailField = document.getElementById("profile-email");
      if (nameField) {
        nameField.value = signedInAccount?.displayName || signedInAccount?.email.split("@", 1)[0] || "";
      }
      if (emailField) {
        emailField.value = signedInAccount?.email || "";
      }
      const profileMessage = document.getElementById("profile-message");
      if (profileMessage) profileMessage.textContent = "";
      settingsDialog.showModal();
    });
  }

  if (sidebarReservationsButton) {
    sidebarReservationsButton.addEventListener("click", () => {
      const reservationsDialog = document.getElementById("reservation-history-dialog");
      if (!reservationsDialog) return;
      reservationsDialog.showModal();
      startReservationHistoryRefresh();
      loadReservationHistory();
    });
  }

  document.getElementById("sidebar-coupons")?.addEventListener("click", showCouponWallet);
  document.getElementById("sidebar-events")?.addEventListener("click", () => {
    document.getElementById("events-dialog").showModal();
  });

  if (sidebarLogoutButton) {
    sidebarLogoutButton.addEventListener("click", async () => {
      sidebarLogoutButton.disabled = true;
      try {
        await requestAccountApi("/logout", { method: "POST" });
        updateAccountDisplay(null);
      } catch (error) {
        if (accountMessage) accountMessage.textContent = error.message;
      } finally {
        sidebarLogoutButton.disabled = false;
      }
    });
  }

  requestAccountApi("/me")
    .then(data => updateAccountDisplay(data.user))
    .catch(() => updateAccountDisplay(null));
}

function initializeAccountMenu() {
  const menu = document.getElementById("account-menu");
  if (!menu) return;

  const trigger = document.getElementById("account-menu-trigger");
  const menuPanel = document.getElementById("account-menu-panel");
  const settingsDialog = document.getElementById("account-settings-dialog");
  const reservationsDialog = document.getElementById("reservation-history-dialog");
  if (!trigger || !menuPanel || !settingsDialog || !reservationsDialog) return;

  function closeMenu() {
    menuPanel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", () => {
    const isOpen = !menuPanel.hidden;
    menuPanel.hidden = isOpen;
    trigger.setAttribute("aria-expanded", String(!isOpen));
  });

  document.addEventListener("click", event => {
    if (!menu.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  menu.querySelector('[data-account-action="settings"]')
    .addEventListener("click", () => {
      closeMenu();
      document.getElementById("profile-display-name").value =
        signedInAccount?.displayName || signedInAccount?.email.split("@", 1)[0] || "";
      document.getElementById("profile-email").value = signedInAccount?.email || "";
      document.getElementById("profile-message").textContent = "";
      settingsDialog.showModal();
    });

  menu.querySelector('[data-account-action="reservations"]')
    .addEventListener("click", () => {
      closeMenu();
      reservationsDialog.showModal();
      startReservationHistoryRefresh();
      loadReservationHistory();
    });

  document.getElementById("profile-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = document.getElementById("profile-save");
    const message = document.getElementById("profile-message");
    button.disabled = true;
    message.textContent = "Saving your changes…";

    try {
      const data = await requestAccountApi("/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      updateAccountDisplay(data.user);
      message.textContent = "Your account settings have been saved.";
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("account-menu-logout").addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    closeMenu();
    try {
      await requestAccountApi("/logout", { method: "POST" });
      updateAccountDisplay(null);
    } catch (error) {
      window.alert(error.message);
    } finally {
      button.disabled = false;
    }
  });

  [settingsDialog, reservationsDialog].forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });

  reservationsDialog.addEventListener("close", () => {
    stopReservationHistoryRefresh();
  });
}

function formatReservationDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function startReservationHistoryRefresh() {
  if (reservationHistoryRefreshTimer) {
    window.clearInterval(reservationHistoryRefreshTimer);
  }
  reservationHistoryRefreshTimer = window.setInterval(() => {
    const dialog = document.getElementById("reservation-history-dialog");
    if (dialog?.open) {
      loadReservationHistory();
    }
  }, 15000);
}

function stopReservationHistoryRefresh() {
  if (reservationHistoryRefreshTimer) {
    window.clearInterval(reservationHistoryRefreshTimer);
    reservationHistoryRefreshTimer = null;
  }
}

async function loadReservationHistory() {
  if (reservationHistoryLoading) return;
  reservationHistoryLoading = true;
  const message = document.getElementById("reservation-message");
  const list = document.getElementById("reservation-list");
  list.replaceChildren();
  message.textContent = "Loading reservations…";

  try {
    const data = await requestApi("/api/bookings/mine");
    if (!data.reservations.length) {
      message.textContent = "No reservations yet.";
      return;
    }

    message.textContent = `${data.reservations.length} reservation${data.reservations.length === 1 ? "" : "s"}`;
    await syncCebuPointsFromPaidBookings(data.reservations);
    data.reservations.forEach(reservation => {
      const item = document.createElement("article");
      item.className = "reservation-item";

      const heading = document.createElement("div");
      heading.className = "reservation-item-heading";
      const hotelName = document.createElement("h3");
      hotelName.textContent = reservation.hotelName;
      const status = document.createElement("span");
      const isPaid = reservation.paymentStatus === "paid";
      const isCancellationRequested = reservation.cancellationStatus === "requested";
      status.className = reservation.cancelledAt
        ? "reservation-status is-cancelled"
        : isCancellationRequested
          ? "reservation-status is-cancelled"
          : `reservation-status ${isPaid ? "is-paid" : "is-pending"}`;
      status.textContent = reservation.cancelledAt
        ? "Cancelled"
        : isCancellationRequested
          ? "Cancellation requested"
          : isPaid ? "Paid" : "Pending payment";
      heading.append(hotelName, status);

      const dates = document.createElement("p");
      dates.textContent = `${formatReservationDate(reservation.checkIn)} – ${formatReservationDate(reservation.checkOut)}`;
      const details = document.createElement("p");
      const bedrooms = Number(reservation.bedrooms || 1);
      details.textContent = `${reservation.rooms} room${reservation.rooms === 1 ? "" : "s"} · ${bedrooms} bedroom${bedrooms === 1 ? "" : "s"} · ${peso.format(reservation.totalPrice)}` +
        (reservation.couponDiscount ? ` · Coupon discount ${peso.format(reservation.couponDiscount)}` : "");
      const reference = document.createElement("small");
      reference.textContent = `Confirmation ${reservation.reference}`;

      const actionRow = document.createElement("div");
      actionRow.className = "reservation-item-actions";
      if (!reservation.cancelledAt && reservation.paymentStatus === "pending" && !isCancellationRequested) {
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "btn btn-ghost reservation-cancel";
        cancelButton.textContent = "Request cancellation";
        cancelButton.addEventListener("click", async () => {
          const reason = window.prompt("Please tell us why you want to cancel this reservation.");
          if (!reason || !reason.trim()) {
            window.alert("Please enter a reason before submitting your cancellation request.");
            return;
          }
          try {
            cancelButton.disabled = true;
            cancelButton.textContent = "Submitting…";
            await requestApi(`/api/bookings/${encodeURIComponent(reservation.reference)}/cancel`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: reason.trim() })
            });
            window.alert("Your cancellation request has been submitted and awaits staff approval.");
            await loadReservationHistory();
          } catch (error) {
            window.alert(error.message);
          } finally {
            cancelButton.disabled = false;
            cancelButton.textContent = "Request cancellation";
          }
        });
        actionRow.append(cancelButton);
      }

      if (reservation.cancellationReason && (reservation.cancelledAt || isCancellationRequested)) {
        const reason = document.createElement("small");
        reason.textContent = `Reason: ${reservation.cancellationReason}`;
        reason.className = "reservation-cancel-reason";
        actionRow.append(reason);
      }

      item.append(heading, dates, details, reference, actionRow);
      list.append(item);
    });
  } catch (error) {
    message.textContent = error.message;
  } finally {
    reservationHistoryLoading = false;
  }
}

/* ---------- HOTEL DETAIL MODAL ---------- */

const hotelModal = document.getElementById("hotel-modal");

const detailMainImage = document.getElementById(
  "detail-main-image"
);

const detailThumbnails = document.getElementById(
  "detail-thumbnails"
);

let activeDetailHotel = null;
let activePhotoIndex = 1;
let lastFocusedElement = null;

/* ---------- SHOW SELECTED PHOTO ---------- */

function showDetailPhoto(index) {
  if (!activeDetailHotel) return;

  const totalImages = hotelImageCount(activeDetailHotel);

  activePhotoIndex = Math.max(
    1,
    Math.min(totalImages, index)
  );

  detailMainImage.src = hotelImagePath(
    activeDetailHotel,
    activePhotoIndex
  );

  detailMainImage.alt = hotelImageAlt(
    activeDetailHotel,
    activePhotoIndex
  );

  [...detailThumbnails.children].forEach((button, i) => {
    const isActive = i + 1 === activePhotoIndex;

    button.classList.toggle("active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

/* ---------- OPEN HOTEL DETAILS ---------- */

function openHotelDetails(hotel, photoIndex = 1) {
  activeDetailHotel = hotel;
  bookingRequestId = newBookingRequestId();
  lastFocusedElement = document.activeElement;
  const bookingForm = document.getElementById("booking-form");
  bookingForm.reset();
  bookingForm.hidden = true;
  document.getElementById("booking-coupon-status").textContent = "";
  document.getElementById("booking-coupon").replaceChildren(
    new Option("No coupon", "")
  );
  document.getElementById("booking-sign-in").hidden = true;
  if (signedInAccount) {
    bookingForm.elements.namedItem("guestName").value =
      signedInAccount.displayName || signedInAccount.email.split("@", 1)[0];
    bookingForm.elements.namedItem("guestEmail").value = signedInAccount.email;
  }
  document.getElementById("booking-status").textContent = "";
  document.getElementById("booking-checkin").value = appliedCheckIn;
  document.getElementById("booking-checkout").value = appliedCheckOut;
  setBookingDateLimits();

  document.getElementById("detail-name").textContent =
    hotel.name;

  document.getElementById("detail-location").textContent =
    `${hotel.location}, ${hotel.town}, Cebu`;

  const hotelScore = Number(hotel.score || 0);
  const hotelReviews = Number(hotel.reviews || 0);

  document.getElementById("detail-score").textContent =
    hotelScore.toFixed(1);

  document.getElementById("detail-score-label").textContent =
    scoreLabel(hotelScore);

  document.getElementById("detail-reviews").textContent =
    `${hotelReviews.toLocaleString("en-PH")} reviews`;

  document.getElementById("detail-description").textContent =
    hotel.desc || "";

  document.getElementById("detail-price").textContent =
    hotelPriceText(hotel, nights());

  document.getElementById("detail-nights").textContent =
    `${nights()} night${nights() > 1 ? "s" : ""} · 2 adults`;

  /* Render amenities */

  const amenities = document.getElementById(
    "detail-amenities"
  );

  amenities.replaceChildren();

  (
    Array.isArray(hotel.amenities)
      ? hotel.amenities
      : []
  ).forEach(item => {
    amenities.appendChild(el("li", "", item));
  });

  /* Render thumbnails */

  detailThumbnails.replaceChildren();

  for (let i = 1; i <= hotelImageCount(hotel); i++) {
    const button = el("button", "detail-thumbnail");

    button.type = "button";

    button.setAttribute(
      "aria-label",
      `Show photo ${i}`
    );

    const img = document.createElement("img");

    img.src = hotelImagePath(hotel, i);
    img.alt = hotelImageAlt(hotel, i);
    img.loading = "lazy";

    img.addEventListener("error", () => {
      button.hidden = true;
    });

    button.appendChild(img);

    button.addEventListener("click", () => {
      showDetailPhoto(i);
    });

    detailThumbnails.appendChild(button);
  }

  showDetailPhoto(photoIndex);

  hotelModal.classList.add("is-open");

  hotelModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  document.getElementById("modal-close").focus();
}

/* ---------- CLOSE HOTEL DETAILS ---------- */

function closeHotelDetails() {
  if (!hotelModal.classList.contains("is-open")) return;

  hotelModal.classList.remove("is-open");

  hotelModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");

  activeDetailHotel = null;

  if (
    lastFocusedElement &&
    typeof lastFocusedElement.focus === "function"
  ) {
    lastFocusedElement.focus();
  }
}

/* ---------- MODAL CONTROLS ---------- */

document
  .getElementById("modal-close")
  .addEventListener("click", closeHotelDetails);

document
  .getElementById("modal-backdrop")
  .addEventListener("click", closeHotelDetails);

/* ---------- PREVIOUS PHOTO ---------- */

document
  .getElementById("photo-prev")
  .addEventListener("click", () => {
    if (!activeDetailHotel) return;

    showDetailPhoto(
      activePhotoIndex <= 1
        ? hotelImageCount(activeDetailHotel)
        : activePhotoIndex - 1
    );
  });

/* ---------- NEXT PHOTO ---------- */

document
  .getElementById("photo-next")
  .addEventListener("click", () => {
    if (!activeDetailHotel) return;

    showDetailPhoto(
      activePhotoIndex >= hotelImageCount(activeDetailHotel)
        ? 1
        : activePhotoIndex + 1
    );
  });

/* ---------- KEYBOARD CONTROLS ---------- */

document.addEventListener("keydown", event => {
  if (!hotelModal.classList.contains("is-open")) return;
  if (!activeDetailHotel) return;

  if (event.key === "Escape") {
    closeHotelDetails();
  }

  if (event.key === "ArrowLeft") {
    showDetailPhoto(
      activePhotoIndex <= 1
        ? hotelImageCount(activeDetailHotel)
        : activePhotoIndex - 1
    );
  }

  if (event.key === "ArrowRight") {
    showDetailPhoto(
      activePhotoIndex >= hotelImageCount(activeDetailHotel)
        ? 1
        : activePhotoIndex + 1
    );
  }
});

/* ---------- ROOM AVAILABILITY AND BOOKING ---------- */

function setBookingDateLimits() {
  const checkin = document.getElementById("booking-checkin");
  const checkout = document.getElementById("booking-checkout");
  const today = new Date();
  const todayText = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  checkin.min = todayText;
  if (!checkin.value || checkin.value < todayText) checkin.value = todayText;
  const minCheckoutDate = new Date(`${checkin.value || todayText}T00:00:00`);
  minCheckoutDate.setDate(minCheckoutDate.getDate() + 1);
  checkout.min = [
    minCheckoutDate.getFullYear(),
    String(minCheckoutDate.getMonth() + 1).padStart(2, "0"),
    String(minCheckoutDate.getDate()).padStart(2, "0")
  ].join("-");
  if (!checkout.value || checkout.value < checkout.min) {
    checkout.value = checkout.min;
  }
}

function newBookingRequestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  if (!window.crypto?.getRandomValues) {
    throw new Error("Secure reservation submission is not supported in this browser.");
  }
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function updateBookingTotal() {
  if (!activeDetailHotel) return;
  const checkin = document.getElementById("booking-checkin").value;
  const checkout = document.getElementById("booking-checkout").value;
  const rooms = Number(document.getElementById("booking-rooms").value || 1);
  const bedrooms = Number(document.getElementById("booking-bedrooms").value || 1);
  const nightlyRate = Number(
    bedrooms === 2 ? activeDetailHotel.price2Bedroom : activeDetailHotel.price
  );
  const stayNights = Math.max(
    1,
    Math.round((Date.parse(`${checkout}T00:00:00`) -
      Date.parse(`${checkin}T00:00:00`)) / 86400000)
  );
  const total = nightlyRate * stayNights * rooms;
  document.getElementById("booking-total").textContent =
    `Estimated eligible room subtotal for ${rooms} room${rooms === 1 ? "" : "s"} · ` +
    `${bedrooms} bedroom${bedrooms === 1 ? "" : "s"} per room · ` +
    `${stayNights} night${stayNights === 1 ? "" : "s"}: ` +
    (Number.isFinite(nightlyRate) && nightlyRate >= 0 && (bedrooms === 1 || activeDetailHotel.price2Bedroom !== null)
      ? peso.format(total)
      : "Rate not provided");
}

async function loadBookingCoupons() {
  const select = document.getElementById("booking-coupon");
  if (!select || !signedInAccount) return;
  const selectedId = select.value || preferredCouponId;
  try {
    const coupons = await refreshCouponWallet();
    select.replaceChildren(new Option("No coupon", ""));
    coupons.filter(coupon => coupon.status === "available").forEach(coupon => {
      const restriction = coupon.eligibleHotelName
        ? ` · ${coupon.eligibleHotelName}`
        : "";
      select.append(new Option(
        `${coupon.name} — ${couponDiscountText(coupon)}${restriction}`,
        coupon.id
      ));
    });
    if (coupons.some(coupon => coupon.id === selectedId && coupon.status === "available")) {
      select.value = selectedId;
    }
  } catch (error) {
    document.getElementById("booking-coupon-status").textContent =
      `Coupons could not be loaded: ${error.message}`;
  }
}

let couponPreviewSequence = 0;

async function previewSelectedCoupon() {
  const assignmentId = document.getElementById("booking-coupon").value;
  const message = document.getElementById("booking-coupon-status");
  const total = document.getElementById("booking-total");
  const sequence = ++couponPreviewSequence;
  if (!assignmentId) {
    message.textContent = "";
    updateBookingTotal();
    return;
  }
  if (!activeDetailHotel || !signedInAccount) return;

  const checkIn = document.getElementById("booking-checkin").value;
  const checkOut = document.getElementById("booking-checkout").value;
  const rooms = Number(document.getElementById("booking-rooms").value || 1);
  const bedrooms = Number(document.getElementById("booking-bedrooms").value || 1);
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    message.textContent = "Choose valid stay dates before applying a coupon.";
    return;
  }
  message.textContent = "Checking coupon eligibility…";
  try {
    const data = await requestApi("/api/coupons/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        couponAssignmentId: assignmentId,
        hotelId: activeDetailHotel.id,
        checkIn,
        checkOut,
        rooms,
        bedrooms
      })
    });
    if (sequence !== couponPreviewSequence) return;
    total.textContent =
      `Eligible room subtotal: ${peso.format(data.preview.subtotal)} · ` +
      `Coupon discount: −${peso.format(data.preview.discount)} · ` +
      `Room total: ${peso.format(data.preview.finalSubtotal)}`;
    message.textContent =
      "Coupon applied to the eligible room subtotal only. Taxes and fees are not discounted.";
  } catch (error) {
    if (sequence !== couponPreviewSequence) return;
    updateBookingTotal();
    message.textContent = `Coupon not applied: ${error.message}`;
  }
}

async function refreshBookingAvailability() {
  if (!activeDetailHotel) return;

  const checkIn = document.getElementById("booking-checkin").value;
  const checkOut = document.getElementById("booking-checkout").value;
  const status = document.getElementById("booking-status");
  const form = document.getElementById("booking-form");
  const checkButton = document.getElementById("detail-availability");

  if (!checkIn || !checkOut || checkOut <= checkIn) {
    status.textContent = "Choose a check-in and check-out date (at least one night).";
    form.hidden = true;
    return;
  }

  checkButton.disabled = true;
  checkButton.textContent = "Checking rooms…";
  status.textContent = "";

  try {
    const params = new URLSearchParams({ checkIn, checkOut });
    const response = await fetch(
      `${API_BASE_URL}/api/hotels/${encodeURIComponent(activeDetailHotel.id)}/availability?${params}`,
      { credentials: "include" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Availability could not be checked.");
    }

    const availableRooms = data.availability.availableRooms;
    const roomsSelect = document.getElementById("booking-rooms");
    const bedroomsSelect = document.getElementById("booking-bedrooms");
    const twoBedroomOption = bedroomsSelect.querySelector('option[value="2"]');
    const hasTwoBedroomRate = activeDetailHotel.price2Bedroom !== null &&
      Number.isFinite(Number(activeDetailHotel.price2Bedroom)) &&
      Number(activeDetailHotel.price2Bedroom) >= 0;
    twoBedroomOption.disabled = !hasTwoBedroomRate;
    twoBedroomOption.textContent = hasTwoBedroomRate
      ? `2 bedrooms · ${peso.format(Number(activeDetailHotel.price2Bedroom))}/night`
      : "2 bedrooms · rate not set";
    if (!hasTwoBedroomRate && bedroomsSelect.value === "2") bedroomsSelect.value = "1";
    const previousRooms = Number(roomsSelect.value || 1);
    roomsSelect.replaceChildren();
    for (let count = 1; count <= Math.min(availableRooms, 10); count++) {
      roomsSelect.appendChild(el(
        "option",
        "",
        `${count} room${count === 1 ? "" : "s"}`
      ));
      roomsSelect.lastElementChild.value = String(count);
    }

    if (availableRooms > 0) {
      roomsSelect.value = String(Math.min(previousRooms, availableRooms));
      if (signedInAccount) {
        form.hidden = false;
        status.textContent =
          `${availableRooms} of ${data.availability.totalRooms} rooms available for these dates.`;
      } else {
        form.hidden = true;
        document.getElementById("booking-sign-in").hidden = false;
        status.textContent =
          `${availableRooms} of ${data.availability.totalRooms} rooms available. Sign in to reserve.`;
      }
      updateBookingTotal();
      await loadBookingCoupons();
      if (document.getElementById("booking-coupon").value) {
        await previewSelectedCoupon();
      }
    } else {
      form.hidden = true;
      document.getElementById("booking-sign-in").hidden = true;
      status.textContent = "Sorry, no rooms are available for those dates.";
    }
  } catch (error) {
    form.hidden = true;
    document.getElementById("booking-sign-in").hidden = true;
    status.textContent = error.message;
  } finally {
    checkButton.disabled = false;
    checkButton.textContent = "Check availability";
  }
}

document
  .getElementById("detail-availability")
  .addEventListener("click", refreshBookingAvailability);

document.getElementById("booking-sign-in").addEventListener("click", () => {
  setAccountView("login");
  accountDialog.showModal();
});

document.getElementById("booking-checkin").addEventListener("change", () => {
  bookingRequestId = newBookingRequestId();
  setBookingDateLimits();
  updateBookingTotal();
  if (!document.getElementById("booking-form").hidden) refreshBookingAvailability();
});

document.getElementById("booking-checkout").addEventListener("change", () => {
  bookingRequestId = newBookingRequestId();
  updateBookingTotal();
  if (!document.getElementById("booking-form").hidden) refreshBookingAvailability();
});

document.getElementById("booking-rooms").addEventListener("change", () => {
  bookingRequestId = newBookingRequestId();
  updateBookingTotal();
  if (document.getElementById("booking-coupon").value) previewSelectedCoupon();
});
document.getElementById("booking-bedrooms").addEventListener("change", () => {
  bookingRequestId = newBookingRequestId();
  updateBookingTotal();
  if (document.getElementById("booking-coupon").value) previewSelectedCoupon();
});
document.getElementById("booking-coupon").addEventListener("change", () => {
  bookingRequestId = newBookingRequestId();
  previewSelectedCoupon();
});

document.getElementById("booking-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeDetailHotel) return;
  if (!signedInAccount) {
    event.currentTarget.hidden = true;
    document.getElementById("booking-sign-in").hidden = false;
    document.getElementById("booking-status").textContent = "Sign in to submit a reservation.";
    return;
  }

  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(form));
  const status = document.getElementById("booking-status");
  submit.disabled = true;
  status.textContent = "Saving your reservation…";

  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        hotelId: activeDetailHotel.id,
        rooms: Number(values.rooms),
        bedrooms: Number(values.bedrooms),
        idempotencyKey: bookingRequestId
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Your reservation could not be saved.");
    }

    const booking = data.booking;
    form.hidden = true;
    if (booking.cancelledAt) {
      status.textContent =
        `Reservation ${booking.reference} expired before payment was confirmed. ` +
        "Its coupon, if used, is no longer held.";
    } else {
      status.textContent =
        `Reservation submitted for ${booking.hotelName} and is ` +
        `${booking.paymentStatus === "paid" ? "paid" : "pending payment confirmation"}. ` +
        `Reference: ${booking.reference}. ${booking.rooms} room${booking.rooms === 1 ? "" : "s"}, ` +
        `${booking.bedrooms || 1} bedroom${(booking.bedrooms || 1) === 1 ? "" : "s"} per room, ` +
        `${booking.checkIn} to ${booking.checkOut}. ` +
        (booking.couponDiscount
          ? booking.paymentStatus === "paid"
            ? `Coupon discount: ${peso.format(booking.couponDiscount)}. `
            : `Coupon discount: ${peso.format(booking.couponDiscount)}. Held until ${formatCouponDate(booking.couponHeldUntil, true)} Philippines time while payment is pending. `
          : "") +
        `Total due: ${peso.format(booking.totalPrice)}.`;
    }
    recordPaidBookingPoints(booking);
    if (booking.couponDiscount) {
      refreshCouponWallet().catch(error => {
        console.warn("The reservation succeeded, but the coupon wallet could not refresh.", error);
      });
    }
    if (document.getElementById("reservation-history-dialog")?.open) {
      await loadReservationHistory();
    }
    await loadReservationHistory();
  } catch (error) {
    status.textContent = error.message;
    if (error.message.includes("remain")) await refreshBookingAvailability();
  } finally {
    submit.disabled = false;
  }
});

/* ---------- HTML ELEMENT HELPER ---------- */

function el(tag, className, text) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

/* ---------- RATING LABEL ---------- */

function scoreLabel(score) {
  if (score >= 8.5) return "Excellent";
  if (score >= 8) return "Very good";

  return "Good";
}

/* ---------- CALCULATE NIGHTS ---------- */

function nights() {
  const checkin = appliedCheckIn;
  const checkout = appliedCheckOut;

  if (!checkin || !checkout) return 1;

  const start = new Date(checkin + "T00:00:00");
  const end = new Date(checkout + "T00:00:00");

  const count = Math.round(
    (end.getTime() - start.getTime()) / 86400000
  );

  return count > 0 ? count : 1;
}

/* ---------- FOUR-IMAGE HOTEL GALLERY ---------- */

function createHotelGallery(hotel) {
  const gallery = el("div", "hotel-gallery");

  gallery.setAttribute(
    "aria-label",
    "Hotel photo gallery"
  );

  for (
    let i = 1;
    i <= Math.min(
      VISIBLE_IMAGES,
      hotelImageCount(hotel)
    );
    i++
  ) {
    const photo = el("button", "gallery-photo");

    photo.type = "button";

    photo.setAttribute(
      "aria-label",
      `Open ${hotel.name} photo ${i}`
    );

    photo.addEventListener("click", () => {
      openHotelDetails(hotel, i);
    });

    const isLastVisible = i === VISIBLE_IMAGES;

    const remainingImages =
      hotelImageCount(hotel) - VISIBLE_IMAGES;

    if (isLastVisible && remainingImages > 0) {
      photo.classList.add("more-photos");
    }

    const img = document.createElement("img");

    img.src = hotelImagePath(hotel, i);

    img.alt = hotelImageAlt(hotel, i);

    img.loading = i === 1 ? "eager" : "lazy";

    img.addEventListener("error", () => {
      photo.classList.add("image-missing");

      img.alt = `Photo ${i} is unavailable`;
    });

    photo.appendChild(img);

    if (isLastVisible && remainingImages > 0) {
      const overlay = el(
        "div",
        "photo-overlay",
        `+${remainingImages}`
      );

      overlay.setAttribute(
        "aria-label",
        `${remainingImages} more photos`
      );

      photo.appendChild(overlay);
    }

    gallery.appendChild(photo);
  }

  return gallery;
}

/* ---------- BUILD HOTEL CARD ---------- */

function buildCard(hotel) {
  const card = el("article", "card");

  const gallery = createHotelGallery(hotel);

  const info = el("div", "info");

  /* CLICKABLE HOTEL TITLE */

  const hotelTitle = el(
    "h3",
    "clickable-hotel-title",
    hotel.name
  );

  hotelTitle.setAttribute("role", "button");
  hotelTitle.setAttribute("tabindex", "0");

  hotelTitle.setAttribute(
    "aria-label",
    `View details for ${hotel.name}`
  );

  hotelTitle.addEventListener("click", () => {
    openHotelDetails(hotel);
  });

  hotelTitle.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openHotelDetails(hotel);
    }
  });

  info.append(
    hotelTitle,
    el(
      "span",
      "location",
      `${hotel.location}, ${hotel.town}, Philippines`
    )
  );

  /* Short description */

  const fullDescription = hotel.desc || "";

  const description = el("p", "desc collapsed");

  description.textContent =
    fullDescription.length > DESCRIPTION_PREVIEW_LENGTH
      ? `${fullDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
      : fullDescription;

  info.appendChild(description);

  /* See more */

  if (fullDescription.length > DESCRIPTION_PREVIEW_LENGTH) {
    const seeMore = el(
      "button",
      "see-more-btn",
      "See more"
    );

    seeMore.type = "button";

    seeMore.setAttribute(
      "aria-label",
      `See full description of ${hotel.name}`
    );

    seeMore.addEventListener("click", () => {
      openHotelDetails(hotel);
    });

    info.appendChild(seeMore);
  } else {
    description.classList.remove("collapsed");
  }

  /* Amenities */

  const list = el("ul", "amenities");

  (
    Array.isArray(hotel.amenities)
      ? hotel.amenities
      : []
  ).forEach(amenity => {
    list.appendChild(el("li", "", amenity));
  });

  info.appendChild(list);

  /* Rating */

  const side = el("div", "side");

  const score = el("div", "score");

  const hotelScore = Number(hotel.score || 0);
  const hotelReviews = Number(hotel.reviews || 0);

  const label = el(
    "div",
    "score-label",
    scoreLabel(hotelScore)
  );

  label.appendChild(
    el(
      "small",
      "",
      `${hotelReviews.toLocaleString("en-PH")} reviews`
    )
  );

  score.append(
    label,
    el(
      "span",
      "score-badge",
      hotelScore.toFixed(1)
    )
  );

  /* Price */

  const stayNights = nights();

  const price = el("div", "price");

  price.append(
    el(
      "small",
      "",
      `${stayNights} night${stayNights > 1 ? "s" : ""}, 2 adults`
    ),
    el(
      "strong",
      "",
      hotelPriceText(hotel, stayNights)
    )
  );

  const bottom = el("div", "price-container");

  bottom.appendChild(price);

  const locate = el("button", "btn btn-ghost hotel-locate", "Locate");
  locate.type = "button";
  locate.setAttribute("aria-label", `Show ${hotel.name.trim()} on the map`);
  locate.addEventListener("click", () => {
    if (!window.CebuStaysMap?.open) {
      window.alert("The map is not available right now. Please try again later.");
      return;
    }
    window.CebuStaysMap.open(hotel, locate);
  });

  const cta = el(
    "button",
    "btn btn-primary",
    "See availability"
  );

  cta.type = "button";

  cta.addEventListener("click", () => {
    openHotelDetails(hotel);
  });

  side.append(score, bottom, locate, cta);

  card.append(gallery, info, side);

  return card;
}

function formatPromotionDate(value, withTime = false) {
  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {})
  });
}

function promotionValueText(campaign) {
  return campaign.discountType === "percentage"
    ? `${campaign.discountValue}% off${campaign.maxDiscount ? ` up to ${peso.format(campaign.maxDiscount)}` : ""}`
    : `${peso.format(campaign.discountValue)} off`;
}

function navigateToHotelListing() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("view", "hotels");
  window.history.pushState({}, "", nextUrl);
  applyCurrentView("hotels");
}

function setPromotionSlide(index) {
  const track = document.getElementById("promotion-track");
  if (!track) return;
  const slides = [...track.querySelectorAll(".promotion-slide")];
  if (!slides.length) return;
  activePromotionIndex = (index + slides.length) % slides.length;
  track.style.transform = `translateX(-${activePromotionIndex * 100}%)`;
  slides.forEach((slide, slideIndex) => {
    slide.setAttribute("aria-hidden", String(slideIndex !== activePromotionIndex));
  });
  document.querySelectorAll(".promotion-indicator").forEach((indicator, indicatorIndex) => {
    const active = indicatorIndex === activePromotionIndex;
    indicator.setAttribute("aria-current", String(active));
    indicator.setAttribute("aria-label", `Show promotion ${indicatorIndex + 1}`);
  });
}

function renderPromotions() {
  const track = document.getElementById("promotion-track");
  const indicators = document.getElementById("promotion-indicators");
  const previous = document.getElementById("promotion-previous");
  const next = document.getElementById("promotion-next");
  if (!track || !indicators || !previous || !next) return;
  track.replaceChildren();
  indicators.replaceChildren();

  if (!promotionSchedule.campaigns.length) {
    const fallback = el("article", "promotion-slide promotion-fallback");
    fallback.append(
      el("p", "home-eyebrow", "Find your Cebu stay"),
      el("h3", "", "Explore places to stay across Cebu."),
      el("p", "", "Browse the hotel catalogue and plan your next trip."),
    );
    const link = el("button", "home-primary-action", "Explore hotels");
    link.type = "button";
    link.addEventListener("click", navigateToHotelListing);
    fallback.append(link);
    track.append(fallback);
    previous.hidden = true;
    next.hidden = true;
    return;
  }

  promotionSchedule.campaigns.forEach((campaign, index) => {
    const slide = el("article", "promotion-slide");
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${index + 1} of ${promotionSchedule.campaigns.length}`);
    if (campaign.imageUrl && /^(https:\/\/|\/(?!\/))/.test(campaign.imageUrl)) {
      const image = document.createElement("img");
      image.className = "promotion-slide-image";
      image.src = campaign.imageUrl.startsWith("/")
        ? new URL(campaign.imageUrl.slice(1), new URL(".", document.baseURI)).href
        : campaign.imageUrl;
      image.alt = "";
      image.loading = "lazy";
      slide.append(image);
    }
    const copy = el("div", "promotion-slide-copy");
    copy.append(
      el("p", "promotion-state", campaign.scheduleStatus === "upcoming" ? "Upcoming promotion" : "Available now"),
      el("h3", "", campaign.name),
      el("p", "promotion-description", campaign.publicText),
      el("strong", "promotion-value", promotionValueText(campaign)),
      el(
        "p",
        "promotion-dates",
        campaign.scheduleStatus === "upcoming"
          ? `Starts ${formatPromotionDate(campaign.startsAt, true)} · Cebu time`
          : `Offer ends ${formatPromotionDate(campaign.endsAt, true)} · Cebu time`
      )
    );
    copy.append(el("p", "promotion-restriction", "Coupon required; eligibility varies by account."));
    if (campaign.eligibleHotelName) {
      copy.append(el("p", "promotion-restriction", `Selected hotel: ${campaign.eligibleHotelName}`));
    }
    const action = el("button", "home-primary-action", "View offer");
    action.type = "button";
    action.addEventListener("click", () => {
      const eventInfo = promotionSchedule.events.find(item => item.campaignId === campaign.id);
      if (eventInfo) {
        openPromotionEvent(eventInfo);
      } else {
        navigateToHotelListing();
      }
    });
    copy.append(action);
    slide.append(copy);
    track.append(slide);

    const indicator = el("button", "promotion-indicator");
    indicator.type = "button";
    indicator.addEventListener("click", () => setPromotionSlide(index));
    indicators.append(indicator);
  });

  const canSlide = promotionSchedule.campaigns.length > 1;
  previous.hidden = !canSlide;
  next.hidden = !canSlide;
  activePromotionIndex = 0;
  setPromotionSlide(0);
}

function openPromotionEvent(eventInfo) {
  document.getElementById("event-detail-title").textContent = eventInfo.title;
  document.getElementById("event-detail-dates").textContent =
    `${formatPromotionDate(eventInfo.startsAt, true)} – ${formatPromotionDate(eventInfo.endsAt, true)} · Philippines time`;
  document.getElementById("event-detail-description").textContent =
    `${eventInfo.description} Destination: ${eventInfo.destination}.`;
  document.getElementById("event-detail-offer").textContent =
    `${eventInfo.campaignName}: ${promotionValueText(eventInfo)}.`;
  const eligibility = [
    `Minimum eligible room subtotal: ${peso.format(eventInfo.minimumSubtotal)}.`,
    eventInfo.eligibleHotelName
      ? `Selected hotel: ${eventInfo.eligibleHotelName}.`
      : "Eligible at participating CebuStays properties.",
    "Coupon required. Availability depends on your account and the campaign schedule."
  ];
  document.getElementById("event-detail-eligibility").textContent = eligibility.join(" ");
  document.getElementById("event-detail-dialog").showModal();
}

function renderPromotionEvents() {
  const containers = [
    document.getElementById("promotion-events-list"),
    document.getElementById("dialog-promotion-events-list")
  ].filter(Boolean);
  const events = promotionSchedule.events;
  containers.forEach(container => {
    container.replaceChildren();
    if (!events.length) {
      container.append(el("p", "home-loading", "There are no upcoming promotional events scheduled."));
      return;
    }
    events.forEach(eventInfo => {
      const card = el("article", "promotion-event-card");
      const button = el("button", "promotion-event-button");
      button.type = "button";
      button.setAttribute("aria-label", `View details for ${eventInfo.title}`);
      button.append(
        el("span", "promotion-event-date", formatPromotionDate(eventInfo.startsAt)),
        el("span", "promotion-event-copy"),
      );
      const copy = button.lastElementChild;
      copy.append(
        el("strong", "", eventInfo.title),
        el("span", "", `${eventInfo.campaignName} · ${eventInfo.destination}`),
        el("small", "", `Offer runs until ${formatPromotionDate(eventInfo.endsAt)}`)
      );
      button.addEventListener("click", () => openPromotionEvent(eventInfo));
      card.append(button);
      container.append(card);
    });
  });
}

async function loadPromotions() {
  const track = document.getElementById("promotion-track");
  const eventList = document.getElementById("promotion-events-list");
  try {
    const data = await requestApi("/api/promotions");
    if (!Array.isArray(data.campaigns) || !Array.isArray(data.events)) {
      throw new Error("The promotions service returned an invalid response.");
    }
    promotionSchedule = data;
    renderPromotions();
    renderPromotionEvents();
    startPromotionCarousel();
  } catch (error) {
    if (track) track.replaceChildren(el("p", "promotion-load-error", error.message));
    if (eventList) eventList.replaceChildren(el("p", "promotion-load-error", "Promotional events are temporarily unavailable."));
  }
}

function startPromotionCarousel() {
  if (promotionTimer) window.clearInterval(promotionTimer);
  const carousel = document.getElementById("promotion-carousel");
  const previous = document.getElementById("promotion-previous");
  const next = document.getElementById("promotion-next");
  if (!carousel || !previous || !next) return;
  previous.onclick = () => setPromotionSlide(activePromotionIndex - 1);
  next.onclick = () => setPromotionSlide(activePromotionIndex + 1);

  let hovered = false;
  let focused = false;
  carousel.addEventListener("mouseenter", () => { hovered = true; });
  carousel.addEventListener("mouseleave", () => { hovered = false; });
  carousel.addEventListener("focusin", () => { focused = true; });
  carousel.addEventListener("focusout", event => {
    if (!carousel.contains(event.relatedTarget)) focused = false;
  });
  carousel.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") setPromotionSlide(activePromotionIndex - 1);
    if (event.key === "ArrowRight") setPromotionSlide(activePromotionIndex + 1);
  });
  let touchStartX = null;
  carousel.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse") touchStartX = event.clientX;
  });
  carousel.addEventListener("pointerup", event => {
    if (touchStartX === null) return;
    const distance = event.clientX - touchStartX;
    if (Math.abs(distance) > 40) {
      setPromotionSlide(activePromotionIndex + (distance < 0 ? 1 : -1));
    }
    touchStartX = null;
  });

  const canAutoAdvance = promotionSchedule.campaigns.length > 1 &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canAutoAdvance) return;
  const advance = () => {
    if (!hovered && !focused && !document.hidden) {
      setPromotionSlide(activePromotionIndex + 1);
    }
  };
  promotionTimer = window.setInterval(advance, 6000);
}

/* ---------- RENDER HOTEL RESULTS ---------- */

function renderFeaturedHotels() {
  const container = document.getElementById("featured-hotels");
  const destinationList = document.getElementById("destination-list");
  if (!container || !destinationList) return;

  if (!hotels.length) {
    container.replaceChildren(el("p", "home-loading", "Loading stays…"));
    destinationList.replaceChildren();
    return;
  }

  container.replaceChildren();
  hotels.slice(0, 3).forEach(hotel => {
    const card = el("article", "home-featured-card");
    const imageButton = el("button", "home-featured-image");
    imageButton.type = "button";
    imageButton.setAttribute("aria-label", `Open ${hotel.name}`);
    const image = document.createElement("img");
    image.src = hotelImagePath(hotel, 1);
    image.alt = hotelImageAlt(hotel, 1);
    image.loading = "lazy";
    imageButton.append(image);
    imageButton.addEventListener("click", () => {
      navigateToHotelListing();
      openHotelDetails(hotel);
    });

    const copy = el("div", "home-featured-copy");
    copy.append(
      el("p", "home-card-location", `${hotel.location}, ${hotel.town}`),
      el("h3", "", hotel.name),
      el(
        "p",
        "",
        hotel.desc
          ? `${hotel.desc.slice(0, 110).trim()}${hotel.desc.length > 110 ? "…" : ""}`
          : "Stay details coming soon."
      )
    );
    const meta = el("div", "home-featured-meta");
    meta.append(
      el("span", "", hotel.score ? hotel.score.toFixed(1) : "New"),
      el("strong", "", hotelPriceText(hotel, nights()))
    );
    copy.append(meta);
    card.append(imageButton, copy);
    container.append(card);
  });

  destinationList.replaceChildren();
  [...new Set(hotels.map(hotel => hotel.town).filter(Boolean))]
    .slice(0, 6)
    .forEach(town => {
      const button = el("button", "destination-card", town);
      button.type = "button";
      button.addEventListener("click", navigateToHotelListing);
      destinationList.append(button);
  });
}

function render() {
  if (title) {
    const selectedFilters = [...checkboxes]
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value.toLowerCase().trim());

    const filteredHotels = selectedFilters.length
      ? hotels.filter(hotel => {
          const town = String(hotel.town || "")
            .toLowerCase()
            .trim();

          const location = String(hotel.location || "")
            .toLowerCase()
            .trim();

          const amenities = (
            Array.isArray(hotel.amenities)
              ? hotel.amenities
              : []
          ).map(item => String(item).toLowerCase().trim());

          return selectedFilters.some(filter =>
            town === filter ||
            location === filter ||
            amenities.includes(filter)
          );
        })
      : hotels;

    title.textContent =
      `${filteredHotels.length} propert${
        filteredHotels.length === 1 ? "y" : "ies"
      } found`;

    feed.replaceChildren();

    if (filteredHotels.length === 0) {
      feed.appendChild(
        el(
          "div",
          "empty",
          "No properties match these filters. Clear a filter to see all stays."
        )
      );

      return;
    }

    filteredHotels.forEach(hotel => {
      feed.appendChild(buildCard(hotel));
    });
  }

  renderFeaturedHotels();
}

/* ---------- LOAD HOTEL CATALOGUE ---------- */

async function loadHotels() {
  feed.replaceChildren(
    el("div", "skeleton"),
    el("div", "skeleton")
  );

  try {
    const response = await fetch(API_URL, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.hotels)) {
      throw new Error(
        "Hotel API returned an invalid response."
      );
    }

    hotels = data.hotels;

  } catch (error) {
    console.error(
      "Unable to load the hotel catalogue:",
      error
    );

    title.textContent = "Properties could not be loaded";

    feed.replaceChildren(
      el(
        "div",
        "error",
        "Unable to load properties. Please check your API connection and try again."
      )
    );

    return;
  }

  render();
}

/* ---------- DEFAULT CHECK-IN/CHECK-OUT DATES ---------- */

function setDefaultDates() {
  const formatDate = date => {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = new Date();

  const tomorrow = new Date(today);

  tomorrow.setDate(today.getDate() + 1);

  const checkin = document.getElementById("checkin");

  const checkout = document.getElementById("checkout");

  checkin.min = formatDate(today);

  checkin.value = formatDate(today);
  checkin.required = true;

  checkout.min = formatDate(tomorrow);

  checkout.value = formatDate(tomorrow);
  checkout.required = true;
  appliedCheckIn = checkin.value;
  appliedCheckOut = checkout.value;

  checkin.addEventListener("change", () => {
    if (!checkin.value) return;

    const nextDay = new Date(
      checkin.value + "T00:00:00"
    );

    nextDay.setDate(nextDay.getDate() + 1);

    const minimumCheckout = formatDate(nextDay);

    checkout.min = minimumCheckout;

    if (
      !checkout.value ||
      checkout.value <= checkin.value
    ) {
      checkout.value = minimumCheckout;
    }

  });

}

/* ---------- SEARCH FORM ---------- */

document
  .getElementById("search-form")
  .addEventListener("submit", event => {
    event.preventDefault();

    const checkin = document.getElementById("checkin");
    const checkout = document.getElementById("checkout");
    if (!checkin.reportValidity() || !checkout.reportValidity()) return;

    appliedCheckIn = checkin.value;
    appliedCheckOut = checkout.value;
    render();
  });

/* ---------- FILTERS ---------- */

checkboxes.forEach(checkbox => {
  checkbox.addEventListener("change", render);
});

/* ---------- CLEAR FILTERS ---------- */

document
  .getElementById("clear-filters")
  .addEventListener("click", () => {
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    render();
  });

function initializeHomepageNavigation() {
  if (!homeNavToggle || !homeNavigationLinks) return;

  homeNavToggle.addEventListener("click", () => {
    const isOpen = homeNavigationLinks.classList.toggle("is-open");
    homeNavToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", event => {
    if (!homeNavigationLinks.contains(event.target) && !homeNavToggle.contains(event.target)) {
      homeNavigationLinks.classList.remove("is-open");
      homeNavToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initializeSidebarNavigation() {
  if (!sidebar) return;

  const findStaysButton = document.getElementById("sidebar-find-stays");
  const clearFiltersButton = document.getElementById("sidebar-clear-filters");

  if (findStaysButton) {
    findStaysButton.addEventListener("click", () => {
      const checkin = document.getElementById("checkin");
      checkin?.scrollIntoView({ behavior: "smooth", block: "center" });
      checkin?.focus({ preventScroll: true });
    });
  }

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", () => {
      document.getElementById("clear-filters")?.click();
    });
  }

  const setSidebarExpanded = expanded => {
    sidebar.classList.toggle("is-expanded", expanded);
    if (hotelApp) {
      hotelApp.classList.toggle("sidebar-expanded", expanded);
    }
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-expanded", String(expanded));
    }
  };

  sidebar.addEventListener("mouseenter", () => {
    if (window.innerWidth > 700) setSidebarExpanded(true);
  });

  sidebar.addEventListener("mouseleave", () => {
    if (window.innerWidth > 700 && !sidebar.classList.contains("is-pinned")) setSidebarExpanded(false);
  });

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      const shouldExpand = !sidebar.classList.contains("is-expanded");
      sidebar.classList.toggle("is-pinned", shouldExpand);
      setSidebarExpanded(shouldExpand);
    });
  }

  if (mobileSidebarToggle) {
    mobileSidebarToggle.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("is-open");
      mobileSidebarToggle.setAttribute("aria-expanded", String(isOpen));
      if (sidebarBackdrop) {
        sidebarBackdrop.hidden = !isOpen;
      }
    });
  }

  if (sidebarClose) {
    sidebarClose.addEventListener("click", () => {
      sidebar.classList.remove("is-open");
      if (mobileSidebarToggle) mobileSidebarToggle.setAttribute("aria-expanded", "false");
      if (sidebarBackdrop) sidebarBackdrop.hidden = true;
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => {
      sidebar.classList.remove("is-open");
      if (mobileSidebarToggle) mobileSidebarToggle.setAttribute("aria-expanded", "false");
      sidebarBackdrop.hidden = true;
    });
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 700) {
      sidebar.classList.remove("is-expanded");
      if (sidebarToggle) sidebarToggle.setAttribute("aria-expanded", "false");
      return;
    }
    if (sidebar.classList.contains("is-pinned")) {
      setSidebarExpanded(true);
    } else {
      setSidebarExpanded(false);
    }
  });
}

function initializePageLinks() {
  document.querySelectorAll("[data-page-link]").forEach(link => {
    link.addEventListener("click", event => {
      const target = link.dataset.pageLink || "home";
      if (signedInAccount && target === "home") {
        event.preventDefault();
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("view", "hotels");
        window.history.pushState({}, "", nextUrl);
        applyCurrentView("hotels");
        return;
      }
      const nextUrl = new URL(window.location.href);
      if (target === "home") {
        nextUrl.searchParams.delete("view");
      } else {
        nextUrl.searchParams.set("view", "hotels");
      }
      event.preventDefault();
      window.history.pushState({}, "", nextUrl);
      applyCurrentView(target);
    });
  });

  window.addEventListener("popstate", () => {
    applyCurrentView();
  });
}

function initializeHelpChat() {
  const dialog = document.getElementById("help-dialog");
  const conversation = document.getElementById("help-conversation");
  const suggestions = document.getElementById("help-suggestions");
  const form = document.getElementById("help-form");
  const input = document.getElementById("help-input");
  const sendButton = document.getElementById("help-send");
  const modeStatus = document.getElementById("help-mode-status");
  if (!dialog || !conversation || !form || !input || !sendButton || !modeStatus) return;

  const typingId = "help-typing-indicator";

  const appendHelpMessage = (role, text, options = {}) => {
    const message = el("article", `help-message is-${role}${options.isError ? " is-error" : ""}`);
    message.append(el(
      "span",
      "help-message-speaker",
      role === "user" ? "You" : "CebuStays Help Assistant"
    ));
    message.append(el("div", "", text));

    if (options.action) {
      const action = el(
        "button",
        "btn btn-ghost help-message-action",
        options.action === "register" ? "Create account" : "Sign in"
      );
      action.type = "button";
      action.addEventListener("click", () => {
        setAccountView(options.action === "register" ? "register" : "login");
        accountDialog.showModal();
      });
      message.append(action);
    }

    if (options.retryMessage) {
      const retry = el("button", "btn btn-ghost help-message-action", "Try again");
      retry.type = "button";
      retry.dataset.helpRetry = "true";
      retry.addEventListener("click", () => {
        if (!helpSending) submitHelpQuestion(options.retryMessage, { retry: true });
      });
      message.append(retry);
    }

    conversation.append(message);
    conversation.scrollTop = conversation.scrollHeight;
    return message;
  };

  const resetHelpConversation = () => {
    helpHistory = [];
    conversation.replaceChildren();
    if (suggestions) suggestions.hidden = false;
    modeStatus.textContent = "Responses use CebuStays guidance. AI availability is shown after your first question.";
    appendHelpMessage(
      "assistant",
      "Hi! Welcome to CebuStays. I'm your Help Assistant. I can help you explore hotels, understand reservations, use coupons, and navigate the website. What would you like to know?"
    );
  };

  const setHelpBusy = busy => {
    helpSending = busy;
    conversation.setAttribute("aria-busy", String(busy));
    input.disabled = busy;
    sendButton.disabled = busy;
    document.getElementById("help-new-chat").disabled = busy;
    document.querySelectorAll("[data-help-question]").forEach(button => {
      button.disabled = busy;
    });
    const typing = document.getElementById(typingId);
    if (busy && !typing) {
      const indicator = el("p", "help-typing", "CebuStays Help Assistant is responding…");
      indicator.id = typingId;
      indicator.setAttribute("role", "status");
      conversation.append(indicator);
      conversation.scrollTop = conversation.scrollHeight;
    } else if (!busy) {
      typing?.remove();
    }
  };

  async function submitHelpQuestion(value, { retry = false } = {}) {
    const message = value.trim();
    if (!message || helpSending) return;

    conversation.querySelectorAll("[data-help-retry]").forEach(button => button.remove());
    if (!retry) {
      appendHelpMessage("user", message);
      input.value = "";
      if (suggestions) suggestions.hidden = true;
    }
    setHelpBusy(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/help`, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: helpHistory.slice(-8),
          ...(selectedHelpHotelId ? { hotelId: selectedHelpHotelId } : {})
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || "The help assistant is temporarily unavailable. Please try again.");
        error.status = response.status;
        throw error;
      }
      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("The help assistant returned an invalid response. Please try again.");
      }

      helpHistory.push(
        { role: "user", content: message },
        { role: "assistant", content: data.answer }
      );
      helpHistory = helpHistory.slice(-8);
      appendHelpMessage("assistant", data.answer, { action: data.action });
      modeStatus.textContent = data.mode === "ai"
        ? "AI-assisted reply · Confirm booking and coupon details in CebuStays."
        : data.mode === "faq_fallback"
          ? "AI is temporarily unavailable · Showing verified FAQ guidance."
          : "FAQ-based guidance · AI is not configured on this server.";
    } catch (error) {
      const messageText = error.status === 429
        ? error.message
        : "I couldn't reach the help service. Your question is still here; please try again.";
      appendHelpMessage("assistant", messageText, {
        isError: true,
        retryMessage: message
      });
      modeStatus.textContent = "Help service unavailable.";
    } finally {
      setHelpBusy(false);
      input.focus();
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    submitHelpQuestion(input.value);
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.getElementById("help-new-chat")?.addEventListener("click", () => {
    if (helpSending) return;
    resetHelpConversation();
    input.focus();
  });

  document.getElementById("help-close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelectorAll("[data-help-question]").forEach(button => {
    button.addEventListener("click", () => submitHelpQuestion(button.textContent));
  });

  document.querySelectorAll("[data-help-open]").forEach(button => {
    button.addEventListener("click", () => {
      selectedHelpHotelId = activeDetailHotel?.id ?? null;
      dialog.showModal();
      input.focus();
      homeNavigationLinks?.classList.remove("is-open");
      homeNavToggle?.setAttribute("aria-expanded", "false");
      sidebar?.classList.remove("is-open");
      if (mobileSidebarToggle) mobileSidebarToggle.setAttribute("aria-expanded", "false");
      if (sidebarBackdrop) sidebarBackdrop.hidden = true;
    });
  });

  resetHelpConversation();
}

/* ---------- INITIALIZE APP ---------- */

initializeSpinButton();
setDefaultDates();
initializeAccount();
initializeAccountMenu();
initializeHomepageNavigation();
initializeSidebarNavigation();
initializePageLinks();
initializeHelpChat();
initializeRewardsSystem();
applyCurrentView();
loadPromotions();