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
const qrCameraStart = document.getElementById("developer-qr-camera-start");
const qrCameraStop = document.getElementById("developer-qr-camera-stop");
const qrCameraStatus = document.getElementById("developer-qr-camera-status");
const qrCameraVideo = document.getElementById("developer-qr-camera");
const qrResult = document.getElementById("developer-qr-result");
const qrResultTitle = document.getElementById("developer-qr-result-title");
const qrResultDetail = document.getElementById("developer-qr-result-detail");
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
let qrCameraStream = null;
let qrDetector = null;
let qrScanFrame = null;
let qrValidationInProgress = false;

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
      counterStatus.textContent = "No approved reservations need an ID check or room assignment.";
      return;
    }

    counterStatus.textContent =
      `${data.reservations.length} approved reservation${data.reservations.length === 1 ? "" : "s"} need an ID check or room assignment.`;
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
      instruction.textContent = reservation.idsConfirmed
        ? "Two IDs are already confirmed. Assign the room(s) for the existing keycards."
        : "Verify two valid IDs in person, then assign the room(s) before issuing keycards.";
      let checked;
      if (!reservation.idsConfirmed) {
        const attestation = document.createElement("label");
        attestation.className = "developer-counter-attestation";
        checked = document.createElement("input");
        checked.type = "checkbox";
        const attestationText = document.createElement("span");
        attestationText.textContent = "I checked two valid IDs in person";
        attestation.append(checked, attestationText);
        details.append(attestation);
      }
      const roomLabel = document.createElement("label");
      roomLabel.className = "developer-counter-room-label";
      roomLabel.textContent = `Booked room number${reservation.rooms === 1 ? "" : "s"}`;
      const roomInput = document.createElement("input");
      roomInput.type = "text";
      roomInput.required = true;
      roomInput.autocomplete = "off";
      roomInput.placeholder = reservation.rooms === 1 ? "e.g. 109" : "e.g. 109, 110";
      roomInput.setAttribute("aria-label", `Booked room numbers for ${reservation.reference}`);
      roomInput.value = reservation.roomNumbers.join(", ");
      roomLabel.append(roomInput);
      const roomHelp = document.createElement("small");
      roomHelp.textContent = `Enter exactly ${reservation.rooms} room number${reservation.rooms === 1 ? "" : "s"}, separated by commas.`;
      roomLabel.append(roomHelp);
      let select;
      let selectLabel;
      if (!reservation.idsConfirmed) {
        selectLabel = document.createElement("label");
        selectLabel.className = "developer-counter-count-label";
        selectLabel.textContent = "QR Keycards";
        select = document.createElement("select");
        select.setAttribute("aria-label", `QR Keycards for ${reservation.reference}`);
        for (let count = 1; count <= 4; count += 1) {
          const option = document.createElement("option");
          option.value = String(count);
          option.textContent = `${count} QR${count === 1 ? "" : "s"}`;
          select.append(option);
        }
        selectLabel.append(select);
      }
      const confirm = document.createElement("button");
      confirm.className = "btn btn-primary";
      confirm.type = "button";
      confirm.textContent = reservation.idsConfirmed
        ? "Assign room(s) to existing QR"
        : "Confirm IDs & Generate";
      confirm.disabled = !reservation.idsConfirmed;
      checked?.addEventListener("change", () => {
        confirm.disabled = !checked.checked;
      });
      confirm.addEventListener("click", () => {
        const roomNumbers = roomInput.value.split(",").map(room => room.trim());
        void confirmCounterIds(
          reservation.reference,
          select ? Number(select.value) : 1,
          roomNumbers,
          confirm
        );
      });
      details.prepend(title, meta, instruction);
      const actions = document.createElement("div");
      actions.className = "developer-counter-card-actions";
      actions.append(roomLabel);
      if (selectLabel) actions.append(selectLabel);
      actions.append(confirm);
      card.append(details, actions);
      counterList.append(card);
    });
  } catch (error) {
    counterStatus.textContent = `${error.message} Refresh to try again.`;
  }
}

async function confirmCounterIds(reference, qrCount, roomNumbers, button) {
  button.disabled = true;
  counterStatus.textContent = "Assigning room(s) and preparing the keycard…";
  try {
    const data = await requestApi(
      `/api/staff/bookings/${encodeURIComponent(reference)}/confirm-ids`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCount, roomNumbers })
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
  const token = document.getElementById("developer-qr-token").value.trim();
  button.disabled = true;
  try {
    await validateQrToken(token);
  } catch (error) {
    showQrResult("is-error", "SCAN ERROR", error.message);
  } finally {
    button.disabled = false;
  }
}

function showQrResult(resultClass, title, detail) {
  qrResult.className = `developer-qr-result ${resultClass}`;
  qrResultTitle.textContent = title;
  qrResultDetail.textContent = detail;
}

function displayQrValidation(result) {
  if (result.valid) {
    const rooms = result.roomNumbers.map(room => `Room ${room}`).join(", ");
    showQrResult(
      "is-success",
      "ACCESS GRANTED · DEMO ONLY",
      `${rooms} · ${result.hotelName} · ${result.reference}. No physical door was unlocked.`
    );
    return;
  }

  const failureDetails = {
    invalid: ["ACCESS DENIED · INVALID QR", "This keycard was not found or is not valid."],
    completed: ["ACCESS DENIED · EXPIRED", "The booked stay has ended; this keycard is expired."],
    not_yet_active: ["ACCESS DENIED · NOT ACTIVE", "The booking's check-in date has not started yet."],
    cancelled_invalid: ["ACCESS DENIED · CANCELLED", "The reservation or keycard was cancelled or revoked."],
    pending_payment: ["ACCESS DENIED · NOT APPROVED", "The reservation is not approved and paid."],
    ids_not_confirmed: ["ACCESS DENIED · ID CHECK REQUIRED", "Two valid IDs have not been confirmed at the counter."],
    room_unassigned: ["ACCESS DENIED · ROOM UNASSIGNED", "A developer must assign the booked room number before this keycard can be used."]
  };
  const [title, detail] = failureDetails[result.status] ??
    ["ACCESS DENIED", "This keycard is not valid for access."];
  showQrResult("is-failure", title, detail);
}

async function validateQrToken(token) {
  qrValidationInProgress = true;
  showQrResult("is-checking", "CHECKING KEYCARD", "Verifying the token and booking dates with CebuStays.");
  try {
    const data = await requestApi("/api/qr/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    displayQrValidation(data.result);
  } catch (error) {
    showQrResult("is-error", "SCAN ERROR", error.message);
    throw error;
  } finally {
    qrValidationInProgress = false;
  }
}

function stopQrCamera() {
  if (qrScanFrame !== null) {
    cancelAnimationFrame(qrScanFrame);
    qrScanFrame = null;
  }
  qrCameraStream?.getTracks().forEach(track => track.stop());
  qrCameraStream = null;
  qrCameraVideo.srcObject = null;
  qrCameraVideo.hidden = true;
  qrCameraStart.hidden = false;
  qrCameraStop.hidden = true;
}

async function scanQrCameraFrame() {
  if (!qrCameraStream || qrValidationInProgress) return;
  try {
    if (qrCameraVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const detected = await qrDetector.detect(qrCameraVideo);
      const token = detected[0]?.rawValue?.trim();
      if (token) {
        await validateQrToken(token);
        stopQrCamera();
        return;
      }
    }
  } catch (error) {
    qrCameraStatus.textContent = `Camera scan stopped: ${error.message}`;
    stopQrCamera();
    return;
  }
  qrScanFrame = requestAnimationFrame(scanQrCameraFrame);
}

async function startQrCamera() {
  if (typeof window.BarcodeDetector !== "function") {
    qrCameraStatus.textContent =
      "Camera QR scanning is not supported by this browser. Use the token field below instead.";
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    qrCameraStatus.textContent =
      "Camera access requires HTTPS and a supported browser. Use the token field below instead.";
    return;
  }
  try {
    qrDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
    qrCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    qrCameraVideo.srcObject = qrCameraStream;
    qrCameraVideo.hidden = false;
    await qrCameraVideo.play();
    qrCameraStart.hidden = true;
    qrCameraStop.hidden = false;
    qrCameraStatus.textContent = "Camera is on. Hold one QR keycard inside the camera frame.";
    qrScanFrame = requestAnimationFrame(scanQrCameraFrame);
  } catch (error) {
    stopQrCamera();
    qrCameraStatus.textContent = `Camera could not start: ${error.message}`;
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
qrCameraStart.addEventListener("click", startQrCamera);
qrCameraStop.addEventListener("click", () => {
  stopQrCamera();
  qrCameraStatus.textContent = "Camera scanner stopped.";
});
counterDialog.addEventListener("close", stopQrCamera);
counterDialog.addEventListener("click", event => {
  if (event.target === counterDialog) counterDialog.close();
});
window.addEventListener("pagehide", stopQrCamera);
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
