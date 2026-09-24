/* Lowell Heights comparison map. The sheet supplies names, addresses and links.
   Known locations cover new developments that address-range geocoders misplace. */
(() => {
  "use strict";

  const LOWELL = { lat: 47.89459, lng: -122.15276 };
  const KNOWN = [
    // Greenview: Conner Homes' own Google Maps directions; Ambleside: KB Home map.
    ["greenview heights", "12930 77th ave se", 47.8802857, -122.1293188],
    ["tambark 15", "17007 35th ave se", 47.8436787, -122.1854988],
    ["gordon homes - single family", "2223 124th st se", 47.8855696, -122.2017502],
    ["ambleside - single family", "2401 128th st se", 47.8816798, -122.2000402],
    ["fern at lockwood", "9811 31st ave se", 47.9085492, -122.1906888],
    ["snohomish gardens", "9405 paradise lake rd", 47.8007727, -122.1057068],
    ["moray village", "8731 maltby rd", 47.8051023, -122.1156975],
    ["elmbrook", "3924 jewell rd", 47.8185732, -122.1801380],
    ["4 new construction homes in silver lake", "1414 126th st se", 47.8836649, -122.2126443]
  ];

  let map;
  let lowellMarker;
  let markers = new Map();
  let revision = 0;
  let renderer;

  const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const normalized = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const validPoint = point => point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && point.lat > 47.4 && point.lat < 48.3 && point.lng > -122.7 && point.lng < -121.6;

  function locationFor(row) {
    const address = normalized(row["Community Address"]);
    const name = normalized(row["Community Name"]);
    if (!address) return null;
    const lat = Number(row.Latitude || row.latitude);
    const lng = Number(row.Longitude || row.longitude);
    if (validPoint({ lat, lng })) return { lat, lng };
    const known = KNOWN.find(([community, street]) => normalized(community) === name && address.startsWith(normalized(street)));
    return known ? { lat: known[2], lng: known[3] } : null;
  }

  async function geocode(address) {
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      if (!response.ok) return null;
      const point = await response.json();
      return validPoint(point) ? point : null;
    } catch (_) { return null; }
  }

  function milesFromLowell(point) {
    const radians = Math.PI / 180;
    const dLat = (point.lat - LOWELL.lat) * radians;
    const dLng = (point.lng - LOWELL.lng) * radians;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(LOWELL.lat * radians) *
      Math.cos(point.lat * radians) * Math.sin(dLng / 2) ** 2;
    return (3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  }

  function linkFor(row) {
    const source = String(row["Source URL"] || "").trim();
    try {
      const url = new URL(source);
      if (url.protocol === "https:" || url.protocol === "http:") return { url: url.href, label: "View listing" };
    } catch (_) {}
    return {
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row["Community Address"] || "")}`,
      label: "View location"
    };
  }

  function markSelected(index) {
    document.querySelectorAll(".competition-card").forEach(card => {
      card.classList.toggle("competition-selected", card.dataset.competitionIndex === String(index));
    });
  }

  function focus(index, scroll = false) {
    const marker = markers.get(Number(index));
    if (!marker || !map) return;
    markSelected(index);
    if (renderer === "leaflet") {
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 13), { duration: .7 });
      marker.openPopup();
    } else {
      map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 13), duration: 700 });
      if (!marker.getPopup().isOpen()) marker.togglePopup();
    }
    if (scroll) document.getElementById("competitionMap")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function fitAll() {
    if (!map || !lowellMarker) return;
    if (renderer === "leaflet") {
      const bounds = window.L.latLngBounds([lowellMarker.getLatLng()]);
      markers.forEach(marker => bounds.extend(marker.getLatLng()));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 12, animate: true });
    } else {
      const bounds = new window.maplibregl.LngLatBounds();
      bounds.extend(lowellMarker.getLngLat());
      markers.forEach(marker => bounds.extend(marker.getLngLat()));
      map.fitBounds(bounds, { padding: 45, maxZoom: 12, duration: 700 });
    }
  }

  function markerElement(kind, label) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = kind === "home" ? "competition-home-marker" : "competition-dot-marker";
    element.setAttribute("aria-label", label);
    if (kind === "home") element.innerHTML = '<img src="/fam-pin-logo.png" alt="">';
    return element;
  }

  function initialize() {
    const element = document.getElementById("competitionMap");
    if (!element || (!window.maplibregl && !window.L)) {
      if (element) element.innerHTML = '<p class="competition-map-error">Map tiles are unavailable. Use the listing and location links below.</p>';
      return;
    }
    const homePopup = '<div class="competition-popup"><strong>Lowell Heights</strong><span>5814 Lowell Larimer Rd, Everett, WA 98208</span><span>GreenCity Homes</span></div>';
    // Raster Positron keeps the map usable where WebGL is disabled.
    const canvas = document.createElement("canvas");
    const hasWebGL = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    if (hasWebGL && window.maplibregl) {
      try {
        map = new window.maplibregl.Map({
          container: element,
          style: "https://tiles.openfreemap.org/styles/positron",
          center: [LOWELL.lng, LOWELL.lat],
          zoom: 11,
          scrollZoom: false
        });
        renderer = "maplibre";
        map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");
        lowellMarker = new window.maplibregl.Marker({ element: markerElement("home", "Lowell Heights") })
          .setLngLat([LOWELL.lng, LOWELL.lat])
          .setPopup(new window.maplibregl.Popup({ offset: 23, maxWidth: "290px" }).setHTML(homePopup))
          .addTo(map);
      } catch (_) { map?.remove(); map = null; element.innerHTML = ""; }
    }
    if (!map && window.L) {
      renderer = "leaflet";
      map = window.L.map(element, { scrollWheelZoom: false }).setView([LOWELL.lat, LOWELL.lng], 11);
      window.L.tileLayer("https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);
      const homeIcon = window.L.divIcon({ className: "competition-leaflet-icon", html: markerElement("home", "Lowell Heights").outerHTML, iconSize: [38, 38], iconAnchor: [19, 19] });
      lowellMarker = window.L.marker([LOWELL.lat, LOWELL.lng], { icon: homeIcon }).bindPopup(homePopup).addTo(map);
    }
    if (!map) {
      element.innerHTML = '<p class="competition-map-error">Map tiles are unavailable. Use the listing and location links below.</p>';
      return;
    }
    fitAll();
    document.getElementById("competitionFitMap")?.addEventListener("click", fitAll);
    document.getElementById("competitionGrid")?.addEventListener("click", event => {
      const button = event.target.closest(".competition-locate");
      if (button) focus(button.dataset.competitionIndex, true);
    });
  }

  async function update(rows) {
    const currentRevision = ++revision;
    if (!map) initialize();
    if (!map) return;
    markers.forEach(marker => marker.remove());
    markers = new Map();

    const resolved = await Promise.all(rows.map(async row => {
      const address = String(row["Community Address"] || "").trim();
      return locationFor(row) || (address ? geocode(address) : null);
    }));
    if (currentRevision !== revision) return;

    rows.forEach((row, index) => {
      const point = resolved[index];
      const button = document.querySelector(`.competition-locate[data-competition-index="${index}"]`);
      if (!validPoint(point)) {
        if (button) { button.disabled = true; button.title = "A verified map location is needed"; }
        return;
      }
      const link = linkFor(row);
      const popup = `<div class="competition-popup"><strong>${esc(row["Community Name"])}</strong>
        <span>${esc(row["Builder"] || "")}</span><span>${esc(row["Community Address"])}</span>
        <span class="competition-popup-distance">${milesFromLowell(point)} mi from Lowell Heights · straight line</span>
        <a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${link.label} ↗</a></div>`;
      let marker;
      if (renderer === "leaflet") {
        const icon = window.L.divIcon({ className: "competition-leaflet-icon", html: markerElement("competitor", `Select ${row["Community Name"]}`).outerHTML, iconSize: [32, 32], iconAnchor: [16, 16] });
        marker = window.L.marker([point.lat, point.lng], { icon }).bindPopup(popup).addTo(map);
        marker.on("click", () => markSelected(index));
      } else {
        marker = new window.maplibregl.Marker({ element: markerElement("competitor", `Select ${row["Community Name"]}`) })
          .setLngLat([point.lng, point.lat])
          .setPopup(new window.maplibregl.Popup({ offset: 18, maxWidth: "290px" }).setHTML(popup))
          .addTo(map);
        marker.getElement().addEventListener("click", () => markSelected(index));
      }
      markers.set(index, marker);
      if (button) button.disabled = false;
    });
    fitAll();
    const missing = rows.length - markers.size;
    const count = document.getElementById("competitionMapCount");
    if (count) count.textContent = `${markers.size} of ${rows.length} competitors mapped${missing ? ` · ${missing} need a verified location` : ""}`;
    window.setTimeout(() => renderer === "leaflet" ? map.invalidateSize() : map.resize(), 50);
  }

  window.LowellCompetitionMap = { update, focus, fitAll };
})();
