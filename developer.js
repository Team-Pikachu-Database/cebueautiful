"use strict";

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
const status = document.getElementById("developer-status");
const destinations = document.getElementById("developer-destinations");
const actions = document.getElementById("developer-actions");
const bookingsSection = document.getElementById("developer-bookings");
const bookingsStatus = document.getElementById("developer-bookings-status");
const bookingsList = document.getElementById("developer-bookings-list");
const counterChecksSection = document.getElementById("developer-counter-checks");
const counterDialog = document.getElementById("developer-counter-dialog");
const counterStatus = document.getElementById("developer-counter-status");
const counterList = document.getElementById("developer-counter-list");
const paymentReviewDialog = document.getElementById("payment-review-dialog");
const paymentReviewDetails = document.getElementById("payment-review-details");
const paymentReviewChecked = document.getElementById("payment-review-checked");
const paymentReviewConfirm = document.getElementById("payment-review-confirm");
const paymentReviewMessage = document.getElementById("payment-review-message");
const paymentReviewGuidance = document.getElementById("payment-review-guidance");
const paymentReviewVerification = document.getElementById("payment-review-verification");
const paymentReviewCheckLabel = document.getElementById("payment-review-check-label");
const cancellationApprovalDialog = document.getElementById("cancellation-approval-dialog");
const cancellationApprovalKicker = document.getElementById("cancellation-approval-kicker");
const cancellationApprovalTitle = document.getElementById("cancellation-approval-title");
const cancellationApprovalMessage = document.getElementById("cancellation-approval-message");
const cancellationApprovalConfirm = document.getElementById("cancellation-approval-confirm");
const cancellationApprovalCancel = document.getElementById("cancellation-approval-cancel");
const retryButton = document.getElementById("developer-retry");
let selectedReservation = null;
let selectedCancellation = null;
let pendingBookingsRefreshTimer = null;

function formatCounterDate(value) {
  if (!value) return "Not available";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

async function loadCounterChecks() {
  counterStatus.textContent = "Loading approved reservations…";
  counterList.replaceChildren();
  try {
    const data = await requestApi("/api/staff/counter-id-checks/pending");
    if (!data.reservations.length) {
      counterStatus.textContent = "No approved reservations are waiting for an in-person ID check.";
      return;
    }

    counterStatus.textContent =
      `${data.reservations.length} reservation${data.reservations.length === 1 ? "" : "s"} waiting for two valid IDs.`;
    data.reservations.forEach(reservation => {
      const card = document.createElement("article");
      card.className = "developer-counter-card";
      const details = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = `${reservation.guestName} · ${reservation.hotelName}`;
      const meta = document.createElement("p");
      meta.textContent =
        `${reservation.reference} · ${formatCounterDate(reservation.checkIn)} – ${formatCounterDate(reservation.checkOut)} · approved and paid`;
      const instruction = document.createElement("p");
      instruction.textContent = "Verify two valid IDs in person before issuing keycards.";
      const attestation = document.createElement("label");
      attestation.className = "developer-counter-attestation";
      const checked = document.createElement("input");
      checked.type = "checkbox";
      const attestationText = document.createElement("span");
      attestationText.textContent = "I checked two valid IDs in person";
      attestation.append(checked, attestationText);
      const selectLabel = document.createElement("label");
      selectLabel.className = "developer-counter-count-label";
      selectLabel.textContent = "QR Keycards";
      const select = document.createElement("select");
      select.setAttribute("aria-label", `QR Keycards for ${reservation.reference}`);
      for (let count = 1; count <= 4; count += 1) {
        const option = document.createElement("option");
        option.value = String(count);
        option.textContent = `${count} QR${count === 1 ? "" : "s"}`;
        select.append(option);
      }
      selectLabel.append(select);
      const confirm = document.createElement("button");
      confirm.className = "btn btn-primary";
      confirm.type = "button";
      confirm.textContent = "Confirm IDs & Generate";
      confirm.disabled = true;
      checked.addEventListener("change", () => {
        confirm.disabled = !checked.checked;
      });
      confirm.addEventListener("click", () => {
        void confirmCounterIds(reservation.reference, Number(select.value), confirm);
      });
      details.append(title, meta, instruction, attestation);
      const actions = document.createElement("div");
      actions.className = "developer-counter-card-actions";
      actions.append(selectLabel, confirm);
      card.append(details, actions);
      counterList.append(card);
    });
  } catch (error) {
    counterStatus.textContent = `${error.message} Refresh to try again.`;
  }
}

async function confirmCounterIds(reference, qrCount, button) {
  button.disabled = true;
  counterStatus.textContent = `Generating ${qrCount} QR Keycard${qrCount === 1 ? "" : "s"}…`;
  try {
    const data = await requestApi(
      `/api/staff/bookings/${encodeURIComponent(reference)}/confirm-ids`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCount })
      }
    );
    await loadCounterChecks();
    counterStatus.textContent =
      `${data.confirmation.message} The guest can retrieve them under My QR Keycard.`;
  } catch (error) {
    counterStatus.textContent = error.message;
    button.disabled = false;
  }
}

async function validateDeveloperQr(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById("developer-qr-validation-message");
  button.disabled = true;
  message.textContent = "Validating with the server…";
  try {
    const data = await requestApi("/api/qr/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: form.elements.namedItem("token").value.trim() })
    });
    message.textContent = data.result.valid
      ? `Valid for ${data.result.hotelName}, reservation ${data.result.reference}.`
      : `This keycard is not currently valid (${data.result.status.replaceAll("_", " ")}).`;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
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

function formatReservationDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function startPendingBookingsRefresh() {
  if (pendingBookingsRefreshTimer) {
    window.clearInterval(pendingBookingsRefreshTimer);
  }
  pendingBookingsRefreshTimer = window.setInterval(() => {
    loadPendingBookings();
  }, 15000);
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
      const isCancellation = reservation.cancellationStatus === "requested";
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
      const bedrooms = Number(reservation.bedrooms || 1);
      rooms.textContent = `${reservation.rooms} room${reservation.rooms === 1 ? "" : "s"} · ${bedrooms} bedroom${bedrooms === 1 ? "" : "s"} each`;
      stay.append(dates, rooms);

      const payment = document.createElement("td");
      const amount = document.createElement("strong");
      amount.textContent = new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP"
      }).format(reservation.totalPrice);
      const paymentStatus = document.createElement("span");
      paymentStatus.className = isCancellation
        ? "reservation-status is-cancelled"
        : "reservation-status is-pending";
      paymentStatus.textContent = isCancellation
        ? "Cancellation"
        : reservation.paymentMethod === "online"
          ? reservation.onlinePaymentVerified
            ? "Online payment received — awaiting approval"
            : "Online payment — waiting for provider"
          : "Counter payment — verify receipt";
      if (reservation.onlinePaymentVerified && reservation.paymentReference) {
        const paymentReference = document.createElement("small");
        paymentReference.textContent =
          `${reservation.paymentProvider === "paymongo" ? "PayMongo" : "Xendit"} verified reference: ${reservation.paymentReference}`;
        payment.append(amount, paymentStatus, paymentReference);
      } else {
        payment.append(amount, paymentStatus);
      }

      const action = document.createElement("td");
      const checkButton = document.createElement("button");
      checkButton.className = "btn btn-primary developer-check-payment";
      checkButton.type = "button";
      checkButton.textContent = isCancellation ? "Approve cancel" : "Check details";
      checkButton.addEventListener("click", () => {
        if (isCancellation) {
          openCancellationApproval(reservation);
          return;
        }
        openPaymentReview(reservation);
      });
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
    ["Bedrooms per room", String(reservation.bedrooms || 1)],
    ["Amount due", new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(reservation.totalPrice)],
    ["Reservation reference", reservation.reference]
  ];
  details.push([
    "Payment method",
    reservation.paymentMethod === "online"
      ? `${reservation.paymentProvider === "paymongo" ? "PayMongo" : "Xendit"} online payment`
      : "Pay at counter"
  ]);
  if (reservation.onlinePaymentVerified && reservation.paymentReference) {
    details.push(["Provider-verified payment reference", reservation.paymentReference]);
  }
  if (reservation.cancellationStatus === "requested") {
    details.push(["Cancellation reason", reservation.cancellationReason || "No reason supplied."]);
  }

  for (const [label, value] of details) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    paymentReviewDetails.append(term, description);
  }

  paymentReviewChecked.checked = false;
  const isOnlinePayment = reservation.paymentMethod === "online";
  const isOnlinePaymentVerified = reservation.onlinePaymentVerified === true &&
    typeof reservation.paymentReference === "string" &&
    reservation.paymentReference.length > 0;
  paymentReviewCheckLabel.textContent = isOnlinePayment
    ? "I matched the provider-verified reference with the reference shown by the user, and accept this reservation."
    : "I received and verified the payment at the hotel counter.";
  paymentReviewConfirm.textContent = isOnlinePayment
    ? "Accept reservation & mark paid"
    : "Mark as paid";
  paymentReviewVerification.hidden = !isOnlinePayment;
  paymentReviewVerification.classList.toggle("is-verified", isOnlinePaymentVerified);
  paymentReviewVerification.textContent = isOnlinePaymentVerified
    ? `This room is reserved because the provider confirmed payment. Match the customer's reference to the verified ${reservation.paymentProvider === "paymongo" ? "PayMongo" : "Xendit"} reference above, then approve the reservation.`
    : "Waiting for payment provider confirmation. This reservation cannot be marked paid yet.";
  updatePaymentReviewConfirmation();
  paymentReviewMessage.textContent = "";
  paymentReviewDialog.showModal();
}

function updatePaymentReviewConfirmation() {
  const selectedOnline = selectedReservation?.paymentMethod === "online";
  const isProviderVerified = selectedReservation?.onlinePaymentVerified === true;
  const isReady = paymentReviewChecked.checked &&
    (!selectedOnline || isProviderVerified);

  if (selectedOnline && !isProviderVerified) {
    paymentReviewGuidance.textContent =
      "Acceptance is disabled until the payment provider confirms this payment.";
  } else if (!paymentReviewChecked.checked) {
    paymentReviewGuidance.textContent = selectedOnline
      ? "Check the box above after matching the verified reference with the reference shown by the user."
      : "Check the box above after verifying receipt to enable confirmation.";
  } else {
    paymentReviewGuidance.textContent = selectedOnline
      ? "Reference confirmed. You can now accept this reservation."
      : "Payment verified. You can now mark this reservation as paid.";
  }

  paymentReviewConfirm.disabled = !isReady;
}

async function confirmPayment() {
  if (!selectedReservation || !paymentReviewChecked.checked) return;
  if (
    selectedReservation.paymentMethod === "online" &&
    (selectedReservation.onlinePaymentVerified !== true || !selectedReservation.paymentReference)
  ) {
    return;
  }

  paymentReviewConfirm.disabled = true;
  paymentReviewMessage.textContent = "Recording payment confirmation…";

  try {
    await requestApi(
      `/api/bookings/${encodeURIComponent(selectedReservation.reference)}/confirm-payment`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentReference: selectedReservation.paymentReference || ""
        })
      }
    );
    paymentReviewDialog.close();
    await loadPendingBookings();
  } catch (error) {
    paymentReviewMessage.textContent = error.message;
    updatePaymentReviewConfirmation();
  }
}

async function approveCancellation(reservation) {
  if (!reservation || !reservation.reference) return;

  cancellationApprovalConfirm.disabled = true;
  cancellationApprovalCancel.disabled = true;
  cancellationApprovalMessage.textContent = "Approving cancellation…";
  try {
    await requestApi(
      `/api/bookings/${encodeURIComponent(reservation.reference)}/approve-cancellation`,
      { method: "PATCH" }
    );
    await loadPendingBookings();
    cancellationApprovalKicker.textContent = "RESERVATION UPDATED";
    cancellationApprovalTitle.textContent = "Cancellation approved";
    cancellationApprovalMessage.textContent =
      `Reservation ${reservation.reference} has been cancelled and any held coupon has been released.`;
    cancellationApprovalCancel.hidden = true;
    cancellationApprovalConfirm.disabled = false;
    cancellationApprovalConfirm.textContent = "Done";
  } catch (error) {
    cancellationApprovalMessage.textContent = `${error.message} Try again or refresh the list.`;
    cancellationApprovalConfirm.disabled = false;
    cancellationApprovalCancel.disabled = false;
  }
}

function openCancellationApproval(reservation) {
  selectedCancellation = reservation;
  cancellationApprovalKicker.textContent = "REVIEW CANCELLATION";
  cancellationApprovalTitle.textContent = "Approve cancellation?";
  cancellationApprovalMessage.textContent =
    `Approve cancellation for ${reservation.reference}? This will cancel the pending reservation and release any held coupon. ` +
    `Guest reason: ${reservation.cancellationReason || "No reason supplied."}`;
  cancellationApprovalCancel.hidden = false;
  cancellationApprovalCancel.disabled = false;
  cancellationApprovalConfirm.disabled = false;
  cancellationApprovalConfirm.textContent = "Approve cancellation";
  cancellationApprovalDialog.showModal();
}

async function checkDeveloperSession() {
  status.textContent = "Checking your developer session…";
  retryButton.hidden = true;
  destinations.hidden = true;
  actions.hidden = true;
  bookingsSection.hidden = true;
  counterChecksSection.hidden = true;

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
    counterChecksSection.hidden = false;
    await loadPendingBookings();
    startPendingBookingsRefresh();
  } catch (error) {
    status.textContent = `${error.message} Check your connection and try again.`;
    retryButton.hidden = false;
  }
}

retryButton.addEventListener("click", checkDeveloperSession);
document.getElementById("developer-bookings-refresh")
  .addEventListener("click", loadPendingBookings);
document.getElementById("developer-counter-open").addEventListener("click", () => {
  counterDialog.showModal();
  void loadCounterChecks();
});
document.getElementById("developer-counter-refresh").addEventListener("click", loadCounterChecks);
document.getElementById("developer-counter-close")
  .addEventListener("click", () => counterDialog.close());
counterDialog.addEventListener("click", event => {
  if (event.target === counterDialog) counterDialog.close();
});
document.getElementById("developer-qr-validation-form")
  .addEventListener("submit", validateDeveloperQr);
document.getElementById("payment-review-close")
  .addEventListener("click", () => paymentReviewDialog.close());
document.getElementById("cancellation-approval-close")
  .addEventListener("click", () => cancellationApprovalDialog.close());
cancellationApprovalCancel.addEventListener("click", () => cancellationApprovalDialog.close());
cancellationApprovalConfirm.addEventListener("click", () => {
  if (cancellationApprovalConfirm.textContent === "Done") {
    cancellationApprovalDialog.close();
    return;
  }
  approveCancellation(selectedCancellation);
});
cancellationApprovalDialog.addEventListener("click", event => {
  if (event.target === cancellationApprovalDialog && !cancellationApprovalConfirm.disabled) {
    cancellationApprovalDialog.close();
  }
});
cancellationApprovalDialog.addEventListener("cancel", event => {
  if (cancellationApprovalConfirm.disabled) event.preventDefault();
});
paymentReviewDialog.addEventListener("click", event => {
  if (event.target === paymentReviewDialog) paymentReviewDialog.close();
});
paymentReviewChecked.addEventListener("change", () => {
  paymentReviewMessage.textContent = "";
  updatePaymentReviewConfirmation();
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
