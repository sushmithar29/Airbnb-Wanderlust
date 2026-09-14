const mapElement = document.getElementById("map");
const coordinates = JSON.parse(mapElement.dataset.coordinates);
const listingTitle = mapElement.dataset.title;

// GeoJSON stores coordinates as [longitude, latitude]; Leaflet uses [latitude, longitude].
const [longitude, latitude] = coordinates;
const map = L.map("map").setView([latitude, longitude], 9);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
}).addTo(map);

L.marker([latitude, longitude])
    .addTo(map)
    .bindPopup(listingTitle)
    .openPopup();
