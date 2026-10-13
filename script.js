
"use strict";

const API_URL = "https://dummyjson.com/quotes?limit=6";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0
});

/* Mock hotel data: 4 real staycations in Cebu */
const HOTELS = [
  {
    id: 1,
    name: "Thunderbird Resorts & Casinos",
    town: "Cebu city",

    desc: `Bayfront Hotel Cebu – North Reclamation is conveniently located in Cebu City's commercial and business district, making it suitable for both leisure and business travelers. It is within walking distance of shopping destinations such as SM City Cebu and S&R. The hotel offers comfortable rooms with city views, safety boxes, flat-screen cable TVs, tea and coffee-making facilities, minibars, complimentary bottled water, private bathrooms, and free Wi-Fi. Guests can enjoy Filipino and international dishes at the hotel restaurant, with room service also available. Nearby attractions include Cebu Port, St. Joseph Parish, Ayala Center Cebu, Fort San Pedro, and Magellan's Cross. Mactan-Cebu International Airport is approximately 45 minutes away by car. The hotel also provides a 24-hour front desk, luggage storage assistance, airport transportation and car rental arrangements, and complimentary parking.`,

    amenities: ["Casino", "Infinity pool", "Lake view", "Free parking"],
    price: 6800,
    score: 8.6,
    reviews: 1240,
    imagePrefix: "1"
  }
];

const TOTAL_IMAGES = 26;
const VISIBLE_IMAGES = 4;
const DESCRIPTION_PREVIEW_LENGTH = 180;

const feed = document.getElementById("results-feed");
const title = document.getElementById("results-title");

const checkboxes = document.querySelectorAll('input[name="town"]');

let hotels = [];

/* ---------- Hotel detail modal ---------- */

const hotelModal = document.getElementById("hotel-modal");
const detailMainImage = document.getElementById("detail-main-image");
const detailThumbnails = document.getElementById("detail-thumbnails");

let activeDetailHotel = null;
let activePhotoIndex = 1;
let lastFocusedElement = null;

function showDetailPhoto(index) {
  if (!activeDetailHotel) return;

  activePhotoIndex = Math.max(1, Math.min(TOTAL_IMAGES, index));

  detailMainImage.src =
    `images/${activeDetailHotel.imagePrefix}.${activePhotoIndex}.jpg`;

  detailMainImage.alt =
    `${activeDetailHotel.name} - photo ${activePhotoIndex}`;

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

function openHotelDetails(hotel, photoIndex = 1) {
  activeDetailHotel = hotel;
  lastFocusedElement = document.activeElement;

  document.getElementById("detail-name").textContent = hotel.name;

  document.getElementById("detail-location").textContent =
    `${hotel.town}, Cebu`;

  document.getElementById("detail-score").textContent =
    hotel.score.toFixed(1);

  document.getElementById("detail-score-label").textContent =
    scoreLabel(hotel.score);

  document.getElementById("detail-reviews").textContent =
    `${hotel.reviews.toLocaleString("en-PH")} reviews`;

  // Show the FULL description inside the popup.
  document.getElementById("detail-description").textContent =
    hotel.desc;

  document.getElementById("detail-price").textContent =
    peso.format(hotel.price * nights());

  document.getElementById("detail-nights").textContent =
    `${nights()} night${nights() > 1 ? "s" : ""} · 2 adults`;

  // Render amenities.
  const amenities = document.getElementById("detail-amenities");
  amenities.replaceChildren();

  hotel.amenities.forEach(item => {
    amenities.appendChild(el("li", "", item));
  });

  // Render photo thumbnails.
  detailThumbnails.replaceChildren();

  for (let i = 1; i <= TOTAL_IMAGES; i++) {
    const button = el("button", "detail-thumbnail");
    button.type = "button";
    button.setAttribute("aria-label", `Show photo ${i}`);

    const img = document.createElement("img");

    img.src = `images/${hotel.imagePrefix}.${i}.jpg`;
    img.alt = "";
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

function closeHotelDetails() {
  if (!hotelModal.classList.contains("is-open")) return;

  hotelModal.classList.remove("is-open");
  hotelModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  activeDetailHotel = null;

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

/* ---------- Modal controls ---------- */

document
  .getElementById("modal-close")
  .addEventListener("click", closeHotelDetails);

document
  .getElementById("modal-backdrop")
  .addEventListener("click", closeHotelDetails);

document
  .getElementById("photo-prev")
  .addEventListener("click", () => {
    showDetailPhoto(
      activePhotoIndex <= 1
        ? TOTAL_IMAGES
        : activePhotoIndex - 1
    );
  });

document
  .getElementById("photo-next")
  .addEventListener("click", () => {
    showDetailPhoto(
      activePhotoIndex >= TOTAL_IMAGES
        ? 1
        : activePhotoIndex + 1
    );
  });

document.addEventListener("keydown", event => {
  if (!hotelModal.classList.contains("is-open")) return;

  if (event.key === "Escape") {
    closeHotelDetails();
  }

  if (event.key === "ArrowLeft") {
    showDetailPhoto(
      activePhotoIndex <= 1
        ? TOTAL_IMAGES
        : activePhotoIndex - 1
    );
  }

  if (event.key === "ArrowRight") {
    showDetailPhoto(
      activePhotoIndex >= TOTAL_IMAGES
        ? 1
        : activePhotoIndex + 1
    );
  }
});

/* ---------- Availability demo ---------- */

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

/* ---------- HTML element helper ---------- */

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

/* ---------- Rating label ---------- */

function scoreLabel(score) {
  if (score >= 8.5) return "Excellent";
  if (score >= 8) return "Very good";
  return "Good";
}

/* ---------- Calculate nights ---------- */

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

/* ---------- Four-image hotel gallery ---------- */

function createHotelGallery(hotel) {
  const gallery = el("div", "hotel-gallery");

  gallery.setAttribute("aria-label", "Hotel photo gallery");

  for (
    let i = 1;
    i <= Math.min(VISIBLE_IMAGES, TOTAL_IMAGES);
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
    const remainingImages = TOTAL_IMAGES - VISIBLE_IMAGES;

    if (isLastVisible && remainingImages > 0) {
      photo.classList.add("more-photos");
    }

    const img = document.createElement("img");

    img.src = `images/${hotel.imagePrefix}.${i}.jpg`;
    img.alt = `${hotel.name} - photo ${i}`;
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

/* ---------- Build hotel card ---------- */

function buildCard(hotel) {
  const card = el("article", "card");

  const gallery = createHotelGallery(hotel);
  const info = el("div", "info");

  info.append(
    el("h3", "", hotel.name),
    el("span", "location", `${hotel.town}, Cebu`)
  );

  // Short description on the homepage.
  const description = el("p", "desc collapsed");

  description.textContent =
    `${hotel.desc.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`;

  info.appendChild(description);

  // See more opens the popup with the complete description.
  if (hotel.desc.length > DESCRIPTION_PREVIEW_LENGTH) {
    const seeMore = el("button", "see-more-btn", "See more");

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
    description.textContent = hotel.desc;
    description.classList.remove("collapsed");
  }

  // Amenities.
  const list = el("ul", "amenities");

  hotel.amenities.forEach(amenity => {
    list.appendChild(el("li", "", amenity));
  });

  info.appendChild(list);

  // Guest note.
  if (hotel.quote) {
    info.appendChild(
      el("p", "review-quote", `Guest note: "${hotel.quote}"`)
    );
  }

  // Rating.
  const side = el("div", "side");
  const score = el("div", "score");

  const label = el(
    "div",
    "score-label",
    scoreLabel(hotel.score)
  );

  label.appendChild(
    el(
      "small",
      "",
      `${hotel.reviews.toLocaleString("en-PH")} reviews`
    )
  );

  score.append(
    label,
    el("span", "score-badge", hotel.score.toFixed(1))
  );

  // Price.
  const stayNights = nights();
  const price = el("div", "price");

  price.append(
    el(
      "small",
      "",
      `${stayNights} night${stayNights > 1 ? "s" : ""}, 2 adults`
    ),
    el("strong", "", peso.format(hotel.price * stayNights))
  );

  const bottom = el("div", "price-container");
  bottom.appendChild(price);

  const cta = el("button", "btn btn-primary", "See availability");
  cta.type = "button";

  // Also allow the main card button to open the details popup.
  cta.addEventListener("click", () => {
    openHotelDetails(hotel);
  });

  side.append(score, bottom, cta);
  card.append(gallery, info, side);

  return card;
}

/* ---------- Render hotel results ---------- */

function render() {
  const selectedTowns = [...checkboxes]
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);

  const filteredHotels = selectedTowns.length
    ? hotels.filter(hotel => selectedTowns.includes(hotel.town))
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
        "No properties match these towns yet. Clear a filter to see all stays."
      )
    );

    return;
  }

  filteredHotels.forEach(hotel => {
    feed.appendChild(buildCard(hotel));
  });
}

/* ---------- Load guest notes ---------- */

async function loadHotels() {
  feed.replaceChildren(
    el("div", "skeleton"),
    el("div", "skeleton")
  );

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    hotels = HOTELS.map((hotel, index) => ({
      ...hotel,
      quote: data.quotes[index]
        ? data.quotes[index].quote
        : "Great place!"
    }));
  } catch (error) {
    console.warn("API unavailable, using local data:", error);

    hotels = HOTELS.map(hotel => ({
      ...hotel
    }));
  }

  render();
}

/* ---------- Default check-in/check-out dates ---------- */

function setDefaultDates() {
  const formatDate = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

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

    const nextDay = new Date(checkin.value + "T00:00:00");
    nextDay.setDate(nextDay.getDate() + 1);

    const minimumCheckout = formatDate(nextDay);

    checkout.min = minimumCheckout;

    if (!checkout.value || checkout.value <= checkin.value) {
      checkout.value = minimumCheckout;
    }

    render();
  });

  checkout.addEventListener("change", render);
}

/* ---------- Search form ---------- */

document
  .getElementById("search-form")
  .addEventListener("submit", event => {
    event.preventDefault();
    render();
  });

/* ---------- Town filters ---------- */

checkboxes.forEach(checkbox => {
  checkbox.addEventListener("change", render);
});

/* ---------- Clear filters ---------- */

document
  .getElementById("clear-filters")
  .addEventListener("click", () => {
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    render();
  });

/* ---------- Initialize app ---------- */

setDefaultDates();
loadHotels();
