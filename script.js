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
  // Angles are measured clockwise from the top of the prize-wheel artwork.
  { id: "try-again", title: "Try again", weight: 70, color: "#e5e7eb", kind: "tryAgain", imageAngle: 313 },
  { id: "voucher-100", title: "₱50 café treat", weight: 12, color: "#fbbf24", kind: "reward", reward: DEFAULT_REWARD_CATALOG[0], imageAngle: 193 },
  { id: "market-voucher", title: "₱150 market voucher", weight: 7, color: "#f59e0b", kind: "reward", reward: DEFAULT_REWARD_CATALOG[1], imageAngle: 114 },
  { id: "spa-pack", title: "Spa & wellness pack", weight: 5, color: "#14b8a6", kind: "reward", reward: DEFAULT_REWARD_CATALOG[4], imageAngle: 73 },
  { id: "weekend-escape", title: "Weekend Cebu escape", weight: 4, color: "#8b5cf6", kind: "reward", reward: DEFAULT_REWARD_CATALOG[10], imageAngle: 358 },
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
    },
    imageAngle: 244
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

function getWheelRewardAtPointer(rotation) {
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const pointerAngle = (360 - normalizedRotation) % 360;
  return SPIN_WHEEL_REWARDS.reduce((closest, reward) => {
    const distance = Math.abs(((pointerAngle - reward.imageAngle + 540) % 360) - 180);
    const closestDistance = Math.abs(((pointerAngle - closest.imageAngle + 540) % 360) - 180);
    return distance < closestDistance ? reward : closest;
  });
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
    if (codespacePort === "5500" || codespacePort === "5505") {
      return `${protocol}//${codespaceName}-5506.app.github.dev`;
    }
    if (codespacePort === "5506") {
      return "";
    }
  }

  if (["localhost", "127.0.0.1"].includes(hostname)) {
    if (port === "5500" || port === "5505") return `${protocol}//${hostname}:5506`;
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
const pesoExact = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
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

const amenityFilters = document.querySelector(".filters fieldset");
const MAX_AMENITY_FILTERS = 9;

let hotels = [];
let signedInAccount = null;
let reservationHistoryLoading = false;
let reservationHistoryRefreshTimer = null;
let appliedCheckIn = "";
let appliedCheckOut = "";
let hotelViewLoaded = false;
let promotionSchedule = { campaigns: [], events: [] };
let couponWallet = [];
let cebuPointsEntries = [];
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

function getCebuPointsEntries() {
  return cebuPointsEntries;
}

function setCebuPointsEntries(entries) {
  cebuPointsEntries = Array.isArray(entries) ? entries : [];
}

function getCebuPointsBalance() {
  return getCebuPointsEntries().reduce((total, entry) => total + Number(entry.points || 0), 0);
}

async function refreshCebuPoints() {
  if (!signedInAccount) {
    setCebuPointsEntries([]);
    renderCebuPointsSummary();
    return [];
  }
  const accountId = signedInAccount.id;
  const data = await requestApi("/api/points/mine");
  if (signedInAccount?.id !== accountId) return cebuPointsEntries;
  setCebuPointsEntries(data.entries);
  renderCebuPointsSummary();
  renderRewardCatalog();
  return cebuPointsEntries;
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
  historyEl.replaceChildren();
  if (!items.length) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "coupon-empty";
    emptyMessage.textContent = "You have not earned any points yet.";
    historyEl.append(emptyMessage);
    return;
  }

  items.forEach(entry => {
    const positive = Number(entry.points || 0) >= 0;
    const label = entry.label || entry.reference || "Reward activity";
    const date = new Date(entry.date || Date.now()).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const item = document.createElement("article");
    item.className = "points-entry";
    const details = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = label;
    const dateLabel = document.createElement("small");
    dateLabel.textContent = date;
    details.append(title, dateLabel);
    const value = document.createElement("span");
    value.className = `points-value ${positive ? "positive" : "negative"}`;
    value.textContent = `${positive ? "+" : "-"}${Math.abs(Number(entry.points || 0))} pts`;
    item.append(details, value);
    historyEl.append(item);
  });
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

async function recordPointEntry(label, points, reference, entryType) {
  const data = await requestApi("/api/points/spend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label,
      points: Math.abs(Number(points)),
      reference,
      entryType
    })
  });
  setCebuPointsEntries(data.entries);
  renderCebuPointsSummary();
  renderRewardCatalog();
  return data.entry;
}

async function recordPaidBookingPoints(booking) {
  if (!signedInAccount || !booking || String(booking.paymentStatus || "").toLowerCase() !== "paid") {
    return false;
  }
  await refreshCebuPoints();
  return true;
}

async function syncCebuPointsFromPaidBookings() {
  if (!signedInAccount) {
    return false;
  }
  await refreshCebuPoints();
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
    action.addEventListener("click", () => redeemRewardCatalogReward(reward, action));
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

async function redeemRewardCatalogReward(reward, actionButton) {
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

  if (actionButton) {
    actionButton.disabled = true;
    actionButton.textContent = "Redeeming…";
  }
  try {
    const redemptionId = `reward-${reward.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await recordPointEntry(`Redeemed ${reward.title}`, pointCost, redemptionId, "reward");

    const wallet = getLocalRewardWallet();
    const rewardCode = `${reward.code || reward.title.toUpperCase().replace(/\s+/g, "-")}-${Date.now().toString().slice(-6)}`;
    wallet.push({
      id: redemptionId,
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
    refreshCouponWallet().catch(error => {
      console.warn("The reward was redeemed, but the coupon wallet could not refresh.", error);
    });
    document.getElementById("coupon-wallet-dialog")?.showModal();
  } catch (error) {
    const message = document.getElementById("coupon-wallet-message");
    if (message) message.textContent = error.message;
    console.warn("Unable to redeem the Cebu Points reward.", error);
  } finally {
    if (actionButton?.isConnected) {
      actionButton.disabled = false;
      actionButton.textContent = "Redeem reward";
    }
  }
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

async function spinWheel() {
  if (spinInProgress) return;
  if (pendingSpinReward) {
    return claimSpinReward();
  }

  if (!signedInAccount) {
    setAccountView("login");
    accountDialog.showModal();
    return;
  }

  const wheel = document.getElementById("spin-wheel");
  const result = document.getElementById("spin-result");
  const spinButton = document.getElementById("spin-button");
  if (!wheel || !result) return;

  spinInProgress = true;
  if (spinButton) {
    spinButton.disabled = true;
    spinButton.textContent = "Checking points…";
  }
  result.textContent = "Checking your Cebu Points…";

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

  let winner;
  try {
    await refreshCebuPoints();
    const pointsBalance = getCebuPointsBalance();
    if (pointsBalance < 1) {
      result.textContent = `You need 1 Cebu Point to spin. Your balance is ${pointsBalance} pts. Earn points from paid hotel bookings.`;
      if (outcomeAudioContext) await outcomeAudioContext.close();
      spinInProgress = false;
      if (spinButton) {
        spinButton.disabled = false;
        spinButton.textContent = "Spin now";
      }
      return;
    }

    winner = selectWheelReward(secureRandomInt(SPIN_WHEEL_TOTAL_WEIGHT));
    const spinId = `spin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await recordPointEntry("Spin the wheel", 1, spinId, "spin");
  } catch (error) {
    if (outcomeAudioContext) await outcomeAudioContext.close();
    spinInProgress = false;
    if (spinButton) {
      spinButton.disabled = false;
      spinButton.textContent = "Spin now";
    }
    result.textContent = error.message;
    return;
  }
  pendingSpinReward = winner;
  pendingSpinRewardOwner = signedInAccount.id;

  const spinCost = document.querySelector(".spin-cost");
  if (spinCost) spinCost.textContent = `1 Cebu Point per spin · Balance: ${getCebuPointsBalance()} pts`;

  const targetAngle = (360 - winner.imageAngle + 360) % 360;
  const currentRotation = Number(wheel.dataset.rotation || 0);
  const currentAngle = currentRotation % 360;
  const rotationDelta = 360 * 7 + (targetAngle - currentAngle + 360) % 360;
  const nextRotation = currentRotation + rotationDelta;
  wheel.dataset.rotation = String(nextRotation);

  result.textContent = "Spinning… good luck!";

  let spinFinished = false;
  let fallbackTimer;
  const finishSpin = () => {
    if (spinFinished) return;
    spinFinished = true;
    window.clearTimeout(fallbackTimer);
    wheel.style.transform = `rotate(${nextRotation}deg)`;
    winner = getWheelRewardAtPointer(nextRotation);
    pendingSpinReward = winner;
    pendingSpinRewardOwner = signedInAccount.id;
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
    spinWheel().catch(error => {
      const result = document.getElementById("spin-result");
      if (result) result.textContent = error.message;
      console.error("The spin action could not be completed.", error);
    });
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
  const spinDialog = document.getElementById("spin-wheel-dialog");
  const spinMusic = new Audio("UI%20images/UI%20sounds/Pokemon.mp3");
  spinMusic.preload = "auto";
  let spinMusicRequest = 0;
  const startSpinMusic = () => {
    const request = ++spinMusicRequest;
    spinMusic.pause();
    const seekToClipStart = () => {
      if (request !== spinMusicRequest || !spinDialog?.open) return;
      spinMusic.currentTime = 90;
    };
    if (spinMusic.readyState >= HTMLMediaElement.HAVE_METADATA) {
      seekToClipStart();
    } else {
      spinMusic.addEventListener("loadedmetadata", seekToClipStart, { once: true });
      try {
        spinMusic.currentTime = 90;
      } catch {}
    }
    spinMusic.play().catch(() => {});
  };
  spinMusic.addEventListener("timeupdate", () => {
    if (spinDialog?.open && spinMusic.currentTime >= 130) spinMusic.currentTime = 90;
  });
  spinMusic.addEventListener("ended", () => {
    if (!spinDialog?.open) return;
    spinMusic.currentTime = 90;
    spinMusic.play().catch(() => {});
  });
  spinDialog?.addEventListener("close", () => {
    spinMusicRequest++;
    spinMusic.pause();
    if (spinMusic.readyState >= HTMLMediaElement.HAVE_METADATA) spinMusic.currentTime = 0;
  });

  document.getElementById("sidebar-points")?.addEventListener("click", openCebuPointsDialog);
  document.getElementById("sidebar-rewards")?.addEventListener("click", openRewardCatalog);
  document.getElementById("sidebar-spin-wheel")?.addEventListener("click", () => {
    const dialog = document.getElementById("spin-wheel-dialog");
    if (dialog) {
      dialog.showModal();
      startSpinMusic();
    }
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
document.querySelector("#account-form-login > label")?.remove();

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
  const forgotForm = document.getElementById("forgot-password-form");
  if (forgotForm) forgotForm.hidden = true;
  if (accountEntry && !signedInAccount) accountEntry.hidden = false;

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

  const developerProjectLink = document.getElementById("developer-project-link");
  const sidebarGuestActions = document.getElementById("sidebar-guest-actions");
  const sidebarUserActions = document.getElementById("sidebar-user-actions");
  const sidebarUserName = document.getElementById("sidebar-user-name");
  const sidebarUserRole = document.getElementById("sidebar-user-role");
  const sidebarAvatar = document.getElementById("sidebar-avatar");

  if (accountEntry) accountEntry.hidden = isSignedIn;
  if (signedInPanel) signedInPanel.hidden = !isSignedIn;
  const homeAccountActions = document.querySelector(".home-account-actions");
  if (homeAccountActions) homeAccountActions.hidden = isSignedIn;
  const homeBrowseLabel = document.getElementById("home-browse-label");
  if (homeBrowseLabel) {
    homeBrowseLabel.textContent = isSignedIn ? "Browse using your account" : "Browse as guest";
  }
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
      setCebuPointsEntries([]);
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
    refreshCebuPoints().catch(error => {
      const historyEl = document.getElementById("cebu-points-history");
      if (historyEl) {
        historyEl.textContent = `Cebu Points could not be loaded: ${error.message}`;
      }
      console.error("Unable to load Cebu Points from the account service.", error);
    });
  } else {
    couponWallet = [];
    setCebuPointsEntries([]);
    renderCouponWallet();
    updateCouponCount();
    renderCebuPointsSummary();
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

let myQrCategories = {};

function closeIdentityDialogs(except = null) {
  document.querySelectorAll(".identity-dialog[open]").forEach(dialog => {
    if (dialog !== except) dialog.close();
  });
}

function formatIdentityDate(value) {
  if (!value) return "Not available";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderMyQrCategory(category) {
  const list = document.getElementById("my-qr-list");
  const categories = document.getElementById("my-qr-categories");
  categories.querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.qrCategory === category));
  });
  list.replaceChildren();
  const entries = myQrCategories[category] ?? [];
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "identity-message";
    empty.textContent = category === "active"
      ? "Your QR Keycard will appear here after staff approves the reservation and confirms two valid IDs at the hotel counter."
      : "There are no reservations or QR keycards in this category.";
    list.append(empty);
    return;
  }

  entries.forEach(entry => {
    const card = document.createElement("article");
    card.className = "identity-qr-card";
    if (entry.qrImage) {
      const image = document.createElement("img");
      image.src = entry.qrImage;
      image.alt = `Unique QR keycard for reservation ${entry.reference}`;
      card.append(image);
    }

    const copy = document.createElement("div");
    copy.className = "identity-qr-copy";
    const heading = document.createElement("h3");
    const qrPosition = entry.qrCount > 1 ? ` (${entry.qrNumber} of ${entry.qrCount})` : "";
    heading.textContent = `${entry.hotelName} — ${entry.qrImage ? `My QR Keycard${qrPosition}` : "Reservation status"}`;
    const reservation = document.createElement("p");
    reservation.textContent = `Reservation ID: ${entry.reference}`;
    const stay = document.createElement("p");
    stay.textContent = `Stay: ${formatIdentityDate(entry.checkIn)} – ${formatIdentityDate(entry.checkOut)}`;
    copy.append(heading, reservation, stay);

    if (entry.qrImage) {
      const status = document.createElement("span");
      status.className = `identity-status is-${entry.status}`;
      status.textContent = `QR: ${entry.status.replaceAll("_", " ")}`;
      const actions = document.createElement("div");
      actions.className = "identity-card-actions";
      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.textContent = "View QR Keycard";
      viewButton.addEventListener("click", () => {
        closeIdentityDialogs();
        document.getElementById("qr-view-title").textContent =
          `${entry.hotelName} — My QR Keycard${qrPosition}`;
        document.getElementById("qr-view-image").src = entry.qrImage;
        document.getElementById("qr-view-details").textContent =
          `Reservation ${entry.reference} · ${formatIdentityDate(entry.checkIn)} – ${formatIdentityDate(entry.checkOut)}`;
        const download = document.getElementById("qr-view-download");
        download.href = entry.qrImage;
        download.download = `cebustays-${entry.reference}-qr-keycard${entry.qrCount > 1 ? `-${entry.qrNumber}` : ""}.png`;
        document.getElementById("qr-view-dialog").showModal();
      });
      const download = document.createElement("a");
      download.href = entry.qrImage;
      download.download = `cebustays-${entry.reference}-qr-keycard${entry.qrCount > 1 ? `-${entry.qrNumber}` : ""}.png`;
      download.textContent = "Download QR Keycard";
      actions.append(viewButton, download);
      copy.append(status, actions);
    } else {
      const status = document.createElement("span");
      status.className = "identity-status is-pending";
      status.textContent = entry.status.replaceAll("_", " ");
      const nextStep = document.createElement("p");
      nextStep.textContent = entry.status === "awaiting_counter_ids"
        ? "Reservation approved. Show two valid IDs at the hotel counter; staff will confirm them and make your QR Keycard available here."
        : entry.status === "awaiting_staff_approval"
          ? "Your online payment is confirmed. Your reservation is still waiting for staff approval."
          : "Complete payment or check your reservation details to continue.";
      copy.append(status, nextStep);
    }
    card.append(copy);
    list.append(card);
  });
}

async function openMyQrDashboard() {
  if (!signedInAccount) {
    setAccountView("login");
    accountDialog.showModal();
    return;
  }
  closeIdentityDialogs();
  const dialog = document.getElementById("my-qr-dialog");
  const message = document.getElementById("my-qr-message");
  const list = document.getElementById("my-qr-list");
  const tabs = document.getElementById("my-qr-categories");
  dialog.showModal();
  message.textContent = "Loading your QR Keycards…";
  list.replaceChildren();
  tabs.replaceChildren();
  try {
    const data = await requestApi("/api/qr-cards/mine");
    myQrCategories = data.categories;
    const labels = [
      ["active", "My QR Keycard"],
      ["pendingVerification", "Reservation status"],
      ["completed", "Past stays"],
      ["cancelled", "Cancelled / invalid"]
    ];
    const defaultCategory = myQrCategories.active?.length
      ? "active"
      : myQrCategories.pendingVerification?.length
        ? "pendingVerification"
        : "active";
    labels.forEach(([category, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.qrCategory = category;
      button.textContent = `${label} (${myQrCategories[category]?.length ?? 0})`;
      button.setAttribute("aria-pressed", String(category === defaultCategory));
      button.addEventListener("click", () => renderMyQrCategory(category));
      tabs.append(button);
    });
    message.textContent = myQrCategories.active?.length
      ? "Your issued QR Keycards are ready to view or download."
      : myQrCategories.pendingVerification?.length
        ? "Your reservation status is shown below. QR Keycards are issued only after staff confirms two valid IDs at the hotel counter."
        : "Your QR Keycard appears here after staff approves your reservation and confirms two valid IDs at the hotel counter.";
    renderMyQrCategory(defaultCategory);
  } catch (error) {
    message.textContent = error.message;
  }
}

function initializeIdentityExperience() {
  document.getElementById("sidebar-qr-codes").addEventListener("click", () => {
    void openMyQrDashboard();
  });
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
  if (!Number.isFinite(Number(coupon.discountValue))) {
    return "Discount details unavailable";
  }
  return coupon.discountType === "percentage"
    ? `${coupon.discountValue}% off${coupon.maxDiscount ? `, up to ${peso.format(coupon.maxDiscount)}` : ""}`
    : `${peso.format(coupon.discountValue)} off`;
}

function isHotelBookingCoupon(coupon) {
  return typeof coupon.campaignId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(coupon.id);
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

function registrationOtpEndpoint(form, role, verify = false) {
  const prefix = role === "developer" ? "/developer/register" : "/register";
  return `${prefix}/${verify ? "verify-otp" : "request-otp"}`;
}

async function submitRegistrationForm(event, role) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button[type=submit]");
  const credentials = form.querySelector("[data-registration-credentials]");
  const values = Object.fromEntries(new FormData(form));
  const verifying = Boolean(form.dataset.challengeId);
  submit.disabled = true;
  accountMessage.textContent = "";

  try {
    const data = await requestAccountApi(
      registrationOtpEndpoint(form, role, verifying),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifying
          ? { email: values.email, challengeId: form.dataset.challengeId, otp: values.otp }
          : { ...values, inviteCode: role === "developer" ? values.inviteCode : undefined })
      }
    );
    if (!verifying) {
      form.dataset.challengeId = data.challengeId;
      if (credentials) credentials.hidden = true;
      form.querySelector("[data-registration-otp]").hidden = false;
      form.querySelector('input[name="otp"]').required = true;
      form.querySelector("[data-registration-status]").textContent = "Enter the code sent to your Gmail to finish creating the account.";
      submit.textContent = role === "developer" ? "Verify code & create developer account" : "Verify code & create account";
      accountMessage.textContent = "Your account will only be created after the code is verified.";
      return;
    }
    form.reset();
    delete form.dataset.challengeId;
    if (credentials) credentials.hidden = false;
    form.querySelector("[data-registration-otp]").hidden = true;
    form.querySelector('input[name="otp"]').required = false;
    submit.textContent = role === "developer" ? "Create developer account" : "Create standard account";
    updateAccountDisplay(data.user);
    if (data.user?.role === "developer") {
      accountDialog.close();
      return;
    }
    accountMessage.textContent = data.welcomeCouponAwarded
      ? "Welcome to CebuStays! Your new-account coupon is now available in My Coupons."
      : data.user?.role === "developer"
        ? "You're signed in. Choose Developer dashboard from the side panel to continue."
        : "You're signed in.";
  } catch (error) {
    accountMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

async function resendRegistrationOtp(form, role) {
  const values = Object.fromEntries(new FormData(form));
  const status = form.querySelector("[data-registration-status]");
  try {
    const data = await requestAccountApi(registrationOtpEndpoint(form, role), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    form.dataset.challengeId = data.challengeId;
    form.querySelector('input[name="otp"]').value = "";
    status.textContent = "A new OTP was sent to your Gmail.";
  } catch (error) {
    accountMessage.textContent = error.message;
  }
}

async function submitForgotPasswordForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = document.getElementById("forgot-password-submit");
  const values = Object.fromEntries(new FormData(form));
  const challengeId = form.dataset.challengeId;
  const otpVerified = form.dataset.otpVerified === "true";
  submit.disabled = true;
  accountMessage.textContent = "";
  try {
    if (!challengeId) {
      const data = await requestAccountApi("/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email })
      });
      if (!data.eligible) {
        accountMessage.textContent = "If this Gmail account is eligible, an OTP will be sent.";
        return;
      }
      form.dataset.challengeId = data.challengeId;
      document.getElementById("forgot-otp-step").hidden = false;
      form.querySelector('input[name="otp"]').required = true;
      submit.textContent = "Verify OTP";
      startForgotResendCooldown();
      accountMessage.textContent = "OTP sent. Enter it before choosing a new password.";
      return;
    }
    if (!otpVerified) {
      await requestAccountApi("/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, email: values.email, otp: values.otp })
      });
      form.dataset.otpVerified = "true";
      document.getElementById("forgot-new-password").hidden = false;
      form.querySelector('input[name="newPassword"]').required = true;
      form.querySelector('input[name="confirmPassword"]').required = true;
      submit.textContent = "Reset password";
      accountMessage.textContent = "OTP verified. You may now create a new password.";
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      throw new Error("The new password fields must match.");
    }
    await requestAccountApi("/forgot-password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, email: values.email, newPassword: values.newPassword })
    });
    form.reset();
    delete form.dataset.challengeId;
    delete form.dataset.otpVerified;
    document.getElementById("forgot-otp-step").hidden = true;
    document.getElementById("forgot-new-password").hidden = true;
    submit.textContent = "Send OTP";
    setAccountView("login");
    document.querySelector('#account-form-login input[name="email"]').value = values.email;
    accountMessage.textContent = "Password updated. Sign in with your new password.";
  } catch (error) {
    accountMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

async function resendForgotPasswordOtp() {
  const form = document.getElementById("forgot-password-form");
  const resendButton = document.getElementById("forgot-password-resend");
  const email = form.querySelector('input[name="email"]').value;
  resendButton.disabled = true;
  resendButton.textContent = "Sending…";
  try {
    const data = await requestAccountApi("/forgot-password/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (!data.eligible) throw new Error("If this Gmail account is eligible, an OTP will be sent.");
    form.dataset.challengeId = data.challengeId;
    delete form.dataset.otpVerified;
    form.querySelector('input[name="otp"]').value = "";
    document.getElementById("forgot-new-password").hidden = true;
    document.getElementById("forgot-password-submit").textContent = "Verify OTP";
    startForgotResendCooldown();
    accountMessage.textContent = "A new OTP was sent to your Gmail.";
  } catch (error) {
    accountMessage.textContent = error.message;
    resendButton.disabled = false;
    resendButton.textContent = "Resend OTP";
  }
}

let forgotResendTimer = null;

function startForgotResendCooldown(seconds = 30) {
  const button = document.getElementById("forgot-password-resend");
  const status = document.getElementById("forgot-resend-status");
  if (!button || !status) return;
  window.clearInterval(forgotResendTimer);
  let remaining = seconds;
  button.disabled = true;
  button.textContent = "Resend OTP";
  status.textContent = `You can resend in ${remaining}s.`;
  forgotResendTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      window.clearInterval(forgotResendTimer);
      forgotResendTimer = null;
      button.disabled = false;
      status.textContent = "";
      return;
    }
    status.textContent = `You can resend in ${remaining}s.`;
  }, 1000);
}

function initializePasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      button.title = visible ? "Show password" : "Hide password";
    });
  });
}

function initializePasswordStrength() {
  for (const id of ["register-password", "developer-password", "forgot-new-password-input"]) {
    const input = document.getElementById(id);
    const label = input?.closest("label");
    if (!input || !label || document.getElementById(`${id}-strength`)) continue;

    const indicator = document.createElement("div");
    indicator.id = `${id}-strength`;
    indicator.className = "password-strength";
    indicator.dataset.level = "weak";
    indicator.hidden = true;

    const progress = document.createElement("div");
    progress.className = "password-strength-track";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Password strength");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "5");
    progress.setAttribute("aria-valuenow", "0");
    progress.setAttribute("aria-valuetext", "Weak");

    const bar = document.createElement("span");
    bar.className = "password-strength-bar";
    progress.append(bar);

    const status = document.createElement("span");
    status.className = "password-strength-label";
    status.setAttribute("aria-live", "polite");
    status.textContent = "Weak";

    indicator.append(progress, status);
    label.insertAdjacentElement("afterend", indicator);

    const update = () => {
      const password = input.value;
      if (!password) {
        indicator.hidden = true;
        delete input.dataset.passwordStrength;
        progress.setAttribute("aria-valuenow", "0");
        progress.setAttribute("aria-valuetext", "Not entered");
        status.textContent = "";
        return;
      }

      const criteria = [
        [...password].length >= 12,
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9\s]/.test(password) && new TextEncoder().encode(password).length <= 128
      ];
      const score = criteria.filter(Boolean).length;
      const level = score === criteria.length ? "strong" : score >= 3 ? "moderate" : "weak";
      const labelText = level.charAt(0).toUpperCase() + level.slice(1);
      indicator.hidden = false;
      indicator.dataset.level = level;
      input.dataset.passwordStrength = level;
      progress.setAttribute("aria-valuenow", String(score));
      progress.setAttribute("aria-valuetext", labelText);
      status.textContent = labelText;
    };

    input.addEventListener("input", update);
    update();
  }
}

async function submitAccountForm(event, endpoint) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button[type=submit]");
  const values = Object.fromEntries(new FormData(form));
  const isLogin = endpoint === "/login";
  const challengeId = isLogin ? form.dataset.challengeId : "";
  const verifyingLogin = Boolean(challengeId);

  submit.disabled = true;
  accountMessage.textContent = "";

  try {
    const data = await requestAccountApi(verifyingLogin ? "/login/verify-otp" : endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verifyingLogin
        ? { email: values.email, challengeId, otp: values.otp }
        : values)
    });
    if (isLogin && !verifyingLogin) {
      form.dataset.challengeId = data.challengeId;
      document.getElementById("login-credentials").hidden = true;
      document.getElementById("login-otp-step").hidden = false;
      document.getElementById("forgot-password-open").hidden = true;
      form.querySelector('input[name="otp"]').required = true;
      submit.textContent = "Verify code";
      startLoginResendCooldown();
      document.getElementById("login-otp-instructions").textContent = `Login code sent to ${values.email}. Enter it to finish signing in.`;
      accountMessage.textContent = "Check your email for the login code.";
      return;
    }
    form.reset();
    if (isLogin) {
      delete form.dataset.challengeId;
      document.getElementById("login-credentials").hidden = false;
      document.getElementById("login-otp-step").hidden = true;
      document.getElementById("forgot-password-open").hidden = false;
      form.querySelector('input[name="otp"]').required = false;
      submit.textContent = "Sign in";
      clearLoginResendCooldown();
    }
    updateAccountDisplay(data.user);
    if (data.user && endpoint !== "/register") accountDialog.close();
    accountMessage.textContent = data.welcomeCouponAwarded
      ? "Welcome to CebuStays! Your new-account coupon is now available in My Coupons."
      : data.user?.role === "developer"
        ? "You're signed in. Choose Developer dashboard from the side panel to continue."
        : "You're signed in.";
  } catch (error) {
    accountMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

async function resendLoginOtp() {
  const form = document.getElementById("account-form-login");
  const resendButton = document.getElementById("login-otp-resend");
  const values = Object.fromEntries(new FormData(form));
  resendButton.disabled = true;
  resendButton.textContent = "Sending…";
  try {
    const data = await requestAccountApi("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email, password: values.password })
    });
    form.dataset.challengeId = data.challengeId;
    form.querySelector('input[name="otp"]').value = "";
    startLoginResendCooldown();
    document.getElementById("login-otp-instructions").textContent = `A new login code was sent to ${values.email}.`;
    accountMessage.textContent = "A new login code was sent to your email.";
  } catch (error) {
    accountMessage.textContent = error.message;
    resendButton.disabled = false;
    resendButton.textContent = "Resend code";
  }
}

let loginResendTimer = null;

function startLoginResendCooldown(seconds = 30) {
  const button = document.getElementById("login-otp-resend");
  const status = document.getElementById("login-otp-resend-status");
  if (!button || !status) return;
  window.clearInterval(loginResendTimer);
  let remaining = seconds;
  button.disabled = true;
  button.textContent = "Resend code";
  status.textContent = `You can resend in ${remaining}s.`;
  loginResendTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearLoginResendCooldown();
      return;
    }
    status.textContent = `You can resend in ${remaining}s.`;
  }, 1000);
}

function clearLoginResendCooldown() {
  window.clearInterval(loginResendTimer);
  loginResendTimer = null;
  const button = document.getElementById("login-otp-resend");
  const status = document.getElementById("login-otp-resend-status");
  if (button) button.disabled = false;
  if (status) status.textContent = "";
}

async function handlePaymentReturn() {
  const query = new URLSearchParams(window.location.search);
  const outcome = query.get("payment");
  const reference = query.get("reference");
  if (!["success", "cancelled"].includes(outcome) || !reference) return;

  query.delete("payment");
  query.delete("reference");
  const cleanUrl = `${window.location.pathname}${query.size ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", cleanUrl);

  let message;
  let paymentVerified = false;
  let paymentDetails = null;
  if (outcome === "cancelled") {
    message = "Checkout was closed. The return page does not determine payment status; check Reservation History before retrying while the room hold is active.";
  } else {
    try {
      const data = await requestApi(
        `/api/bookings/${encodeURIComponent(reference)}/payment-status`
      );
      paymentDetails = data.payment;
      paymentVerified = data.payment.paymentStatus === "paid" || data.payment.onlinePaymentVerified === true;
      message = data.payment.paymentReference
        ? `Xendit verified the payment for ${reference}. Payment reference: ${data.payment.paymentReference}. Your reservation is pending staff approval; you do not need to pay again.`
        : data.payment.paymentStatus === "paid"
          ? `Your reservation ${reference} was accepted and payment is confirmed. Total paid: ${pesoExact.format(data.payment.totalPrice)}.`
          : "Xendit has not confirmed this payment yet. Check Reservation History before retrying. Unpaid reservations are cancelled after 36 hours.";
    } catch (error) {
      message = `We couldn't verify the payment status yet: ${error.message} Check Reservation History before trying to pay again.`;
    }
  }

  const reservationsDialog = document.getElementById("reservation-history-dialog");
  let reservations = [];
  if (reservationsDialog && signedInAccount && !paymentVerified) {
    reservationsDialog.showModal();
    startReservationHistoryRefresh();
    reservations = await loadReservationHistory();
  } else if (signedInAccount) {
    reservations = await loadReservationHistory();
  }
  if (paymentVerified) {
    const reservation = reservations.find(entry => entry.reference === reference) || {};
    openPaymentReceipt({
      ...reservation,
      ...paymentDetails,
      reference: paymentDetails.reference || reference,
      paymentCheckoutStatus: paymentDetails.checkoutStatus || reservation.paymentCheckoutStatus,
      paymentMethod: paymentDetails.paymentMethod || reservation.paymentMethod,
      paymentReference: paymentDetails.paymentReference || reservation.paymentReference,
      totalPrice: Number(paymentDetails.totalPrice ?? reservation.totalPrice),
      paidAt: paymentDetails.paidAt || reservation.paidAt
    });
  } else {
    showBookingThankYou(reference, message);
  }
}

let bookingThankYouDismissTimer = 0;
let bookingThankYouCloseTimer = 0;

function dismissBookingThankYou() {
  const dialog = document.getElementById("booking-thank-you");
  if (!dialog?.open) return;

  window.clearTimeout(bookingThankYouDismissTimer);
  window.clearTimeout(bookingThankYouCloseTimer);
  dialog.classList.remove("is-visible");
  bookingThankYouCloseTimer = window.setTimeout(() => {
    if (dialog.open && !dialog.classList.contains("is-visible")) dialog.close();
  }, 400);
}

function showBookingThankYou(
  reference,
  details = "We appreciate you choosing CebuStays. Your reservation details are available in Reservation History."
) {
  const dialog = document.getElementById("booking-thank-you");
  if (!dialog) return;

  window.clearTimeout(bookingThankYouDismissTimer);
  window.clearTimeout(bookingThankYouCloseTimer);
  document.getElementById("booking-thank-you-message").textContent = details;
  const referenceMessage = document.getElementById("booking-thank-you-reference");
  referenceMessage.textContent = reference ? `Reservation reference: ${reference}` : "";
  if (!dialog.open) dialog.show();
  dialog.classList.remove("is-visible");
  void dialog.offsetWidth;
  dialog.classList.add("is-visible");
  bookingThankYouDismissTimer = window.setTimeout(dismissBookingThankYou, 10_000);
}

function initializeBookingThankYou() {
  const dialog = document.getElementById("booking-thank-you");
  dialog.addEventListener("pointerdown", dismissBookingThankYou);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    dismissBookingThankYou();
  });
  dialog.querySelector(".booking-thank-you-close")
    .addEventListener("click", dismissBookingThankYou);
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

  document.querySelectorAll("[data-account-view]").forEach(tab => {
    tab.addEventListener("click", () => setAccountView(tab.dataset.accountView));
  });

  const loginForm = document.getElementById("account-form-login");
  const registerForm = document.getElementById("account-form-register");
  const developerForm = document.getElementById("account-form-developer");
  const forgotForm = document.getElementById("forgot-password-form");

  if (loginForm) {
    loginForm.addEventListener("submit", event => submitAccountForm(event, "/login"));
    document.getElementById("login-otp-resend")?.addEventListener("click", resendLoginOtp);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", event => submitRegistrationForm(event, "standard"));
  }

  if (developerForm) {
    developerForm.addEventListener("submit", event => submitRegistrationForm(event, "developer"));
  }

  document.getElementById("forgot-password-open")?.addEventListener("click", () => {
    document.getElementById("account-entry").hidden = true;
    forgotForm.hidden = false;
    forgotForm.querySelector('input[name="email"]').focus();
  });
  document.getElementById("forgot-password-back")?.addEventListener("click", () => {
    forgotForm.reset();
    delete forgotForm.dataset.challengeId;
    delete forgotForm.dataset.otpVerified;
    document.getElementById("forgot-otp-step").hidden = true;
    document.getElementById("forgot-new-password").hidden = true;
    document.getElementById("forgot-password-submit").textContent = "Send OTP";
    document.getElementById("account-entry").hidden = false;
    forgotForm.hidden = true;
    setAccountView("login");
  });
  forgotForm?.addEventListener("submit", submitForgotPasswordForm);
  document.getElementById("forgot-password-resend")?.addEventListener("click", resendForgotPasswordOtp);
  initializePasswordToggles();
  initializePasswordStrength();

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
    .then(data => {
      updateAccountDisplay(data.user);
      void handlePaymentReturn();
    })
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

  reservationsDialog.addEventListener("close", () => {
    stopReservationHistoryRefresh();
  });
}

function initializeSidebarDialogBackdropDismissal() {
  document.querySelectorAll("dialog.sidebar-option-dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });
}

function initializeCancellationDialogs() {
  const reasonDialog = document.getElementById("cancellation-reason-dialog");
  const reasonForm = document.getElementById("cancellation-reason-form");
  const reasonInput = document.getElementById("cancellation-reason-input");
  const reasonMessage = document.getElementById("cancellation-reason-message");
  const reasonSubmit = document.getElementById("cancellation-reason-submit");
  const noticeDialog = document.getElementById("cancellation-notice-dialog");

  reasonForm.addEventListener("submit", async event => {
    event.preventDefault();
    const reason = reasonInput.value.trim();
    if (reason.length < 10 || reason.length > 500) {
      reasonMessage.textContent = "Please enter a reason between 10 and 500 characters.";
      reasonInput.focus();
      return;
    }

    reasonSubmit.disabled = true;
    reasonSubmit.textContent = "Submitting…";
    reasonMessage.textContent = "";
    try {
      await requestApi(`/api/bookings/${encodeURIComponent(reasonDialog.dataset.reference)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      reasonDialog.close();
      await loadReservationHistory();
      noticeDialog.showModal();
    } catch (error) {
      reasonMessage.textContent = error.message;
    } finally {
      reasonSubmit.disabled = false;
      reasonSubmit.textContent = "Submit request";
    }
  });

}

function formatReservationDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function isReceiptAvailable(reservation) {
  return reservation?.paymentStatus === "paid" || (
    reservation?.paymentMethod === "online" &&
    reservation?.paymentCheckoutStatus === "paid" &&
    Boolean(reservation?.paymentReference)
  );
}

function formatReceiptPaidAt(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(date);
}

let activePaymentReceipt = null;

function openPaymentReceipt(receipt) {
  if (!isReceiptAvailable(receipt)) return;
  activePaymentReceipt = receipt;
  document.getElementById("payment-receipt-hotel").textContent = receipt.hotelName || "CebuStays reservation";
  document.getElementById("payment-receipt-guest").textContent =
    receipt.guestName || signedInAccount?.displayName || signedInAccount?.email || "Guest";
  document.getElementById("payment-receipt-stay").textContent = receipt.checkIn && receipt.checkOut
    ? `${formatReservationDate(receipt.checkIn)} – ${formatReservationDate(receipt.checkOut)}`
    : "Reservation stay";
  document.getElementById("payment-receipt-method").textContent = receipt.paymentMethod === "online"
    ? `Online payment${receipt.paymentProvider ? ` · ${receipt.paymentProvider}` : ""}`
    : "Paid at hotel counter";
  document.getElementById("payment-receipt-paid-at").textContent = formatReceiptPaidAt(receipt.paidAt);
  document.getElementById("payment-receipt-reference").textContent = receipt.paymentReference || "Not provided";
  document.getElementById("payment-receipt-reservation").textContent = receipt.reference || "Not provided";
  document.getElementById("payment-receipt-total").textContent = pesoExact.format(Number(receipt.totalPrice || 0));
  document.getElementById("payment-receipt-dialog").showModal();
}

function downloadPaymentReceipt(receipt) {
  if (!isReceiptAvailable(receipt)) return;
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 1180;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#eef3f1";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(40, 40, 880, 1100);
  context.fillStyle = "#173a35";
  context.fillRect(40, 40, 880, 190);
  context.fillStyle = "#ffffff";
  context.font = "700 30px Georgia, serif";
  context.fillText("CEBUSTAYS", 88, 104);
  context.font = "500 20px Arial, sans-serif";
  context.fillStyle = "#d8e6e1";
  context.fillText("PAYMENT RECEIPT", 88, 150);
  context.fillStyle = "#dff4e8";
  context.fillRect(700, 76, 168, 48);
  context.fillStyle = "#176246";
  context.font = "700 16px Arial, sans-serif";
  context.fillText("PAYMENT VERIFIED", 716, 106);

  context.fillStyle = "#51645f";
  context.font = "600 18px Arial, sans-serif";
  context.fillText("AMOUNT PAID", 88, 292);
  context.fillStyle = "#173a35";
  context.font = "700 48px Arial, sans-serif";
  context.fillText(pesoExact.format(Number(receipt.totalPrice || 0)), 88, 354);

  const method = receipt.paymentMethod === "online"
    ? `Online payment${receipt.paymentProvider ? ` · ${receipt.paymentProvider}` : ""}`
    : "Paid at hotel counter";
  const stay = receipt.checkIn && receipt.checkOut
    ? `${formatReservationDate(receipt.checkIn)} – ${formatReservationDate(receipt.checkOut)}`
    : "Reservation stay";
  const rows = [
    ["Hotel", receipt.hotelName || "CebuStays reservation"],
    ["Guest", receipt.guestName || signedInAccount?.displayName || signedInAccount?.email || "Guest"],
    ["Stay", stay],
    ["Payment method", method],
    ["Date paid", formatReceiptPaidAt(receipt.paidAt)],
    ["Provider payment reference", receipt.paymentReference || "Not provided"],
    ["Reservation reference", receipt.reference || "Not provided"]
  ];
  let y = 430;
  rows.forEach(([label, value]) => {
    context.strokeStyle = "#e2e9e6";
    context.beginPath();
    context.moveTo(88, y - 28);
    context.lineTo(872, y - 28);
    context.stroke();
    context.fillStyle = "#61716d";
    context.font = "500 17px Arial, sans-serif";
    context.fillText(label.toUpperCase(), 88, y + 8);
    context.fillStyle = "#1c302c";
    context.font = "600 21px Arial, sans-serif";
    context.fillText(String(value), 88, y + 42, 780);
    y += 88;
  });
  context.fillStyle = "#61716d";
  context.font = "500 16px Arial, sans-serif";
  context.fillText("Present this payment confirmation with your reservation at the hotel counter.", 88, 1060, 780);
  context.fillText("Verify payment details with CebuStays staff.", 88, 1092);

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cebustays-receipt-${receipt.reference || "reservation"}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

async function downloadVerifiedReservationReceipt(reservation) {
  const data = await requestApi(
    `/api/bookings/${encodeURIComponent(reservation.reference)}/payment-status`
  );
  const payment = data.payment;
  if (payment.paymentStatus !== "paid" && payment.onlinePaymentVerified !== true) {
    throw new Error("Payment is not verified yet. Check Reservation History before downloading a receipt.");
  }
  downloadPaymentReceipt({
    ...reservation,
    ...payment,
    reference: payment.reference || reservation.reference,
    paymentCheckoutStatus: payment.checkoutStatus || reservation.paymentCheckoutStatus,
    paymentMethod: payment.paymentMethod || reservation.paymentMethod,
    paymentReference: payment.paymentReference || reservation.paymentReference,
    totalPrice: Number(payment.totalPrice ?? reservation.totalPrice),
    paidAt: payment.paidAt || reservation.paidAt
  });
}

function initializePaymentReceipt() {
  document.getElementById("payment-receipt-download")
    .addEventListener("click", () => {
      if (activePaymentReceipt) downloadPaymentReceipt(activePaymentReceipt);
    });
}

let activeReviewReservation = null;

function setReviewRating(rating) {
  document.getElementById("hotel-review-rating").value = String(rating);
  document.querySelectorAll("#hotel-review-stars button").forEach(button => {
    const selected = Number(button.dataset.rating) <= rating;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(Number(button.dataset.rating) === rating));
  });
}

function openReviewDialog(reservation, readOnly = false) {
  activeReviewReservation = reservation;
  const dialog = document.getElementById("hotel-review-dialog");
  const form = document.getElementById("hotel-review-form");
  const comment = document.getElementById("hotel-review-comment");
  const submit = document.getElementById("hotel-review-submit");
  const message = document.getElementById("hotel-review-message");
  const existingReview = readOnly ? reservation.review : null;

  form.reset();
  message.textContent = "";
  document.getElementById("hotel-review-title").textContent = readOnly ? "Your hotel review" : "Review your stay";
  document.getElementById("hotel-review-name").textContent = reservation.hotelName;
  comment.readOnly = readOnly;
  comment.value = existingReview?.comment || "";
  submit.hidden = readOnly;
  document.querySelectorAll("#hotel-review-stars button").forEach(button => {
    button.disabled = readOnly;
  });
  setReviewRating(existingReview?.rating || 0);
  if (!readOnly) {
    document.getElementById("hotel-review-rating").value = "";
    document.querySelectorAll("#hotel-review-stars button").forEach(button => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
  }
  dialog.showModal();
}

function initializeReviewForm() {
  const reviewListDialog = document.getElementById("hotel-review-list-dialog");
  document.getElementById("hotel-review-list-close").addEventListener("click", () => {
    reviewListDialog.close();
  });
  reviewListDialog.addEventListener("click", event => {
    if (event.target === reviewListDialog) reviewListDialog.close();
  });

  document.querySelectorAll("#hotel-review-stars button").forEach(button => {
    button.addEventListener("click", () => setReviewRating(Number(button.dataset.rating)));
  });
  document.getElementById("hotel-review-dialog").addEventListener("click", event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  document.getElementById("hotel-review-form").addEventListener("submit", async event => {
    event.preventDefault();
    const reservation = activeReviewReservation;
    const form = event.currentTarget;
    const rating = Number(document.getElementById("hotel-review-rating").value);
    const comment = document.getElementById("hotel-review-comment").value.trim();
    const submit = document.getElementById("hotel-review-submit");
    const message = document.getElementById("hotel-review-message");

    if (!reservation || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      message.textContent = "Choose a rating from 1 to 5 stars.";
      return;
    }
    if (comment.length > 2000) {
      message.textContent = "Review comments must be 2,000 characters or fewer.";
      return;
    }

    submit.disabled = true;
    message.textContent = "Submitting your review…";
    try {
      const result = await requestApi(`/api/reviews/${encodeURIComponent(reservation.reference)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment })
      });
      const hotel = hotels.find(item => item.id === reservation.hotelId);
      if (hotel) {
        hotel.userReviews = [result.review, ...(hotel.userReviews || [])];
        hotel.reviews = hotel.userReviews.length;
        hotel.score = hotel.userReviews.reduce((sum, review) => sum + Number(review.rating), 0) / hotel.reviews;
        if (activeDetailHotel?.id === hotel.id) {
          renderHotelCommentPreview(
            document.getElementById("detail-reviews-preview"),
            hotel
          );
        }
        render();
      }
      message.textContent = result.rewarded
        ? "Review saved. You earned 0.5 Cebu Points."
        : "Review saved.";
      try {
        await refreshCebuPoints();
      } catch (error) {
        console.warn("The review was saved, but the Cebu Points balance could not refresh.", error);
      }
      await loadReservationHistory();
      window.setTimeout(() => document.getElementById("hotel-review-dialog").close(), 600);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
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
      message.textContent = "No active reservations.";
      return [];
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
          : isPaid
            ? reservation.paymentMethod === "online"
              ? "Accepted — paid"
              : "Paid"
            : reservation.paymentCheckoutStatus === "paid"
              ? "Paid online — awaiting staff approval"
              : "Pending payment";
      heading.append(hotelName, status);

      const dates = document.createElement("p");
      dates.textContent = `${formatReservationDate(reservation.checkIn)} – ${formatReservationDate(reservation.checkOut)}`;
      const details = document.createElement("p");
      const bedrooms = Number(reservation.bedrooms || 1);
      details.textContent = `${reservation.rooms} room${reservation.rooms === 1 ? "" : "s"} · ${bedrooms} bedroom${bedrooms === 1 ? "" : "s"} · ${pesoExact.format(reservation.totalPrice)}` +
        (reservation.couponDiscount ? ` · Coupon discount ${peso.format(reservation.couponDiscount)}` : "");
      const reference = document.createElement("small");
      reference.textContent = `Confirmation ${reservation.reference}`;

      const actionRow = document.createElement("div");
      actionRow.className = "reservation-item-actions";
      if (isReceiptAvailable(reservation)) {
        const receiptButton = document.createElement("button");
        receiptButton.type = "button";
        receiptButton.className = "btn btn-ghost reservation-rate reservation-receipt";
        receiptButton.textContent = "Download your receipt";
        receiptButton.addEventListener("click", async () => {
          receiptButton.disabled = true;
          receiptButton.textContent = "Preparing receipt…";
          try {
            await downloadVerifiedReservationReceipt(reservation);
          } catch (error) {
            window.alert(error.message);
          } finally {
            receiptButton.disabled = false;
            receiptButton.textContent = "Download your receipt";
          }
        });
        actionRow.append(receiptButton);
      }
      if (reservation.paymentReference) {
        const paymentReference = document.createElement("small");
        paymentReference.className = "reservation-payment-reference";
        paymentReference.textContent =
          `${reservation.paymentProvider === "paymongo" ? "PayMongo" : "Xendit"} verified payment reference: ${reservation.paymentReference}. ${
            isPaid
              ? "Your reservation has been accepted."
              : "Your reservation is pending staff approval; you do not need to pay again."
          }`;
        actionRow.append(paymentReference);
      } else if (
        reservation.paymentMethod === "online" &&
        reservation.paymentStatus === "pending" &&
        reservation.paymentCheckoutStatus === "paid"
      ) {
        const paymentVerification = document.createElement("small");
        paymentVerification.className = "reservation-payment-reference";
        paymentVerification.textContent =
          "The payment provider confirmed your payment. Your reservation is pending staff approval; you do not need to pay again.";
        actionRow.append(paymentVerification);
      }

      if (
        !reservation.cancelledAt &&
        reservation.paymentStatus === "pending" &&
        reservation.cancellationStatus !== "requested" &&
        reservation.paymentCheckoutStatus !== "paid"
      ) {
        if (reservation.paymentMethod === "counter") {
          const counterPayment = document.createElement("small");
          counterPayment.className = "reservation-payment-reference";
          counterPayment.textContent = "Pay at the hotel counter within 36 hours of submitting your reservation.";
          actionRow.append(counterPayment);
        } else {
          const payButton = document.createElement("button");
          payButton.type = "button";
          payButton.className = "btn btn-primary reservation-rate";
          payButton.textContent = "Pay online";
          payButton.addEventListener("click", async () => {
            payButton.disabled = true;
            payButton.textContent = "Opening checkout…";
            try {
              const result = await requestApi(
                `/api/bookings/${encodeURIComponent(reservation.reference)}/checkout`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    returnPath: `${window.location.pathname}${window.location.search}`
                  })
                }
              );
              window.location.assign(result.checkout.checkoutUrl);
            } catch (error) {
              window.alert(error.message);
              payButton.disabled = false;
              payButton.textContent = "Pay online";
            }
          });
          actionRow.append(payButton);
        }
      }

      if (
        !reservation.cancelledAt &&
        reservation.paymentStatus === "pending" &&
        !isCancellationRequested &&
        reservation.paymentCheckoutStatus !== "paid"
      ) {
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "btn btn-ghost reservation-cancel";
        cancelButton.textContent = "Request cancellation";
        cancelButton.addEventListener("click", () => {
          const reasonDialog = document.getElementById("cancellation-reason-dialog");
          const reasonInput = document.getElementById("cancellation-reason-input");
          const reasonMessage = document.getElementById("cancellation-reason-message");
          reasonDialog.dataset.reference = reservation.reference;
          reasonInput.value = "";
          reasonMessage.textContent = "";
          reasonDialog.showModal();
          reasonInput.focus();
        });
        actionRow.append(cancelButton);
      }

      if (reservation.reviewEligible) {
        const rateButton = document.createElement("button");
        rateButton.type = "button";
        rateButton.className = "btn btn-primary reservation-rate";
        rateButton.textContent = "Rate It";
        rateButton.addEventListener("click", () => openReviewDialog(reservation));
        actionRow.append(rateButton);
      } else if (reservation.review) {
        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "btn btn-ghost reservation-rate";
        viewButton.textContent = "View Review";
        viewButton.addEventListener("click", () => openReviewDialog(reservation, true));
        actionRow.append(viewButton);
      }

      if (reservation.cancellationReason && (reservation.cancelledAt || isCancellationRequested)) {
        const reason = document.createElement("small");
        reason.textContent = `Reason: ${reservation.cancellationReason}`;
        reason.className = "reservation-cancel-reason";
        actionRow.append(reason);
      }

      if (
        !reservation.cancelledAt &&
        reservation.cancellationStatus !== "requested" &&
        (
          reservation.paymentStatus === "paid"
        )
      ) {
        const keycardNote = document.createElement("small");
        keycardNote.className = "reservation-payment-reference";
        keycardNote.textContent =
          "Bring two valid IDs to the hotel counter. After staff checks them, your QR Keycard will be available from My QR Keycard in the side panel.";
        actionRow.append(keycardNote);
      }

      item.append(heading, dates, details, reference, actionRow);
      list.append(item);
    });
    return data.reservations;
  } catch (error) {
    message.textContent = error.message;
    return [];
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
  renderHotelCommentPreview(
    document.getElementById("detail-reviews-preview"),
    hotel
  );
  bookingRequestId = newBookingRequestId();
  lastFocusedElement = document.activeElement;
  const bookingForm = document.getElementById("booking-form");
  bookingForm.reset();
  updateBookingPaymentNote();
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
  const hasHotelRating = hotelReviews > 0 && hotelScore > 0;
  const detailStars = document.getElementById("detail-stars");

  document.getElementById("detail-score").textContent =
    hasHotelRating ? hotelScore.toFixed(1) : "—";

  detailStars.replaceChildren();
  detailStars.hidden = !hasHotelRating;
  if (hasHotelRating) {
    detailStars.appendChild(createStarRating(hotelScore));
  }

  document.getElementById("detail-score-label").textContent =
    hasHotelRating ? scoreLabel(hotelScore) : "No ratings yet";

  document.getElementById("detail-reviews").textContent =
    `${hotelReviews.toLocaleString("en-PH")} ${hotelReviews === 1 ? "review" : "reviews"}`;

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
  const subtotal = Math.round(nightlyRate * stayNights * rooms * 100) / 100;
  const vat = Math.round(subtotal * 0.12 * 100) / 100;
  const amountDue = Math.round((subtotal + vat) * 100) / 100;
  document.getElementById("booking-total").textContent =
    `Room subtotal for ${rooms} room${rooms === 1 ? "" : "s"} · ` +
    `${bedrooms} bedroom${bedrooms === 1 ? "" : "s"} per room · ` +
    `${stayNights} night${stayNights === 1 ? "" : "s"}: ` +
    (Number.isFinite(nightlyRate) && nightlyRate >= 0 && (bedrooms === 1 || activeDetailHotel.price2Bedroom !== null)
      ? `${pesoExact.format(subtotal)} · VAT (12%): ${pesoExact.format(vat)} · Total due: ${pesoExact.format(amountDue)}`
      : "Rate not provided");
}

async function loadBookingCoupons() {
  const select = document.getElementById("booking-coupon");
  if (!select || !signedInAccount) return;
  const selectedId = select.value || preferredCouponId;
  try {
    const coupons = await refreshCouponWallet();
    const bookingCoupons = coupons.filter(
      coupon => coupon.status === "available" && isHotelBookingCoupon(coupon)
    );
    select.replaceChildren(new Option("No coupon", ""));
    bookingCoupons.forEach(coupon => {
      const restriction = coupon.eligibleHotelName
        ? ` · ${coupon.eligibleHotelName}`
        : "";
      select.append(new Option(
        `${coupon.name} — ${couponDiscountText(coupon)}${restriction}`,
        coupon.id
      ));
    });
    if (bookingCoupons.some(coupon => coupon.id === selectedId)) {
      select.value = selectedId;
    } else if (selectedId) {
      preferredCouponId = "";
      document.getElementById("booking-coupon-status").textContent =
        "Only active hotel coupons can discount a room booking. Other Cebu Points rewards are redeemed separately.";
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
    const previewValues = [
      data.preview?.subtotal,
      data.preview?.discount,
      data.preview?.vatAmount,
      data.preview?.amountDue
    ].map(Number);
    if (!previewValues.every(Number.isFinite)) {
      throw new Error("The coupon total could not be calculated. Please choose another coupon or try again.");
    }
    total.textContent =
      `Room subtotal: ${pesoExact.format(previewValues[0])} · ` +
      `Coupon discount: −${pesoExact.format(previewValues[1])} · ` +
      `VAT (12%): ${pesoExact.format(previewValues[2])} · ` +
      `Total due: ${pesoExact.format(previewValues[3])}`;
    message.textContent = "Coupon discount is applied before VAT.";
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

document.getElementById("detail-locate").addEventListener("click", event => {
  if (!activeDetailHotel) return;
  if (!window.CebuStaysMap?.open) {
    window.alert("The map is not available right now. Please try again later.");
    return;
  }
  const hotel = activeDetailHotel;
  const returnFocus = lastFocusedElement?.isConnected
    ? lastFocusedElement
    : event.currentTarget;
  closeHotelDetails();
  window.CebuStaysMap.open(hotel, returnFocus);
});

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
document.getElementById("booking-payment-method").addEventListener("change", () => {
  bookingRequestId = newBookingRequestId();
  updateBookingPaymentNote();
});

function updateBookingPaymentNote() {
  const paymentMethod = document.getElementById("booking-payment-method").value;
  document.getElementById("booking-submit").textContent = paymentMethod === "counter"
    ? "Reserve and pay at counter"
    : "Reserve and pay online";
  document.getElementById("booking-payment-note").textContent = paymentMethod === "counter"
    ? "Pay at the hotel counter within 36 hours of submitting your reservation. Unpaid reservations are automatically cancelled after that."
    : "Continue to Xendit's secure checkout and choose GCash for app payment or QRPh to scan a QR. Pay within 36 hours; payment is confirmed only after provider verification.";
}

function showBookingPaymentDialog(booking, checkoutUrl) {
  if (typeof checkoutUrl !== "string") {
    throw new Error("The secure payment link was invalid. Check Reservation History before trying again.");
  }
  const paymentUrl = new URL(checkoutUrl);
  if (
    !paymentUrl.hostname.endsWith(".xendit.co") ||
    paymentUrl.protocol !== "https:" ||
    paymentUrl.username ||
    paymentUrl.password
  ) {
    throw new Error("The secure payment link was invalid. Check Reservation History before trying again.");
  }

  document.getElementById("booking-payment-reference").textContent =
    `Reservation reference: ${booking.reference}`;
  document.getElementById("booking-payment-total").textContent =
    `Total due: ${pesoExact.format(booking.totalPrice)}`;
  document.getElementById("booking-payment-continue").href = paymentUrl.toString();
  document.getElementById("booking-payment-dialog").showModal();
}

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
  const paymentMethod = values.paymentMethod;
  const couponAssignmentId = document.getElementById("booking-coupon").value;
  submit.disabled = true;
  status.textContent = paymentMethod === "counter"
    ? "Reserving the rooms for counter payment…"
    : "Reserving the rooms and preparing secure checkout…";

  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        couponAssignmentId: couponAssignmentId || null,
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
    if (booking.cancelledAt) {
      form.hidden = true;
      status.textContent =
        `Reservation ${booking.reference} expired before payment was confirmed. ` +
        "Its coupon, if used, is no longer held.";
    } else {
      form.hidden = true;
      if (paymentMethod === "online") {
        status.textContent = "Preparing your secure Xendit GCash / QRPh checkout…";
        const checkout = await requestApi(
          `/api/bookings/${encodeURIComponent(booking.reference)}/checkout`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              returnPath: `${window.location.pathname}${window.location.search}`
            })
          }
        );
        showBookingPaymentDialog(booking, checkout.checkout.checkoutUrl);
        status.textContent =
          `Reservation ${booking.reference} is held for 36 hours. Continue to secure checkout to pay by GCash or QRPh.`;
      } else {
        status.textContent =
          `Reservation ${booking.reference} is held for 36 hours. ` +
          `${booking.couponDiscount
            ? `Voucher discount: ${pesoExact.format(booking.couponDiscount)}. `
            : ""}` +
          "Pay at the hotel counter before the hold expires.";
        showBookingThankYou(
          booking.reference,
          "Your reservation is submitted and waiting for staff approval and payment confirmation. After approval, show two valid IDs at the hotel counter to receive your QR Keycard."
        );
      }
    }
    recordPaidBookingPoints(booking).catch(error => {
      console.error("The reservation succeeded, but Cebu Points could not be refreshed.", error);
    });
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
  if (score >= 4.5) return "Excellent";
  if (score >= 4) return "Very good";
  if (score >= 3) return "Good";
  return "Rated";
}

function createStarRating(score, className = "rating-stars") {
  const stars = el("span", className);
  stars.setAttribute("role", "img");
  stars.setAttribute("aria-label", `${score.toFixed(1)} out of 5 stars`);

  for (let index = 0; index < 5; index++) {
    const fill = Math.max(0, Math.min(1, score - index)) * 100;
    const star = el("span", "rating-star", "★");
    star.style.setProperty("--star-fill", `${fill}%`);
    stars.appendChild(star);
  }

  return stars;
}

function hotelComments(hotel) {
  return (hotel.userReviews || []).filter(review =>
    typeof review.comment === "string" && review.comment.trim()
  );
}

function createHotelReviewEntry(review) {
  const entry = el("article", "hotel-review-entry");
  const heading = el("div", "hotel-review-heading");
  heading.append(
    el("strong", "", review.reviewer || "Guest"),
    createStarRating(Number(review.rating), "rating-stars hotel-review-stars")
  );
  entry.appendChild(heading);
  entry.appendChild(el("p", "hotel-review-comment", review.comment.trim()));
  if (review.createdAt) {
    const reviewDate = new Date(review.createdAt);
    if (Number.isFinite(reviewDate.getTime())) {
      entry.appendChild(el("time", "hotel-review-date", reviewDate.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric"
      })));
    }
  }
  return entry;
}

function openHotelReviewList(hotel) {
  const comments = hotelComments(hotel);
  document.getElementById("hotel-review-list-title").textContent = `${hotel.name} comments`;
  document.getElementById("hotel-review-list-count").textContent =
    `${comments.length} guest comment${comments.length === 1 ? "" : "s"}`;
  document.getElementById("hotel-review-list").replaceChildren(
    ...comments.map(createHotelReviewEntry)
  );
  document.getElementById("hotel-review-list-dialog").showModal();
}

function renderHotelCommentPreview(container, hotel, emptyMessage = "No guest comments yet.") {
  const comments = hotelComments(hotel);
  container.replaceChildren();
  container.appendChild(el("h3", "hotel-detail-reviews-title", "Guest comments"));

  if (comments.length) {
    container.appendChild(createHotelReviewEntry(comments[0]));
    if (comments.length > 1) {
      const moreButton = el("button", "hotel-review-more", `See more (${comments.length})`);
      moreButton.type = "button";
      moreButton.setAttribute("aria-label", `See all ${comments.length} comments for ${hotel.name}`);
      moreButton.addEventListener("click", () => openHotelReviewList(hotel));
      container.appendChild(moreButton);
    }
  } else {
    container.appendChild(el("p", "hotel-review-empty", emptyMessage));
  }
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
  const hasHotelRating = hotelReviews > 0 && hotelScore > 0;
  const label = el("div", "score-label");
  label.appendChild(el(
    "span",
    "",
    hasHotelRating ? scoreLabel(hotelScore) : "No ratings yet"
  ));
  if (hasHotelRating) {
    label.appendChild(createStarRating(hotelScore, "rating-stars score-stars"));
  }

  label.appendChild(
    el(
      "small",
      "",
      `${hotelReviews.toLocaleString("en-PH")} ${hotelReviews === 1 ? "review" : "reviews"}`
    )
  );

  score.append(
    label,
    el(
      "span",
      "score-badge",
      hasHotelRating ? hotelScore.toFixed(1) : "—"
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
    const selectedFilters = [...amenityFilters.querySelectorAll('input[name="amenity"]')]
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value.toLowerCase().trim());

    const filteredHotels = selectedFilters.length
      ? hotels.filter(hotel => {
          const amenities = (Array.isArray(hotel.amenities) ? hotel.amenities : [])
            .map(normalizeAmenity)
            .filter(Boolean);
          return selectedFilters.some(filter => amenities.includes(filter));
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

function normalizeAmenity(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const aliases = {
    "car rentals": "car rental",
    restaurants: "restaurant"
  };
  return aliases[normalized] || normalized;
}

function renderAmenityFilters(hotelList) {
  const legend = amenityFilters.querySelector("legend");
  const counts = new Map();

  hotelList.forEach(hotel => {
    const amenities = Array.isArray(hotel.amenities) ? hotel.amenities : [];
    const hotelAmenities = new Map();

    amenities.forEach(amenity => {
      if (typeof amenity !== "string") return;
      const key = normalizeAmenity(amenity);
      if (!key || key === "placeholder") return;
      const labels = hotelAmenities.get(key) || new Map();
      labels.set(amenity.trim(), (labels.get(amenity.trim()) || 0) + 1);
      hotelAmenities.set(key, labels);
    });

    hotelAmenities.forEach((labels, key) => {
      const entry = counts.get(key) || { count: 0, labels: new Map() };
      entry.count += 1;
      labels.forEach((count, label) => {
        entry.labels.set(label, (entry.labels.get(label) || 0) + count);
      });
      counts.set(key, entry);
    });
  });

  const popularAmenities = [...counts]
    .sort(([firstKey, first], [secondKey, second]) =>
      second.count - first.count || firstKey.localeCompare(secondKey)
    )
    .slice(0, MAX_AMENITY_FILTERS);
  const filterOptions = popularAmenities.map(([key, amenity]) => {
    const label = [...amenity.labels]
      .sort(([firstLabel, firstCount], [secondLabel, secondCount]) =>
        secondCount - firstCount || firstLabel.localeCompare(secondLabel)
      )[0][0]
      .replace(/\bwi[\s-]*fi\b/i, "Wi-Fi");
    const wrapper = el("label", "check");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "amenity";
    checkbox.value = key;
    wrapper.append(checkbox, document.createTextNode(`${label} (${amenity.count})`));
    return wrapper;
  });

  if (filterOptions.length === 0) {
    filterOptions.push(el("p", "filter-loading", "No amenities are currently listed."));
  }
  amenityFilters.replaceChildren(...(legend ? [legend] : []), ...filterOptions);
}

/* ---------- LOAD HOTEL CATALOGUE ---------- */

const HOTEL_CATALOGUE_REQUEST_TIMEOUT_MS = 25_000;
const HOTEL_CATALOGUE_RETRY_DELAYS_MS = [1_000, 2_500];

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

async function requestHotelCatalogue() {
  let lastError;

  for (let attempt = 0; attempt <= HOTEL_CATALOGUE_RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      HOTEL_CATALOGUE_REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(API_URL, {
        credentials: "include",
        signal: controller.signal,
        cache: "no-store"
      });

      if (!response.ok) {
        const error = new Error(`The property API returned HTTP ${response.status}.`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }

      const data = await response.json();
      if (!Array.isArray(data.hotels)) {
        throw new Error("Hotel API returned an invalid response.");
      }
      return data.hotels;
    } catch (error) {
      lastError = error;
      const isRetryable = error.retryable ||
        error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        error instanceof TypeError;
      if (!isRetryable || attempt === HOTEL_CATALOGUE_RETRY_DELAYS_MS.length) {
        break;
      }

      title.textContent = `Reconnecting to the property service… (attempt ${attempt + 2} of 3)`;
      await wait(HOTEL_CATALOGUE_RETRY_DELAYS_MS[attempt]);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw lastError;
}

async function loadHotels() {
  feed.replaceChildren(
    el("div", "skeleton"),
    el("div", "skeleton")
  );
  title.textContent = "Connecting to CebuStays properties…";

  try {
    hotels = await requestHotelCatalogue();
    renderAmenityFilters(hotels);

  } catch (error) {
    console.error(
      "Unable to load the hotel catalogue:",
      error
    );

    title.textContent = "Properties could not be loaded";
    const amenityLegend = amenityFilters.querySelector("legend");
    amenityFilters.replaceChildren(
      ...(amenityLegend ? [amenityLegend] : []),
      el("p", "filter-loading", "Amenities could not be loaded.")
    );

    const errorMessage = el(
      "div",
      "error",
      "Unable to connect to the property service after several attempts. Please try again."
    );
    const retryButton = el("button", "btn btn-primary", "Try again");
    retryButton.type = "button";
    retryButton.addEventListener("click", () => {
      void loadHotels();
    });
    feed.replaceChildren(errorMessage, retryButton);

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

amenityFilters.addEventListener("change", render);

/* ---------- CLEAR FILTERS ---------- */

document
  .getElementById("clear-filters")
  .addEventListener("click", () => {
    amenityFilters.querySelectorAll('input[name="amenity"]').forEach(checkbox => {
      checkbox.checked = false;
    });

    render();
  });

function initializeFloatingPokeball() {
  const launcher = document.getElementById("pokeball-launcher");
  if (!launcher) return;

  const bubble = launcher.querySelector(".pokeball-help-bubble");
  let positioned = false;
  let dragging = false;
  let dragStarted = false;
  let suppressNextClick = false;
  let positionX = 0;
  let positionY = 0;
  let pointerOffsetX = 0;
  let pointerOffsetY = 0;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let previousPointerTime = 0;
  let velocityX = 0;
  let velocityY = 0;
  let animationFrame = 0;
  let helpBubbleTimer = 0;
  let helpBubbleDismissTimer = 0;

  const setHelpBubbleVisible = visible => {
    if (!bubble) return;
    bubble.classList.toggle("is-visible", visible);
  };

  const queueHelpBubble = () => {
    if (!bubble || !isVisible() || dragging) {
      setHelpBubbleVisible(false);
      return;
    }

    window.clearTimeout(helpBubbleTimer);
    window.clearTimeout(helpBubbleDismissTimer);

    helpBubbleTimer = window.setTimeout(() => {
      if (!isVisible() || dragging) return;
      setHelpBubbleVisible(true);
      helpBubbleDismissTimer = window.setTimeout(() => {
        setHelpBubbleVisible(false);
        queueHelpBubble();
      }, 3200);
    }, 10000);
  };

  const setPosition = (nextX, nextY) => {
    const maxX = Math.max(8, window.innerWidth - launcher.offsetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - launcher.offsetHeight - 8);
    positionX = Math.min(maxX, Math.max(8, nextX));
    positionY = Math.min(maxY, Math.max(8, nextY));
    launcher.style.left = `${positionX}px`;
    launcher.style.top = `${positionY}px`;
    launcher.style.right = "auto";
    launcher.style.bottom = "auto";
  };

  const initializePosition = () => {
    if (positioned) return;
    const bounds = launcher.getBoundingClientRect();
    positioned = true;
    setPosition(bounds.left, bounds.top);
  };

  const isVisible = () => !launcher.hidden;

  const stopMotion = () => {
    if (!animationFrame) return;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const startWandering = () => {
    if (!isVisible() || dragging || animationFrame) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    initializePosition();

    let previousFrameTime = performance.now();
    let targetX = positionX;
    let targetY = positionY;
    let nextTargetTime = 0;

    const chooseTarget = frameTime => {
      const maxX = Math.max(8, window.innerWidth - launcher.offsetWidth - 8);
      const maxY = Math.max(8, window.innerHeight - launcher.offsetHeight - 8);
      targetX = 8 + Math.random() * Math.max(0, maxX - 8);
      targetY = 8 + Math.random() * Math.max(0, maxY - 8);
      nextTargetTime = frameTime + 2500 + Math.random() * 3500;
    };

    const wander = frameTime => {
      if (!isVisible() || dragging) {
        animationFrame = 0;
        return;
      }

      const elapsed = Math.min((frameTime - previousFrameTime) / 1000, 0.04);
      previousFrameTime = frameTime;
      const deltaX = targetX - positionX;
      const deltaY = targetY - positionY;
      const distance = Math.hypot(deltaX, deltaY);
      if (!nextTargetTime || frameTime >= nextTargetTime || distance < 28) {
        chooseTarget(frameTime);
      }

      const targetDistance = Math.max(1, Math.hypot(targetX - positionX, targetY - positionY));
      const targetSpeed = Math.min(52, Math.max(14, targetDistance * 0.16));
      const steering = 1 - Math.exp(-0.7 * elapsed);
      velocityX += ((targetX - positionX) / targetDistance * targetSpeed - velocityX) * steering;
      velocityY += ((targetY - positionY) / targetDistance * targetSpeed - velocityY) * steering;

      let nextX = positionX + velocityX * elapsed;
      let nextY = positionY + velocityY * elapsed;
      const maxX = Math.max(8, window.innerWidth - launcher.offsetWidth - 8);
      const maxY = Math.max(8, window.innerHeight - launcher.offsetHeight - 8);

      if (nextX < 8 || nextX > maxX) velocityX = -velocityX * 0.55;
      if (nextY < 8 || nextY > maxY) velocityY = -velocityY * 0.55;
      nextX = Math.min(maxX, Math.max(8, nextX));
      nextY = Math.min(maxY, Math.max(8, nextY));
      setPosition(nextX, nextY);
      animationFrame = window.requestAnimationFrame(wander);
    };

    animationFrame = window.requestAnimationFrame(wander);
  };

  const startThrow = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      startWandering();
      return;
    }

    let previousFrameTime = performance.now();
    const animateThrow = frameTime => {
      if (!isVisible() || dragging) {
        animationFrame = 0;
        return;
      }
      const elapsed = Math.min((frameTime - previousFrameTime) / 1000, 0.04);
      previousFrameTime = frameTime;
      let nextX = positionX + velocityX * elapsed;
      let nextY = positionY + velocityY * elapsed;
      const maxX = Math.max(8, window.innerWidth - launcher.offsetWidth - 8);
      const maxY = Math.max(8, window.innerHeight - launcher.offsetHeight - 8);

      if (nextX < 8) {
        nextX = 8;
        velocityX = Math.abs(velocityX) * 0.72;
      } else if (nextX > maxX) {
        nextX = maxX;
        velocityX = -Math.abs(velocityX) * 0.72;
      }
      if (nextY < 8) {
        nextY = 8;
        velocityY = Math.abs(velocityY) * 0.72;
      } else if (nextY > maxY) {
        nextY = maxY;
        velocityY = -Math.abs(velocityY) * 0.72;
      }
      nextX = Math.min(maxX, Math.max(8, nextX));
      nextY = Math.min(maxY, Math.max(8, nextY));
      const damping = Math.exp(-1.2 * elapsed);
      velocityX *= damping;
      velocityY *= damping;
      setPosition(nextX, nextY);

      if (Math.hypot(velocityX, velocityY) > 18) {
        animationFrame = window.requestAnimationFrame(animateThrow);
      } else {
        velocityX = 0;
        velocityY = 0;
        animationFrame = 0;
        startWandering();
      }
    };

    animationFrame = window.requestAnimationFrame(animateThrow);
  };

  launcher.addEventListener("pointerdown", event => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    initializePosition();
    stopMotion();
    dragging = true;
    dragStarted = false;
    velocityX = 0;
    velocityY = 0;
    pointerOffsetX = event.clientX - positionX;
    pointerOffsetY = event.clientY - positionY;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    previousPointerTime = performance.now();
    launcher.classList.add("is-dragging");
    launcher.setPointerCapture(event.pointerId);
  });

  launcher.addEventListener("pointermove", event => {
    if (!dragging) return;
    const distance = Math.hypot(
      event.clientX - (positionX + pointerOffsetX),
      event.clientY - (positionY + pointerOffsetY)
    );
    if (!dragStarted && distance < 5) return;

    dragStarted = true;
    const currentTime = performance.now();
    const elapsed = Math.max(8, currentTime - previousPointerTime);
    velocityX = (event.clientX - previousPointerX) / elapsed * 1000;
    velocityY = (event.clientY - previousPointerY) / elapsed * 1000;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    previousPointerTime = currentTime;
    setPosition(event.clientX - pointerOffsetX, event.clientY - pointerOffsetY);
  });

  const finishDrag = shouldThrow => {
    if (!dragging) return;
    dragging = false;
    launcher.classList.remove("is-dragging");
    if (!dragStarted) {
      startWandering();
      return;
    }

    suppressNextClick = true;
    window.setTimeout(() => {
      suppressNextClick = false;
    }, 0);
    if (shouldThrow) startThrow();
    else startWandering();
  };

  launcher.addEventListener("pointerup", () => finishDrag(true));
  launcher.addEventListener("pointercancel", () => finishDrag(false));
  launcher.addEventListener("click", event => {
    if (!suppressNextClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressNextClick = false;
  }, true);

  window.addEventListener("resize", () => {
    if (positioned) setPosition(positionX, positionY);
    syncMotion();
  });

  const syncMotion = () => {
    if (isVisible()) {
      startWandering();
      queueHelpBubble();
    } else {
      stopMotion();
      setHelpBubbleVisible(false);
      window.clearTimeout(helpBubbleTimer);
      window.clearTimeout(helpBubbleDismissTimer);
    }
  };
  const motionObserver = new MutationObserver(syncMotion);
  motionObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  motionObserver.observe(launcher, { attributes: true, attributeFilter: ["hidden"] });
  syncMotion();
}

function initializeHomepageNavigation() {
  if (!homeNavToggle || !homeNavigationLinks) return;

  const closeMenu = () => {
    homeNavigationLinks.classList.remove("is-open");
    homeNavToggle.setAttribute("aria-expanded", "false");
  };

  homeNavToggle.addEventListener("click", () => {
    const isOpen = homeNavigationLinks.classList.toggle("is-open");
    homeNavToggle.setAttribute("aria-expanded", String(isOpen));
  });

  homeNavigationLinks.addEventListener("click", event => {
    if (event.target.closest("a, button")) closeMenu();
  });

  document.addEventListener("click", event => {
    if (!homeNavigationLinks.contains(event.target) && !homeNavToggle.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
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

  const setMobileSidebarOpen = open => {
    sidebar.classList.toggle("is-open", open);
    if (mobileSidebarToggle) mobileSidebarToggle.setAttribute("aria-expanded", String(open));
    if (sidebarToggle && window.innerWidth <= 700) {
      sidebarToggle.setAttribute("aria-expanded", String(open));
    }
    if (sidebarBackdrop) sidebarBackdrop.hidden = !open;
  };

  sidebar.addEventListener("click", event => {
    if (event.target.closest("#sidebar-toggle")) return;
    if (window.innerWidth <= 700 && !sidebar.classList.contains("is-open")) {
      setMobileSidebarOpen(true);
    } else if (window.innerWidth > 700 && !sidebar.classList.contains("is-expanded")) {
      setSidebarExpanded(true);
    }
  });

  document.addEventListener("click", event => {
    if (
      window.innerWidth > 700 &&
      sidebar.classList.contains("is-expanded") &&
      !sidebar.contains(event.target) &&
      !event.target.closest("dialog")
    ) {
      setSidebarExpanded(false);
    }
  });

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      if (window.innerWidth <= 700) {
        setMobileSidebarOpen(false);
      } else {
        setSidebarExpanded(!sidebar.classList.contains("is-expanded"));
      }
    });
  }

  if (mobileSidebarToggle) {
    mobileSidebarToggle.addEventListener("click", () => {
      setMobileSidebarOpen(!sidebar.classList.contains("is-open"));
    });
  }

  if (sidebarClose) {
    sidebarClose.addEventListener("click", () => {
      setMobileSidebarOpen(false);
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => {
      setMobileSidebarOpen(false);
    });
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 700) {
      setSidebarExpanded(false);
      return;
    }
    setMobileSidebarOpen(false);
    setSidebarExpanded(false);
  });
}

function initializePageLinks() {
  document.querySelectorAll("[data-page-link]").forEach(link => {
    link.addEventListener("click", event => {
      const target = link.dataset.pageLink || "home";
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
  const pokeballLauncher = document.getElementById("pokeball-launcher");
  const portalEffect = document.getElementById("help-portal-effect");
  const pokeballScream = document.getElementById("pikachu-scream");
  const conversation = document.getElementById("help-conversation");
  const suggestions = document.getElementById("help-suggestions");
  const form = document.getElementById("help-form");
  const input = document.getElementById("help-input");
  const sendButton = document.getElementById("help-send");
  const modeStatus = document.getElementById("help-mode-status");
  if (!dialog || !conversation || !form || !input || !sendButton || !modeStatus) return;

  const typingId = "help-typing-indicator";
  let portalAnimationTimer = 0;

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

  document.getElementById("help-close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    window.clearTimeout(portalAnimationTimer);
    portalAnimationTimer = 0;
    if (pokeballScream) {
      pokeballScream.pause();
      pokeballScream.currentTime = 0;
    }
    delete dialog.dataset.portalAnimation;
    delete dialog.dataset.preparing;
    delete dialog.dataset.entering;
    if (portalEffect) {
      portalEffect.hidden = true;
      portalEffect.classList.remove("is-active");
    }
    if (pokeballLauncher) pokeballLauncher.hidden = false;
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelectorAll("[data-help-question]").forEach(button => {
    button.addEventListener("click", () => submitHelpQuestion(button.textContent));
  });

  const triggerHelpPortalAnimation = () => {
    if (!pokeballLauncher || !portalEffect) return false;
    const mascot = dialog.querySelector(".help-mascot");
    const portalMascot = portalEffect.querySelector(".help-portal-mascot");
    if (!mascot || !portalMascot) return false;

    const launcherRect = pokeballLauncher.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const mascotRect = mascot.getBoundingClientRect();
    portalEffect.style.left = `${launcherRect.left - dialogRect.left}px`;
    portalEffect.style.top = `${launcherRect.top - dialogRect.top}px`;
    portalEffect.style.width = `${launcherRect.width}px`;
    portalEffect.style.height = `${launcherRect.height}px`;
    portalEffect.hidden = false;
    const portalRect = portalEffect.getBoundingClientRect();
    const endX = mascotRect.left - portalRect.left;
    const endY = mascotRect.top - portalRect.top;
    const endScaleX = mascotRect.width / Math.max(portalRect.width, 1);
    const endScaleY = mascotRect.height / Math.max(portalRect.height, 1);

    portalMascot.style.setProperty("--portal-mid-x", `${endX * 0.55}px`);
    portalMascot.style.setProperty("--portal-mid-y", `${endY * 0.55}px`);
    portalMascot.style.setProperty("--portal-mid-scale-x", (1 + (endScaleX - 1) * 0.55).toFixed(3));
    portalMascot.style.setProperty("--portal-mid-scale-y", (1 + (endScaleY - 1) * 0.55).toFixed(3));
    portalMascot.style.setProperty("--portal-end-x", `${endX}px`);
    portalMascot.style.setProperty("--portal-end-y", `${endY}px`);
    portalMascot.style.setProperty("--portal-end-scale-x", endScaleX.toFixed(3));
    portalMascot.style.setProperty("--portal-end-scale-y", endScaleY.toFixed(3));
    portalEffect.classList.remove("is-active");
    void portalEffect.offsetWidth;
    portalEffect.classList.add("is-active");
    if (pokeballScream) {
      pokeballScream.pause();
      pokeballScream.currentTime = 0;
      pokeballScream.play()?.catch(() => {});
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.clearTimeout(portalAnimationTimer);
    portalAnimationTimer = window.setTimeout(() => {
      portalEffect.hidden = true;
      portalEffect.classList.remove("is-active");
      portalAnimationTimer = 0;
      delete dialog.dataset.preparing;
      dialog.dataset.entering = "true";
      input.focus();
    }, reducedMotion ? 1 : 1660);
    return true;
  };

  document.querySelectorAll("[data-help-open]").forEach(button => {
    button.addEventListener("click", () => {
      selectedHelpHotelId = activeDetailHotel?.id ?? null;
      const launchingFromPokeball = button === pokeballLauncher;
      if (launchingFromPokeball) {
        dialog.dataset.preparing = "true";
        delete dialog.dataset.entering;
      } else {
        dialog.dataset.entering = "true";
      }
      dialog.showModal();
      const portalStarted = launchingFromPokeball && triggerHelpPortalAnimation();
      if (!portalStarted) {
        delete dialog.dataset.preparing;
        dialog.dataset.entering = "true";
        input.focus();
      }
      if (pokeballLauncher) pokeballLauncher.hidden = true;
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
initializeBookingThankYou();
initializePaymentReceipt();
initializeAccount();
initializeIdentityExperience();
initializeSidebarDialogBackdropDismissal();
initializeCancellationDialogs();
initializeReviewForm();
initializeAccountMenu();
initializeHomepageNavigation();
initializeSidebarNavigation();
initializePageLinks();
initializeHelpChat();
initializeFloatingPokeball();
initializeRewardsSystem();
applyCurrentView();
loadPromotions();