const mapElement = document.getElementById('map');

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

function getPopupHtml() {
  return `<h5>${escapeHtml(mapElement.dataset.title)}</h5>
    <p>Exact Location will be provided after booking</p>`;
}

function showOpenStreetMap(longitude = 77.209, latitude = 28.6139) {
  if (typeof L === 'undefined') {
    mapElement.innerHTML = '<p class="map-error">Map service could not be loaded.</p>';
    return;
  }

  const map = L.map('map').setView([latitude, longitude], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  L.marker([latitude, longitude])
    .addTo(map)
    .bindPopup(getPopupHtml())
    .openPopup();
}

function showMap() {
  if (!mapElement) return;

  const mapToken = mapElement.dataset.mapToken;
    const coordinates = mapElement.dataset.coordinates
      ? mapElement.dataset.coordinates.split(',').map(Number)
      : null;
    if (!coordinates) {
      mapElement.innerHTML = '<p class="map-error">Location coordinates could not be found.</p>';
      return;
    }
  if (!mapToken || typeof mapboxgl === 'undefined') {
    showOpenStreetMap();
    return;
  }

  try {
    const [longitude, latitude] = coordinates;
    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 4
    });

    new mapboxgl.Marker()
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup().setHTML(getPopupHtml()))
      .addTo(map);

    map.on('error', () => {
      mapElement.innerHTML = '';
      showOpenStreetMap(longitude, latitude);
    });
  } catch (error) {
    console.error(error);
    showOpenStreetMap();
  }
}

showMap();