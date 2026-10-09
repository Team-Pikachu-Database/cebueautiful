"use strict";
  
const API_URL = "https://dummyjson.com/quotes?limit=6";
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

/* Mock hotel data: 4 real staycations in Rizal */
const HOTELS = [
  {
    id: 1,
    name: "Thunderbird Resorts & Casinos",
    town: "Cebu city",
    desc: "Hilltop resort with Spanish-style villas, a casino, pools, and wide views of Laguna de Bay.",
    amenities: ["Casino", "Infinity pool", "Lake view", "Free parking"],
    price: 6800, score: 8.6, reviews: 1240, hues: [200, 215],
    image: "hotel.jpg",
  },
  {
    id: 2,
    name: "Luljetta's Hanging Gardens Spa",
    town: "Lapu-lapu City",
    desc: "Garden spa hotel with hanging pools and Mediterranean-style rooms overlooking Metro Manila.",
    amenities: ["Spa", "Hanging pools", "City view", "Restaurant"],
    price: 4200, score: 8.2, reviews: 980, hues: [160, 190],
    image: "hotel.jpg",
  },
  {
    id: 3,
    name: "LeBlanc Hotel and Resort",
    town: "mandaue City",
    desc: "Boutique hotel in the hills of Antipolo with a swimming pool, cozy rooms, and cool mountain air.",
    amenities: ["Pool", "Free Wi-Fi", "Breakfast", "Family rooms"],
    price: 3500, score: 7.9, reviews: 610, hues: [30, 45],
    image: "hotel.jpg",
  },
  {
    id: 4,
    name: "Ten Cents to Heaven Leisure Camp",
    town: "Bogo City",
    desc: "Mountain camp in Tanay with campsites, cabins, and nature trails close to the Sierra Madre.",
    amenities: ["Camping", "Cabins", "Hiking trails", "Bonfire area"],
    price: 2400, score: 8.4, reviews: 355, hues: [120, 150],
    image: "hotel.jpg",
  },
  {
    id: 5,
    name: "Sogo hotel",
    town: "Carcar City",
    desc: "nice 360 window view, so clean so good",
    amenities: ["free Wi-fi", "family room", "delicious food"],
    price: 2400, score: 9.4, reviews: 344, hues: [120, 150],
    image: "hotel.jpg",
  },
];

const feed = document.getElementById("results-feed");
const title = document.getElementById("results-title");
const checkboxes = document.querySelectorAll('input[name="town"]');
let hotels = [];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function scoreLabel(s) {
  return s >= 8.5 ? "Excellent" : s >= 8 ? "Very good" : "Good";
}

function nights() {
  const a = new Date(document.getElementById("checkin").value);
  const b = new Date(document.getElementById("checkout").value);
  const n = Math.round((b - a) / 86400000);
  return n > 0 ? n : 1;
}

function buildCard(h) {
  const card = el("article", "card");

  const thumb = el("div", "thumb");
  const img = document.createElement("img");
  img.src = h.image;
  img.alt = `${h.name} in ${h.town}, Cebu`;
  img.loading = "lazy";
  thumb.appendChild(img);

  const info = el("div", "info");
  info.append(el("h3", "", h.name), el("span", "location", `${h.town}, Cebu`), el("p", "desc", h.desc));
  const list = el("ul", "amenities");
  h.amenities.forEach((a) => list.appendChild(el("li", "", a)));
  info.appendChild(list);
  if (h.quote) info.appendChild(el("p", "review-quote", `Guest note: "${h.quote}"`));

  const side = el("div", "side");
  const score = el("div", "score");
  const label = el("div", "score-label", scoreLabel(h.score));
  label.appendChild(el("small", "", `${h.reviews.toLocaleString("en-PH")} reviews`));
  score.append(label, el("span", "score-badge", h.score.toFixed(1)));

  const n = nights();
  const price = el("div", "price");
  price.append(el("small", "", `${n} night${n > 1 ? "s" : ""}, 2 adults`), el("strong", "", peso.format(h.price * n)));
  const cta = el("button", "btn btn-primary", "See availability");
  cta.type = "button";

  const bottom = el("div");
  bottom.append(price);
  side.append(score, bottom, cta);

  card.append(thumb, info, side);
  return card;
}

function render() {
  const towns = [...checkboxes].filter((c) => c.checked).map((c) => c.value);
  const list = towns.length ? hotels.filter((h) => towns.includes(h.town)) : hotels;
  

  title.textContent = `${list.length} propert${list.length === 1 ? "y" : "ies"} found`
  feed.replaceChildren();

  if (!list.length) {
    feed.appendChild(el("div", "empty", "No properties match these towns yet. Clear a filter to see all stays."));
    return;
  }
  list.forEach((h) => feed.appendChild(buildCard(h)));
}

/* Fetch from the API and merge a post title in as a guest note */
async function loadHotels() {
  feed.replaceChildren(el("div", "skeleton"), el("div", "skeleton"));
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    hotels = HOTELS.map((h, i) => ({ ...h, quote: data.quotes[i] ? data.quotes[i].quote : "great place!" }));
  } catch (err) {
    console.warn("API unavailable, using local data:", err);
    hotels = HOTELS.map((h) => ({ ...h }));
  }
  render();
}

function setDefaultDates() {
  const iso = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const next = new Date(today.getTime() + 86400000);
  const ci = document.getElementById("checkin");
  const co = document.getElementById("checkout");
  ci.min = iso(today); ci.value = iso(today);
  co.min = iso(next); co.value = iso(next);
  ci.addEventListener("change", () => {
    const min = new Date(new Date(ci.value).getTime() + 86400000);
    co.min = iso(min);
    if (co.value <= ci.value) co.value = iso(min);
    render();
  });
  co.addEventListener("change", render);
}

document.getElementById("search-form").addEventListener("submit", (e) => { e.preventDefault(); render(); });
checkboxes.forEach((c) => c.addEventListener("change", render));
document.getElementById("clear-filters").addEventListener("click", () => {
  checkboxes.forEach((c) => (c.checked = false));
  render();
});

setDefaultDates();
loadHotels();
