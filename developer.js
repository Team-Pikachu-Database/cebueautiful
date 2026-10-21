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
const bookingsSection = document.getElementById("developer-bookings");
const bookingsStatus = document.getElementById("developer-bookings-status");
const bookingsList = document.getElementById("developer-bookings-list");
const paymentReviewDialog = document.getElementById("payment-review-dialog");
const paymentReviewDetails = document.getElementById("payment-review-details");
const paymentReviewChecked = document.getElementById("payment-review-checked");
const paymentReviewConfirm = document.getElementById("payment-review-confirm");
const paymentReviewMessage = document.getElementById("payment-review-message");
const retryButton = document.getElementById("developer-retry");
let selectedReservation = null;

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

function formatReservationDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

async function loadPendingBookings() {
  bookingsList.replaceChildren();
  bookingsStatus.textContent = "Loading pending reservations…";

  try {
    const data = await requestApi("/api/bookings/pending");
    if (!data.reservations.length) {
      bookingsStatus.textContent = "There are no pending reservations.";
      return;
    }

    bookingsStatus.textContent = `${data.reservations.length} pending reservation${data.reservations.length === 1 ? "" : "s"}`;
    for (const reservation of data.reservations) {
      const row = document.createElement("tr");
      const guest = document.createElement("td");
      const guestName = document.createElement("strong");
      guestName.textContent = reservation.guestName;
      const guestEmail = document.createElement("small");
      guestEmail.textContent = reservation.guestEmail;
      guest.append(guestName, guestEmail);

      const booking = document.createElement("td");
      const hotelName = document.createElement("strong");
      hotelName.textContent = reservation.hotelName;
      const reference = document.createElement("small");
      reference.textContent = reservation.reference;
      booking.append(hotelName, reference);

      const stay = document.createElement("td");
      const dates = document.createElement("span");
      dates.textContent =
        `${formatReservationDate(reservation.checkIn)} – ${formatReservationDate(reservation.checkOut)}`;
      const rooms = document.createElement("small");
      rooms.textContent = `${reservation.rooms} room${reservation.rooms === 1 ? "" : "s"}`;
      stay.append(dates, rooms);

      const payment = document.createElement("td");
      const amount = document.createElement("strong");
      amount.textContent = new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP"
      }).format(reservation.totalPrice);
      const paymentStatus = document.createElement("span");
      paymentStatus.className = "reservation-status is-pending";
      paymentStatus.textContent = "Pending";
      payment.append(amount, paymentStatus);

      const action = document.createElement("td");
      const checkButton = document.createElement("button");
      checkButton.className = "btn btn-primary developer-check-payment";
      checkButton.type = "button";
      checkButton.textContent = "Check details";
      checkButton.addEventListener("click", () => openPaymentReview(reservation));
      action.append(checkButton);

      row.append(guest, booking, stay, payment, action);
      bookingsList.append(row);
    }
  } catch (error) {
    bookingsStatus.textContent = `${error.message} Refresh to try again.`;
  }
}

function openPaymentReview(reservation) {
  selectedReservation = reservation;
  paymentReviewDetails.replaceChildren();
  const details = [
    ["Guest name", reservation.guestName],
    ["Guest email", reservation.guestEmail],
    ["Property", reservation.hotelName],
    ["Check-in", formatReservationDate(reservation.checkIn)],
    ["Check-out", formatReservationDate(reservation.checkOut)],
    ["Rooms", String(reservation.rooms)],
    ["Amount due", new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(reservation.totalPrice)],
    ["Reservation reference", reservation.reference]
  ];

  for (const [label, value] of details) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    paymentReviewDetails.append(term, description);
  }

  paymentReviewChecked.checked = false;
  paymentReviewConfirm.disabled = true;
  paymentReviewMessage.textContent = "";
  paymentReviewDialog.showModal();
}

async function confirmPayment() {
  if (!selectedReservation || !paymentReviewChecked.checked) return;

  paymentReviewConfirm.disabled = true;
  paymentReviewMessage.textContent = "Recording payment confirmation…";

  try {
    await requestApi(
      `/api/bookings/${encodeURIComponent(selectedReservation.reference)}/confirm-payment`,
      {
      method: "PATCH"
      }
    );
    paymentReviewDialog.close();
    await loadPendingBookings();
  } catch (error) {
    paymentReviewMessage.textContent = error.message;
    paymentReviewConfirm.disabled = false;
  }
}

async function checkDeveloperSession() {
  status.textContent = "Checking your developer session…";
  retryButton.hidden = true;
  destinations.hidden = true;
  actions.hidden = true;
  bookingsSection.hidden = true;

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
    bookingsSection.hidden = false;
    await loadPendingBookings();
  } catch (error) {
    status.textContent = `${error.message} Check your connection and try again.`;
    retryButton.hidden = false;
  }
}

retryButton.addEventListener("click", checkDeveloperSession);
document.getElementById("developer-bookings-refresh")
  .addEventListener("click", loadPendingBookings);
document.getElementById("payment-review-close")
  .addEventListener("click", () => paymentReviewDialog.close());
paymentReviewDialog.addEventListener("click", event => {
  if (event.target === paymentReviewDialog) paymentReviewDialog.close();
});
paymentReviewChecked.addEventListener("change", () => {
  paymentReviewConfirm.disabled = !paymentReviewChecked.checked;
});
paymentReviewConfirm.addEventListener("click", confirmPayment);

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
