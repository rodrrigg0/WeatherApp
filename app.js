// ── Variables globales ──
let weatherData = null;
let weatherLocation = null;
let currentUnits = { temp: 'celsius', wind: 'kmh', precip: 'mm' };

// ── Menú de unidades ──
const unitsBtn = document.getElementById('unitsBtn');
const unitsMenu = document.getElementById('unitsMenu');

unitsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  unitsMenu.classList.toggle('is-open');
});

// ── Menú de días ──
const daysBtn = document.getElementById('daySelectorBtn');
const daysMenu = document.getElementById('daysMenu');

daysBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  daysMenu.classList.toggle('is-open');
});

// ── Cerrar menús al hacer clic fuera ──
document.addEventListener('click', (e) => {
  if (!unitsMenu.contains(e.target) && !unitsBtn.contains(e.target)) {
    unitsMenu.classList.remove('is-open');
  }
  if (!daysMenu.contains(e.target) && !daysBtn.contains(e.target)) {
    daysMenu.classList.remove('is-open');
  }
});

// ── Búsqueda ──
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');

searchBtn.addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) return;

  const results = await searchCity(query);

  if (results.length === 0) {
  document.getElementById('weatherContent').hidden = true;
  document.getElementById('searchDropdown').innerHTML = '';
  document.getElementById('errorMessage').hidden = false;
  return;
}

document.getElementById('errorMessage').hidden = true;
document.getElementById('weatherContent').hidden = false;
showSuggestions(results);
});

async function searchCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results || [];
}

function showSuggestions(results) {
  const dropdown = document.getElementById('searchDropdown');
  dropdown.innerHTML = '';
  results.forEach((loc) => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-item';
    btn.textContent = [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ');
    btn.addEventListener('click', async () => {
      searchInput.value = loc.name;
      dropdown.innerHTML = '';
      await loadWeather(loc);
    });
    dropdown.appendChild(btn);
  });
}

// ── Cargar clima ──
async function loadWeather(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&forecast_days=7&timezone=auto`;
  const response = await fetch(url);
  const data = await response.json();
  weatherData = data;
  weatherLocation = loc;
  renderWeather(data, loc);
}

function renderWeather(data, loc) {
  const current = data.current;

  // Tarjeta principal
  document.getElementById('cityName').textContent = [loc.name, loc.country].filter(Boolean).join(', ');
  document.getElementById('currentTemp').textContent = formatTemp(current.temperature_2m);
  document.getElementById('weatherIcon').src = getIcon(current.weather_code);
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Métricas
  document.getElementById('feelsLike').textContent = formatTemp(current.apparent_temperature);
  document.getElementById('humidity').textContent = current.relative_humidity_2m + '%';
  document.getElementById('wind').textContent = formatWind(current.wind_speed_10m);
  document.getElementById('precipitation').textContent = formatPrecip(current.precipitation);

  renderDaily(data.daily);
  renderHourly(data.hourly, data.daily.time[0]);
}

// ── Pronóstico 7 días ──
function renderDaily(daily) {
  for (let i = 0; i < 7; i++) {
    document.getElementById('day-' + i + '-name').textContent = getDayShort(daily.time[i]);
    document.getElementById('day-' + i + '-icon').src = getIcon(daily.weather_code[i]);
    document.getElementById('day-' + i + '-max').textContent = formatTemp(daily.temperature_2m_max[i]);
    document.getElementById('day-' + i + '-min').textContent = formatTemp(daily.temperature_2m_min[i]);
  }
}

// ── Pronóstico horario ──
function renderHourly(hourly, date) {
  let count = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (!hourly.time[i].startsWith(date)) continue;
    if (count >= 10) break;
    document.getElementById('hour-' + count + '-time').textContent = new Date(hourly.time[i]).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    document.getElementById('hour-' + count + '-icon').src = getIcon(hourly.weather_code[i]);
    document.getElementById('hour-' + count + '-temp').textContent = formatTemp(hourly.temperature_2m[i]);
    count++;
  }
}

// ── Menú de días - cambiar horas ──
document.querySelectorAll('#daysMenu li').forEach((li) => {
  li.addEventListener('click', () => {
    if (!weatherData) return;
    const index = li.dataset.index;
    const date = weatherData.daily.time[index];
    document.getElementById('selectedDayLabel').textContent = li.textContent;
    daysMenu.classList.remove('is-open');
    renderHourly(weatherData.hourly, date);
  });
});

// ── Menú de unidades ──
document.querySelectorAll('.units-menu__option').forEach((btn) => {
  btn.addEventListener('click', () => {
    const text = btn.textContent.trim();

    // Cambia la unidad según el botón pulsado
    if (text.includes('Celsius')) currentUnits.temp = 'celsius';
    if (text.includes('Fahrenheit')) currentUnits.temp = 'fahrenheit';
    if (text.includes('km/h')) currentUnits.wind = 'kmh';
    if (text.includes('mph')) currentUnits.wind = 'mph';
    if (text.includes('mm')) currentUnits.precip = 'mm';
    if (text.includes('in')) currentUnits.precip = 'in';

    // Quita active de todos los botones del mismo grupo
    const section = btn.closest('.units-menu__section');
    section.querySelectorAll('.units-menu__option').forEach((b) => {
      b.classList.remove('active');
    });

    // Marca solo el pulsado
    btn.classList.add('active');

    if (weatherData) renderWeather(weatherData, weatherLocation);
  });
});

// ── Conversión de unidades ──
function formatTemp(celsius) {
  if (currentUnits.temp === 'fahrenheit') return Math.round(celsius * 9/5 + 32) + '°';
  return Math.round(celsius) + '°';
}

function formatWind(kmh) {
  if (currentUnits.wind === 'mph') return Math.round(kmh * 0.621) + ' mph';
  return Math.round(kmh) + ' km/h';
}

function formatPrecip(mm) {
  if (currentUnits.precip === 'in') return (mm * 0.0394).toFixed(2) + ' in';
  return mm + ' mm';
}

// ── Helpers ──
function getDayShort(dateString) {
  return new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

function getIcon(code) {
  if (weatherCodeMap[code]) return weatherCodeMap[code][1];
  return 'assets/images/icon-overcast.webp';
}

// ── Códigos WMO ──
const weatherCodeMap = {
  0: ['Cielo despejado', 'assets/images/icon-sunny.webp'],
  1: ['Mayormente despejado', 'assets/images/icon-sunny.webp'],
  2: ['Parcialmente nublado', 'assets/images/icon-partly-cloudy.webp'],
  3: ['Cubierto', 'assets/images/icon-partly-cloudy.webp'],
  45: ['Niebla', 'assets/images/icon-fog.webp'],
  48: ['Niebla de escarcha', 'assets/images/icon-fog.webp'],
  51: ['Llovizna ligera', 'assets/images/icon-drizzle.webp'],
  53: ['Llovizna moderada', 'assets/images/icon-drizzle.webp'],
  55: ['Llovizna densa', 'assets/images/icon-drizzle.webp'],
  56: ['Llovizna helada ligera', 'assets/images/icon-drizzle.webp'],
  57: ['Llovizna helada densa', 'assets/images/icon-drizzle.webp'],
  61: ['Lluvia ligera', 'assets/images/icon-rain.webp'],
  63: ['Lluvia moderada', 'assets/images/icon-rain.webp'],
  65: ['Lluvia intensa', 'assets/images/icon-rain.webp'],
  66: ['Lluvia helada ligera', 'assets/images/icon-rain.webp'],
  67: ['Lluvia helada densa', 'assets/images/icon-rain.webp'],
  71: ['Nieve ligera', 'assets/images/icon-snow.webp'],
  73: ['Nieve moderada', 'assets/images/icon-snow.webp'],
  75: ['Nieve intensa', 'assets/images/icon-snow.webp'],
  77: ['Granos de nieve', 'assets/images/icon-snow.webp'],
  80: ['Lluvias ligeras', 'assets/images/icon-rain.webp'],
  81: ['Lluvias moderadas', 'assets/images/icon-rain.webp'],
  82: ['Lluvias fuertes', 'assets/images/icon-rain.webp'],
  85: ['Nevadas ligeras', 'assets/images/icon-snow.webp'],
  86: ['Nevadas fuertes', 'assets/images/icon-snow.webp'],
  95: ['Tormenta eléctrica', 'assets/images/icon-storm.webp'],
  96: ['Tormenta con granizo ligero', 'assets/images/icon-storm.webp'],
  99: ['Tormenta con granizo fuerte', 'assets/images/icon-storm.webp'],
};