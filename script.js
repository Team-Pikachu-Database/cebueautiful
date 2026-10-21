"use strict";

const configuredApiBaseUrl = typeof window.CEBUSTAYS_CONFIG?.apiBaseUrl === "string"
  ? window.CEBUSTAYS_CONFIG.apiBaseUrl.trim().replace(/\/+$/, "")
  : "";
const API_BASE_URL = window.location.port === "5505"
  ? ""
  : configuredApiBaseUrl;
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

const checkboxes = document.querySelectorAll(
  'input[name="town"]'
);

let hotels = [];
let signedInAccount = null;
let appliedCheckIn = "";
let appliedCheckOut = "";

const accountDialog = document.getElementById("account-dialog");
const accountMessage = document.getElementById("account-message");
const accountEntry = document.getElementById("account-entry");
const signedInPanel = document.getElementById("account-signed-in");

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
  signedInAccount = user;
  const isSignedIn = Boolean(user);
  const accountButton = document.getElementById("account-open");
  const developerProjectLink = document.getElementById("developer-project-link");
  const accountMenu = document.getElementById("account-menu");

  accountEntry.hidden = isSignedIn;
  signedInPanel.hidden = !isSignedIn;
  accountButton.hidden = isSignedIn;
  accountMenu.hidden = !isSignedIn;
  developerProjectLink.hidden = user?.role !== "developer";

  if (isSignedIn) {
    const displayName = user.displayName || user.email.split("@", 1)[0];
    document.getElementById("account-greeting-name").textContent =
      displayName.charAt(0).toLocaleUpperCase() + displayName.slice(1);
    document.getElementById("account-email").textContent = user.email;
    document.getElementById("account-role").textContent =
      user.role === "developer" ? "Developer account" : "Standard account";
  } else {
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
    if (data.user) accountDialog.close();
    if (data.user?.role === "developer") {
      window.location.assign("developer.html");
      return;
    }
    accountMessage.textContent = "You're signed in.";
  } catch (error) {
    accountMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

function initializeAccount() {
  document.getElementById("account-open").addEventListener("click", () => {
    accountDialog.showModal();
  });

  document.getElementById("account-close").addEventListener("click", () => {
    accountDialog.close();
  });

  document.querySelectorAll("[data-dialog-close]").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });

  accountDialog.addEventListener("click", event => {
    if (event.target === accountDialog) accountDialog.close();
  });

  document.querySelectorAll("[data-account-view]").forEach(tab => {
    tab.addEventListener("click", () => setAccountView(tab.dataset.accountView));
  });

  document
    .getElementById("account-form-login")
    .addEventListener("submit", event => submitAccountForm(event, "/login"));

  document
    .getElementById("account-form-register")
    .addEventListener("submit", event => submitAccountForm(event, "/register"));

  document
    .getElementById("account-form-developer")
    .addEventListener("submit", event =>
      submitAccountForm(event, "/developer/register")
    );

  document.getElementById("account-logout").addEventListener("click", async () => {
    const button = document.getElementById("account-logout");
    button.disabled = true;
    try {
      await requestAccountApi("/logout", { method: "POST" });
      updateAccountDisplay(null);
      accountMessage.textContent = "You have signed out. Sign in again to access your account.";
      document.querySelector('#account-form-login input[name="email"]').focus();
    } catch (error) {
      accountMessage.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  requestAccountApi("/me")
    .then(data => updateAccountDisplay(data.user))
    .catch(() => updateAccountDisplay(null));

  initializeAccountMenu();
}

function initializeAccountMenu() {
  const menu = document.getElementById("account-menu");
  const trigger = document.getElementById("account-menu-trigger");
  const menuPanel = document.getElementById("account-menu-panel");
  const settingsDialog = document.getElementById("account-settings-dialog");
  const reservationsDialog = document.getElementById("reservation-history-dialog");

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
}

function formatReservationDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

async function loadReservationHistory() {
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
    const today = new Date().toISOString().slice(0, 10);
    data.reservations.forEach(reservation => {
      const item = document.createElement("article");
      item.className = "reservation-item";

      const heading = document.createElement("div");
      heading.className = "reservation-item-heading";
      const hotelName = document.createElement("h3");
      hotelName.textContent = reservation.hotelName;
      const status = document.createElement("span");
      status.className = reservation.cancelledAt ? "reservation-status is-cancelled" : "reservation-status";
      status.textContent = reservation.cancelledAt
        ? "Cancelled"
        : reservation.checkOut < today ? "Completed" : "Confirmed";
      heading.append(hotelName, status);

      const dates = document.createElement("p");
      dates.textContent = `${formatReservationDate(reservation.checkIn)} – ${formatReservationDate(reservation.checkOut)}`;
      const details = document.createElement("p");
      details.textContent = `${reservation.rooms} room${reservation.rooms === 1 ? "" : "s"} · ${peso.format(reservation.totalPrice)}`;
      const reference = document.createElement("small");
      reference.textContent = `Confirmation ${reservation.reference}`;

      item.append(heading, dates, details, reference);
      list.append(item);
    });
  } catch (error) {
    message.textContent = error.message;
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
  lastFocusedElement = document.activeElement;
  const bookingForm = document.getElementById("booking-form");
  bookingForm.reset();
  bookingForm.hidden = true;
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

function updateBookingTotal() {
  if (!activeDetailHotel) return;
  const checkin = document.getElementById("booking-checkin").value;
  const checkout = document.getElementById("booking-checkout").value;
  const rooms = Number(document.getElementById("booking-rooms").value || 1);
  const stayNights = Math.max(
    1,
    Math.round((Date.parse(`${checkout}T00:00:00`) -
      Date.parse(`${checkin}T00:00:00`)) / 86400000)
  );
  const total = Number(activeDetailHotel.price) * stayNights * rooms;
  document.getElementById("booking-total").textContent =
    `Estimated total for ${rooms} room${rooms === 1 ? "" : "s"} · ` +
    `${stayNights} night${stayNights === 1 ? "" : "s"}: ` +
    (Number.isFinite(total) && total >= 0 ? peso.format(total) : "Rate not provided");
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
      form.hidden = false;
      status.textContent =
        `${availableRooms} of ${data.availability.totalRooms} rooms available for these dates.`;
      updateBookingTotal();
    } else {
      form.hidden = true;
      status.textContent = "Sorry, no rooms are available for those dates.";
    }
  } catch (error) {
    form.hidden = true;
    status.textContent = error.message;
  } finally {
    checkButton.disabled = false;
    checkButton.textContent = "Check availability";
  }
}

document
  .getElementById("detail-availability")
  .addEventListener("click", refreshBookingAvailability);

document.getElementById("booking-checkin").addEventListener("change", () => {
  setBookingDateLimits();
  updateBookingTotal();
  if (!document.getElementById("booking-form").hidden) refreshBookingAvailability();
});

document.getElementById("booking-checkout").addEventListener("change", () => {
  updateBookingTotal();
  if (!document.getElementById("booking-form").hidden) refreshBookingAvailability();
});

document.getElementById("booking-rooms").addEventListener("change", updateBookingTotal);

document.getElementById("booking-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeDetailHotel) return;

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
        rooms: Number(values.rooms)
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Your reservation could not be saved.");
    }

    const booking = data.booking;
    form.hidden = true;
    status.textContent =
      `Reservation confirmed for ${booking.hotelName}. ` +
      `Reference: ${booking.reference}. ${booking.rooms} room${booking.rooms === 1 ? "" : "s"}, ` +
      `${booking.checkIn} to ${booking.checkOut}. Estimated total: ` +
      `${peso.format(booking.totalPrice)}. No payment was collected.`;
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

  const cta = el(
    "button",
    "btn btn-primary",
    "See availability"
  );

  cta.type = "button";

  cta.addEventListener("click", () => {
    openHotelDetails(hotel);
  });

  side.append(score, bottom, cta);

  card.append(gallery, info, side);

  return card;
}

/* ---------- RENDER HOTEL RESULTS ---------- */

function render() {
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

/* ---------- INITIALIZE APP ---------- */

setDefaultDates();
initializeAccount();

loadHotels();