"use strict";

(() => {
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
      if (["5505", "5506"].includes(codespacePort)) {
        return `${protocol}//${codespaceName}-5505.app.github.dev`;
      }
    }

    if (["localhost", "127.0.0.1"].includes(hostname) && ["5505", "5506"].includes(port)) {
      return `${protocol}//${hostname}:3000`;
    }

    return configuredApiBaseUrl || "";
  }

  const apiBaseUrl = resolveApiBaseUrl();
  const dialog = document.getElementById("hotel-map-dialog");
  const mapElement = document.getElementById("hotel-map-canvas");
  const title = document.getElementById("hotel-map-title");
  const address = document.getElementById("hotel-map-address");
  const status = document.getElementById("hotel-map-status");
  const candidatesElement = document.getElementById("hotel-map-candidates");
  const routeSummary = document.getElementById("hotel-map-route-summary");
  const directions = document.getElementById("hotel-map-directions");
  const externalLink = document.getElementById("hotel-map-external");
  const retryRouteButton = document.getElementById("hotel-map-retry-route");
  const locationButton = document.getElementById("hotel-map-retry-location");
  const tileError = document.getElementById("hotel-map-tile-error");
  const mapDialogClose = document.getElementById("hotel-map-close");
  const fullscreenButton = document.getElementById("hotel-map-fullscreen");
  const startForm = document.getElementById("hotel-map-start-form");
  const startInput = document.getElementById("hotel-map-start-input");
  const locationConsentDialog = document.getElementById("location-consent-dialog");
  const locationConsentButtons = [...locationConsentDialog.querySelectorAll("[data-location-choice]")];
  const locationPreferenceKey = "cebuStaysLocationPreference";

  let activeHotel = null;
  let hotelLocation = null;
  let userLocation = null;
  let startLabel = "Your current location";
  let mapInstance = null;
  let routeLayer = null;
  let hotelMarker = null;
  let userMarker = null;
  let routeAbortController = null;
  let operationId = 0;
  let locationRequestId = 0;
  let addressRequestId = 0;
  let previousFocus = null;
  let resizeObserver = null;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function validCoordinates(value) {
    return value &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude) &&
      value.latitude >= -90 &&
      value.latitude <= 90 &&
      value.longitude >= -180 &&
      value.longitude <= 180;
  }

  async function getJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    let data;
    try {
      const response = await fetch(url, {
        credentials: options.credentials ?? "include",
        ...options,
        signal: options.signal || controller.signal
      });
      try {
        data = await response.json();
      } catch {
        throw new Error(`The API returned an invalid response (HTTP ${response.status}).`);
      }
      if (!response.ok) {
        throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
      }
      if (!data || typeof data !== "object") {
        throw new Error("The API returned an invalid response.");
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError" && !options.signal) {
        throw new Error("The API request timed out. Please try again.");
      }
      if (error instanceof TypeError) {
        throw new Error("The browser could not reach the API. Make sure port 5505 is running and you are signed in to this Codespace.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function createMapIfNeeded() {
    if (mapInstance) return true;
    if (!window.L) {
      tileError.textContent = "The interactive map could not load. You can still open directions in Google Maps.";
      tileError.hidden = false;
      return false;
    }
    try {
      mapInstance = window.L.map(mapElement, {
        zoomControl: true,
        scrollWheelZoom: true
      });
      window.L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a> and the GIS User Community'
        }
      ).addTo(mapInstance).on("tileerror", () => {
        tileError.hidden = false;
      });
      routeLayer = window.L.geoJSON(null, {
        style: { color: "#0877d1", weight: 5, opacity: 0.85 }
      }).addTo(mapInstance);

      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(() => mapInstance?.invalidateSize());
        resizeObserver.observe(mapElement);
      }

      window.requestAnimationFrame(() => mapInstance?.invalidateSize());
      return true;
    } catch {
      tileError.textContent = "The interactive map could not initialize. You can still open directions in Google Maps.";
      tileError.hidden = false;
      mapInstance?.remove();
      mapInstance = null;
      routeLayer = null;
      return false;
    }
  }

  function updateMapMarkers() {
    if (!createMapIfNeeded()) return;

    if (hotelMarker) mapInstance.removeLayer(hotelMarker);
    if (userMarker) mapInstance.removeLayer(userMarker);

    if (hotelLocation && validCoordinates(hotelLocation)) {
      hotelMarker = window.L.marker(
        [hotelLocation.latitude, hotelLocation.longitude],
        {
          title: activeHotel.name.trim(),
          icon: window.L.divIcon({
            className: "hotel-map-marker-icon",
            html: '<span class="hotel-map-marker-pin" aria-hidden="true"></span>',
            iconSize: [28, 36],
            iconAnchor: [14, 35],
            popupAnchor: [0, -32]
          })
        }
      ).addTo(mapInstance).bindPopup(
        `<strong>${escapeHtml(activeHotel.name.trim())}</strong><br>${escapeHtml(hotelLocation.address || address.textContent)}`
      );
    }

    if (userLocation && validCoordinates(userLocation)) {
      userMarker = window.L.circleMarker(
        [userLocation.latitude, userLocation.longitude],
        {
          radius: 8,
          color: "#fff",
          weight: 3,
          fillColor: "#0877d1",
          fillOpacity: 1
        }
      ).addTo(mapInstance).bindPopup("Your starting location");
    }

    const points = [hotelLocation, userLocation]
      .filter(validCoordinates)
      .map(point => [point.latitude, point.longitude]);
    if (points.length > 1) {
      mapInstance.fitBounds(window.L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
    } else if (points.length === 1) {
      mapInstance.setView(points[0], 14);
    } else {
      mapInstance.setView([10.3157, 123.8854], 11);
    }
    window.requestAnimationFrame(() => mapInstance?.invalidateSize());
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  function formatDuration(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `about ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `about ${hours} hr ${remaining} min` : `about ${hours} hr`;
  }

  function maneuverText(step) {
    const maneuver = step.maneuver || {};
    const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : "";
    const road = step.name ? ` onto ${step.name}` : "";
    const descriptions = {
      depart: `Start${road}`,
      arrive: "Arrive at your destination",
      turn: `Turn${modifier}${road}`,
      "new name": `Continue${road}`,
      merge: `Merge${modifier}${road}`,
      "on ramp": `Take the ramp${modifier}${road}`,
      "off ramp": `Take the exit${modifier}${road}`,
      fork: `Keep${modifier}${road}`,
      "end of road": `Turn${modifier}${road}`,
      continue: `Continue${road}`,
      roundabout: `Enter the roundabout${road}`,
      rotary: `Enter the rotary${road}`
    };
    const key = maneuver.type === "turn" && maneuver.modifier
      ? "turn"
      : maneuver.type;
    return descriptions[key] || (step.name ? `Continue on ${step.name}` : "Continue on the route");
  }

  function updateExternalLink() {
    if (!hotelLocation || !validCoordinates(hotelLocation)) {
      externalLink.hidden = true;
      return;
    }

    const parameters = new URLSearchParams({
      api: "1",
      destination: `${hotelLocation.latitude},${hotelLocation.longitude}`,
      travelmode: "driving"
    });
    if (userLocation && validCoordinates(userLocation)) {
      parameters.set("origin", `${userLocation.latitude},${userLocation.longitude}`);
    }
    externalLink.href = `https://www.google.com/maps/dir/?${parameters}`;
    externalLink.hidden = false;
  }

  function showRoute(route) {
    if (mapInstance && routeLayer && route.geometry) {
      routeLayer.clearLayers();
      routeLayer.addData({
        type: "Feature",
        properties: {},
        geometry: route.geometry
      });
      const routeBounds = routeLayer.getBounds();
      if (routeBounds.isValid()) {
        mapInstance.fitBounds(routeBounds, { padding: [32, 32] });
      }
    }
    directions.replaceChildren();

    const steps = (route.legs || []).flatMap(leg => leg.steps || []);
    for (const step of steps) {
      const item = document.createElement("li");
      const instruction = document.createElement("span");
      instruction.textContent = maneuverText(step);
      const distance = document.createElement("small");
      distance.textContent = formatDistance(step.distance);
      item.append(instruction, distance);
      directions.append(item);
    }

    routeSummary.replaceChildren();
    const mode = document.createElement("strong");
    mode.textContent = `Driving · ${formatDistance(route.distance)}`;
    const duration = document.createElement("span");
    duration.textContent = `${formatDuration(route.duration)} (no live traffic)`;
    const start = document.createElement("small");
    start.textContent = `From ${startLabel}`;
    routeSummary.append(mode, duration, start);
    routeSummary.hidden = false;
    directions.hidden = steps.length === 0;
    retryRouteButton.textContent = "Refresh driving route";
    retryRouteButton.hidden = false;
    setStatus(mapInstance
      ? "Driving route and directions are ready."
      : "Driving directions are ready. The map display could not load.", !mapInstance);
    updateExternalLink();
  }

  async function calculateRoute() {
    if (!hotelLocation || !validCoordinates(hotelLocation)) {
      setStatus("Choose a verified hotel location before requesting directions.", true);
      return;
    }
    if (!userLocation || !validCoordinates(userLocation)) {
      setStatus("Share your location or enter a starting place to get a road route.", true);
      return;
    }
    routeAbortController?.abort();
    routeAbortController = new AbortController();
    const requestId = operationId;
    routeSummary.hidden = true;
    directions.hidden = true;
    retryRouteButton.disabled = true;
    retryRouteButton.textContent = "Calculating route…";
    retryRouteButton.hidden = false;
    setStatus("Calculating a real driving route…");

    const coordinates = `${userLocation.longitude},${userLocation.latitude};${hotelLocation.longitude},${hotelLocation.latitude}`;
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`;
    const abortController = routeAbortController;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, 20000);

    try {
      const data = await getJson(routeUrl, {
        signal: abortController.signal,
        credentials: "omit"
      });
      if (requestId !== operationId) return;
      if (data.code !== "Ok" || !Array.isArray(data.routes) || !data.routes[0]) {
        if (data.code === "NoRoute") {
          throw new Error(
            "No drivable road connects your starting point to this hotel. This may happen when your location is on another island. The hotel pin is shown; try a starting place in Cebu or open Google Maps."
          );
        }
        throw new Error(data.message || "No driving route is available between these locations.");
      }
      showRoute(data.routes[0]);
    } catch (error) {
      if (requestId !== operationId || (error.name === "AbortError" && !timedOut)) return;
      routeLayer?.clearLayers();
      routeSummary.hidden = true;
      directions.hidden = true;
      retryRouteButton.textContent = "Retry driving route";
      retryRouteButton.hidden = false;
      const message = timedOut
        ? "The routing service took too long to respond."
        : error.message;
      setStatus(
        timedOut
          ? `${message} Your map markers are still available.`
          : message,
        true
      );
      updateExternalLink();
    } finally {
      window.clearTimeout(timeout);
      if (requestId === operationId) retryRouteButton.disabled = false;
    }
  }

  function showCandidates(candidates, target) {
    candidatesElement.replaceChildren();
    candidatesElement.hidden = candidates.length === 0;
    if (!candidates.length) return;

    const label = document.createElement("p");
    label.textContent = target === "hotel"
      ? "We found possible hotel locations. Select the correct property:"
      : "Choose the starting place that matches your address:";
    candidatesElement.append(label);

    for (const candidate of candidates) {
      if (!validCoordinates(candidate)) continue;
      const button = document.createElement("button");
      button.className = "map-candidate";
      button.type = "button";
      button.textContent = candidate.address || candidate.name || "Map result";
      button.addEventListener("click", () => {
        candidatesElement.hidden = true;
        if (target === "hotel") {
          hotelLocation = candidate;
          address.textContent = candidate.address || "Selected map location";
          updateMapMarkers();
          updateExternalLink();
          if (userLocation) {
            retryRouteButton.hidden = false;
            calculateRoute();
          } else {
            setStatus("Hotel location selected. Allow device location or enter a starting place for directions.");
          }
        } else {
          userLocation = {
            latitude: candidate.latitude,
            longitude: candidate.longitude
          };
          startLabel = candidate.address || candidate.name || "Selected starting place";
          updateMapMarkers();
          updateExternalLink();
          retryRouteButton.hidden = false;
          calculateRoute();
        }
      });
      candidatesElement.append(button);
    }
  }

  async function loadHotelLocation(currentOperation) {
    setStatus("Finding this hotel's map location…");
    const response = await getJson(
      `${apiBaseUrl}/api/hotels/${encodeURIComponent(activeHotel.id)}/location`
    );
    if (currentOperation !== operationId) return;

    if (response.status === "resolved" && validCoordinates(response.location)) {
      hotelLocation = response.location;
      address.textContent = response.location.address || `${activeHotel.location}, ${activeHotel.town}, Cebu`;
      updateMapMarkers();
      updateExternalLink();
      if (userLocation) {
        retryRouteButton.hidden = false;
        await calculateRoute();
      } else {
        retryRouteButton.hidden = true;
        setStatus("Hotel location found. Allow device location or enter a starting place to get directions.");
      }
      return;
    }

    if (response.status === "choose_location") {
      retryRouteButton.hidden = true;
      setStatus("The hotel address is ambiguous. Select the matching map result.", true);
      showCandidates(response.candidates || [], "hotel");
      return;
    }

    setStatus("We could not verify this hotel's exact map location. Try again or open the address in Google Maps.", true);
    retryRouteButton.hidden = true;
    const search = new URLSearchParams({
      api: "1",
      query: `${activeHotel.name.trim()}, ${activeHotel.location}, ${activeHotel.town}, Cebu, Philippines`
    });
    externalLink.href = `https://www.google.com/maps/search/?${search}`;
    externalLink.hidden = false;
  }

  function locateUser(currentOperation) {
    if (!("geolocation" in navigator)) {
      setStatus("This browser does not support location. Enter a starting place below.", true);
      return;
    }

    const requestId = ++locationRequestId;
    locationButton.disabled = true;
    setStatus("Requesting your location. Allow location access in your browser…");
    navigator.geolocation.getCurrentPosition(position => {
      if (currentOperation !== operationId || requestId !== locationRequestId) return;
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      startLabel = "Your current location";
      locationButton.disabled = false;
      updateMapMarkers();
      updateExternalLink();
      if (hotelLocation) {
        retryRouteButton.hidden = false;
        calculateRoute();
      }
      else setStatus("Your location is ready. Finding the hotel's map location…");
    }, error => {
      if (currentOperation !== operationId || requestId !== locationRequestId) return;
      locationButton.disabled = false;
      const message = error.code === error.PERMISSION_DENIED
        ? "Location access was denied. Enter a starting place below or allow location and retry."
        : error.code === error.TIMEOUT
          ? "Your location request timed out. Enter a starting place or retry."
          : "Your location is unavailable. Enter a starting place or retry.";
      setStatus(message, true);
    }, {
      enableHighAccuracy: false,
      maximumAge: 30000,
      timeout: 15000
    });
  }

  function readLocationPreference() {
    try {
      const persistentChoice = window.localStorage.getItem(locationPreferenceKey);
      if (["always", "denied"].includes(persistentChoice)) return persistentChoice;
      const sessionChoice = window.sessionStorage.getItem(locationPreferenceKey);
      return sessionChoice === "session" ? sessionChoice : null;
    } catch {
      return null;
    }
  }

  function saveLocationPreference(choice) {
    try {
      window.localStorage.removeItem(locationPreferenceKey);
      window.sessionStorage.removeItem(locationPreferenceKey);
      if (choice === "always" || choice === "denied") {
        window.localStorage.setItem(locationPreferenceKey, choice);
      } else if (choice === "session") {
        window.sessionStorage.setItem(locationPreferenceKey, choice);
      }
      return true;
    } catch {
      setStatus("Your browser could not remember this preference. It will apply only right now.", true);
      return false;
    }
  }

  function requestLocationAccess() {
    const preference = readLocationPreference();
    if (preference === "always" || preference === "session") {
      locateUser(operationId);
      return;
    }
    if (preference === "denied") {
      setStatus("Location access is turned off. Choose location access to change this setting.");
      return;
    }
    locationConsentDialog.showModal();
    locationConsentButtons[0]?.focus();
  }

  function chooseLocationAccess(choice) {
    locationConsentDialog.close();
    saveLocationPreference(choice);
    if (choice === "denied") {
      userLocation = null;
      if (userMarker && mapInstance) mapInstance.removeLayer(userMarker);
      userMarker = null;
      routeLayer?.clearLayers();
      routeSummary.hidden = true;
      directions.hidden = true;
      setStatus("Location access is off. Enter a starting place below or choose location access to change this setting.");
      updateExternalLink();
      return;
    }

    if (!("geolocation" in navigator)) {
      setStatus("This browser does not support device location. Enter a starting place below.", true);
      return;
    }
    locateUser(operationId);
  }

  async function findStartingPlace(event) {
    event.preventDefault();
    const query = startInput.value.trim();
    if (query.length < 3) {
      setStatus("Enter at least 3 characters for the starting place.", true);
      startInput.focus();
      return;
    }

    const currentOperation = operationId;
    const requestId = ++addressRequestId;
    setStatus("Looking up your starting place. It will be sent to OpenStreetMap's geocoder and held temporarily in server memory only.");
    try {
      const params = new URLSearchParams({ q: query });
      const response = await getJson(`${apiBaseUrl}/api/geocode?${params}`);
      if (currentOperation !== operationId || requestId !== addressRequestId) return;
      if (response.status === "choose_location") {
        showCandidates(response.candidates || [], "origin");
        setStatus("Select the result matching your starting place.");
      } else {
        setStatus("No matching starting place was found. Try adding a town or nearby landmark.", true);
      }
    } catch (error) {
      if (currentOperation !== operationId || requestId !== addressRequestId) return;
      setStatus(`${error.message} You can retry the search.`, true);
    }
  }

  function open(hotel, trigger) {
    if (!hotel || typeof hotel.id !== "string") return;
    closeMap();
    operationId += 1;
    const currentOperation = operationId;
    activeHotel = hotel;
    previousFocus = trigger || document.activeElement;
    hotelLocation = null;
    userLocation = null;
    startLabel = "Your current location";
    locationRequestId += 1;
    addressRequestId += 1;
    locationButton.disabled = false;
    tileError.hidden = true;
    routeSummary.hidden = true;
    directions.hidden = true;
    candidatesElement.replaceChildren();
    candidatesElement.hidden = true;
    retryRouteButton.hidden = true;
    startInput.value = "";
    title.textContent = hotel.name.trim() || "Hotel location";
    address.textContent = `${hotel.location || ""}${hotel.town ? `, ${hotel.town}` : ""}, Cebu, Philippines`;
    setStatus("Finding this hotel's location…");

    dialog.showModal();
    mapDialogClose.focus();
    createMapIfNeeded();
    updateExternalLink();
    loadHotelLocation(currentOperation).catch(error => {
      if (currentOperation === operationId) {
        setStatus(`Could not load this hotel's location: ${error.message} Check the API connection and retry.`, true);
        retryRouteButton.textContent = "Retry hotel lookup";
        retryRouteButton.hidden = false;
      }
    });
    requestLocationAccess();
  }

  function closeMap() {
    operationId += 1;
    locationRequestId += 1;
    addressRequestId += 1;
    if (locationConsentDialog.open) locationConsentDialog.close();
    routeAbortController?.abort();
    routeAbortController = null;
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
      routeLayer = null;
      hotelMarker = null;
      userMarker = null;
    }
  }

  mapDialogClose.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    closeMap();
    if (previousFocus?.isConnected) previousFocus.focus();
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  locationButton.addEventListener("click", requestLocationAccess);
  locationConsentButtons.forEach(button => {
    button.addEventListener("click", () => {
      chooseLocationAccess(button.dataset.locationChoice);
    });
  });
  retryRouteButton.addEventListener("click", () => {
    if (!hotelLocation) {
      const retryOperation = operationId;
      retryRouteButton.disabled = true;
      loadHotelLocation(retryOperation).catch(error => {
        if (retryOperation !== operationId) return;
        setStatus(`Could not load this hotel's location: ${error.message}`, true);
        retryRouteButton.disabled = false;
        retryRouteButton.textContent = "Retry hotel lookup";
        retryRouteButton.hidden = false;
      });
      return;
    }
    calculateRoute();
  });
  startForm.addEventListener("submit", findStartingPlace);
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await mapElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      window.requestAnimationFrame(() => mapInstance?.invalidateSize());
    } catch {
      setStatus("Fullscreen is not available in this browser.", true);
    }
  });
  document.addEventListener("fullscreenchange", () => {
    window.requestAnimationFrame(() => mapInstance?.invalidateSize());
  });

  window.CebuStaysMap = { open };
})();
