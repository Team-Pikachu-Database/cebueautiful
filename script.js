"use strict";

const API_PORT = 3000;
const previewHost = window.location.hostname.match(
  /^(.*)-\d+\.app\.github\.dev$/
);
const isLocalLiveServer =
  ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  window.location.port === "5505";
const API_URL = previewHost
  ? `${window.location.protocol}//${previewHost[1]}-${API_PORT}.app.github.dev/api/hotels`
  : isLocalLiveServer
    ? `${window.location.protocol}//${window.location.hostname}:${API_PORT}/api/hotels`
  : "/api/hotels";

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
  return hotel.images?.[index - 1]?.url ?? "";
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

  detailMainImage.alt = hotelImageAlt(activeDetailHotel, activePhotoIndex);

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

/* ---------- AVAILABILITY DEMO ---------- */

document
  .getElementById("detail-availability")
  .addEventListener("click", () => {
    if (!activeDetailHotel) return;

    const checkin = document.getElementById("checkin").value;
    const checkout = document.getElementById("checkout").value;

    alert(
      `Demo only: availability for ${activeDetailHotel.name} ` +
      `from ${checkin} to ${checkout}.`
    );
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
  const checkin = document.getElementById("checkin").value;
  const checkout = document.getElementById("checkout").value;

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

  info.append(
    el("h3", "", hotel.name),
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
        const town = String(hotel.town || "").toLowerCase().trim();
      const location = String(hotel.location || "").toLowerCase().trim();

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
    const response = await fetch(API_URL, { credentials: "include" });

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

  checkout.min = formatDate(tomorrow);

  checkout.value = formatDate(tomorrow);

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

    render();
  });

  checkout.addEventListener("change", render);
}

/* ---------- SEARCH FORM ---------- */

document
  .getElementById("search-form")
  .addEventListener("submit", event => {
    event.preventDefault();

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

loadHotels();