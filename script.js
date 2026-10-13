
"use strict";

const API_URL = "https://dummyjson.com/quotes?limit=6";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0
});

/* ---------- HOTEL DATA ---------- */

const HOTELS = [
  {
    id: 1,
    name: "Thunderbird Resorts & Casinos",
    town: "Cebu city",

    desc: `Bayfront Hotel Cebu – North Reclamation is conveniently located in Cebu City's commercial and business district, making it suitable for both leisure and business travelers. It is within walking distance of shopping destinations such as SM City Cebu and S&R. The hotel offers comfortable rooms with city views, safety boxes, flat-screen cable TVs, tea and coffee-making facilities, minibars, complimentary bottled water, private bathrooms, and free Wi-Fi. Guests can enjoy Filipino and international dishes at the hotel restaurant, with room service also available. Nearby attractions include Cebu Port, St. Joseph Parish, Ayala Center Cebu, Fort San Pedro, and Magellan's Cross. Mactan-Cebu International Airport is approximately 45 minutes away by car. The hotel also provides a 24-hour front desk, luggage storage assistance, airport transportation and car rental arrangements, and complimentary parking.`,

    amenities: [
      "Casino",
      "Infinity pool",
      "Lake view",
      "Free parking"
    ],

    price: 6800,
    score: 8.6,
    reviews: 1240,
    imagePrefix: "1",
    imageFolder: "images"
  },

  {
    id: 2,
    name: "Marco Polo Plaza Cebu",
    town: "Cebu city",

    desc: `Situated on Nivel Hills, Marco Polo Plaza Cebu offers 5 dining venues, a swimming pool, and rooms that look out over the mountains or the sea. Internet access and parking come free of charge.

The roomy guestrooms at Marco Polo Plaza are decorated in a modern style and feature large windows throughout. Every nonsmoking room is bright with ample natural light and comes equipped with a 32-inch flat-screen TV offering cable channels.

Car rental services and complimentary parking are available at the hotel. Guests can buy local souvenirs from the gift shop.

Blu Bar & Grill offers expansive views over Cebu City and serves an excellent range of grilled dishes. Additional dining options include Asian cuisine at Café Marco and refreshing cocktails at El Viento.

Cebu Marco Polo lies 11 mi from Mactan International Airport and 1.9 mi from Magellan's Cross.

Couples especially appreciate the location – they gave it a rating of 8.2 for a two-person trip.`,

    amenities: [
      "5 dining venues",
      "Swimming pool",
      "Free parking",
      "Gift shop",
      "Car rental",
      "Mountain or sea views"
    ],

    price: 8500,
    score: 8.2,
    reviews: 0,
    imagePrefix: "1",
    imageFolder: "images2",
    imageCount: 25
  },

  {
    id: 3,
    name: "Seda Ayala Center Cebu City",
    town: "Cebu city",

    desc: `Located in the heart of Cebu, 492 feet from Ayala Mall and 1.1 mi from SM City Cebu, Seda Ayala Center Cebu City Multiple-Use Hotel offers an on-site restaurant, a fitness center, and an outdoor swimming pool complete with a pool bar. The property also provides a 24-hour front desk, and free WiFi is accessible throughout the hotel.

Every room at Seda Ayala Center Cebu City Multiple-Use Hotel comes with air conditioning, a 48-inch LED TV with cable channels, and a safety deposit box. The rooms are also furnished with a desk, an electric kettle, and a refrigerator with mini-bar. The private bathroom features a hairdryer and a shower with complimentary toiletries.

Guests can start the day with an a la carte or buffet Asian breakfast at the hotel, while Misto Restaurant serves international and local favorites. The restaurant also offers Japanese, Thai, and Indian specialties. The pool bar offers a relaxing spot beside the pool, serving your favorite cocktail right at hand. In-room dining and breakfast can also be arranged for guests.

Laundry, ironing, and dry cleaning services are offered at an additional charge. The concierge can arrange airport shuttle or car rentals for guests who need them. Meeting and banquet facilities are also available.

Seda Ayala Center Cebu City Multiple-Use Hotel is 1.2 mi from Museo Sugbo and 2.1 mi from Fort San Pedro. Magellan's Cross lies 2.3 mi from the hotel. The closest airport is Mactan-Cebu International Airport, 7.1 mi from the property.

Couples especially appreciate the location – they gave it a rating of 9.4 for a two-person trip.`,

    amenities: [
      "Restaurant",
      "Fitness center",
      "Outdoor swimming pool",
      "Pool bar",
      "Free Wi-Fi",
      "24-hour front desk",
      "Airport shuttle",
      "Meeting facilities"
    ],

    price: 8500,
    score: 9.4,
    reviews: 0,
    imagePrefix: "1",
    imageFolder: "images3",
    imageCount: 22
  },

  {
    id: 4,
    name: "Hotel Elizabeth Cebu",
    town: "Cebu city",

    desc: `Hotel Elizabeth provides large accommodations just a 5-minute stroll from Ayala Mall and Cebu Business Park. The hotel features a fitness center, a restaurant, and complimentary Wi-Fi throughout.

Hotel Elizabeth Cebu is a 30-minute journey from Mactan-Cebu International Airport and just 15 minutes from downtown.

The rooms feature sophisticated decor and are fully equipped with air conditioning, a flat-screen cable television, and a mini-bar. Private bathrooms offer both hot and cold water services. Certain rooms provide a sitting area featuring a sofa.

Flora Café offers dishes from around the world. Dining can take place in the comfort of individual rooms.

Particularly, couples appreciate the location – they rated it 9.2 for trips for two.`,

    amenities: [
      "Fitness center",
      "Restaurant",
      "Complimentary Wi-Fi",
      "Air conditioning",
      "Flat-screen TV",
      "Mini-bar",
      "Private bathroom",
      "Flora Café"
    ],

    price: 8500,
    score: 9.2,
    reviews: 0,
    imagePrefix: "1",
    imageFolder: "images4",
    imageCount: 20
  },

  {
    id: 5,
    name: "NS Royal Hotel",
    town: "Cebu city",

    desc: `Situated on the vibrant Juana Osmena Street in Cebu City, NS Royal Hotel provides convenient lodging with free WiFi.

Every room is equipped with air conditioning and includes a private bathroom offering both hot and cold showers. The rooms also feature a cable TV, telephone, and a work desk.

Visitors can utilize the communal self-service laundry area, and complimentary parking is provided as well. The on-site cafe, Dre Cafe, serves food and drinks, and room service is provided as well.

Grocery and convenience shops are a 2-minute stroll from NS Royal Hotel, and the well-known nightlife venues Mango Square and One Mango Place are only a 5-minute walk away. The closest airport is Mactan Cebu International Airport, which is a 30-minute drive away from the property.

Couples especially appreciate the place – they gave it a score of 8.6 for a journey for two.`,

    amenities: [
      "Free Wi-Fi",
      "Air conditioning",
      "Private bathroom",
      "Hot and cold showers",
      "Cable TV",
      "Telephone",
      "Work desk",
      "Self-service laundry",
      "Complimentary parking",
      "Dre Cafe",
      "Room service"
    ],

    price: 8500,
    score: 8.6,
    reviews: 0,
    imagePrefix: "1",
    imageFolder: "images5",
    imageCount: 20
  }
];

const TOTAL_IMAGES = 26;
const VISIBLE_IMAGES = 4;
const DESCRIPTION_PREVIEW_LENGTH = 180;

/* ---------- HOTEL IMAGE HELPERS ---------- */

function hotelImageCount(hotel) {
  return hotel.imageCount || TOTAL_IMAGES;
}

function hotelImagePath(hotel, index) {
  const folder = hotel.imageFolder || "images";

  return `${folder}/${hotel.imagePrefix}.${index}.jpg`;
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

/* ---------- OPEN HOTEL DETAILS ---------- */

function openHotelDetails(hotel, photoIndex = 1) {
  activeDetailHotel = hotel;
  lastFocusedElement = document.activeElement;

  document.getElementById("detail-name").textContent =
    hotel.name;

  document.getElementById("detail-location").textContent =
    `${hotel.town}, Cebu`;

  document.getElementById("detail-score").textContent =
    hotel.score.toFixed(1);

  document.getElementById("detail-score-label").textContent =
    scoreLabel(hotel.score);

  document.getElementById("detail-reviews").textContent =
    `${hotel.reviews.toLocaleString("en-PH")} reviews`;

  document.getElementById("detail-description").textContent =
    hotel.desc;

  document.getElementById("detail-price").textContent =
    peso.format(hotel.price * nights());

  document.getElementById("detail-nights").textContent =
    `${nights()} night${nights() > 1 ? "s" : ""} · 2 adults`;

  /* Render amenities */

  const amenities = document.getElementById(
    "detail-amenities"
  );

  amenities.replaceChildren();

  hotel.amenities.forEach(item => {
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

/* Previous photo */

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

/* Next photo */

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

/* Keyboard controls */

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

/* ---------- BUILD HOTEL CARD ---------- */

function buildCard(hotel) {
  const card = el("article", "card");

  const gallery = createHotelGallery(hotel);

  const info = el("div", "info");

  info.append(
    el("h3", "", hotel.name),
    el("span", "location", `${hotel.town}, Cebu`)
  );

  /* Short description */

  const description = el("p", "desc collapsed");

  description.textContent =
    `${hotel.desc.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`;

  info.appendChild(description);

  /* See more */

  if (hotel.desc.length > DESCRIPTION_PREVIEW_LENGTH) {
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
    description.textContent = hotel.desc;

    description.classList.remove("collapsed");
  }

  /* Amenities */

  const list = el("ul", "amenities");

  hotel.amenities.forEach(amenity => {
    list.appendChild(el("li", "", amenity));
  });

  info.appendChild(list);

  /* Guest note */

  if (hotel.quote) {
    info.appendChild(
      el(
        "p",
        "review-quote",
        `Guest note: "${hotel.quote}"`
      )
    );
  }

  /* Rating */

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
      peso.format(hotel.price * stayNights)
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
  const selectedTowns = [...checkboxes]
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);

  const filteredHotels = selectedTowns.length
    ? hotels.filter(hotel =>
        selectedTowns.includes(hotel.town)
      )
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

/* ---------- LOAD GUEST NOTES ---------- */

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
    console.warn(
      "API unavailable, using local data:",
      error
    );

    hotels = HOTELS.map(hotel => ({
      ...hotel
    }));
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

/* ---------- TOWN FILTERS ---------- */

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
