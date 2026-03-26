// ── Variables globales ──
let weatherData = null;
let weatherLocation = null;
let currentUnits = { temp: 'celsius', wind: 'kmh', precip: 'mm' };
let selectedDayIndex = 0;

// ── Detección de idioma ──
const supportedLangs = ['en', 'es'];
const browserLang = navigator.language?.slice(0, 2);
let currentLang = localStorage.getItem('lang')
  ?? (supportedLangs.includes(browserLang) ? browserLang : 'en');

// ── Traducciones ──
const translations = {
  en: {
    heroTitle: "How's the sky looking today?",
    searchPlaceholder: "Search for a city, e.g., New York",
    searchBtn: "Search",
    errorMessage: "No search result found!",
    dailyForecast: "Daily forecast",
    hourlyForecast: "Hourly forecast",
    today: "Today",
    feelsLike: "Feels Like",
    humidity: "Humidity",
    wind: "Wind",
    precipitation: "Precipitation",
    unitsBtn: "Units",
    switchToImperial: "Switch to Imperial",
    switchToMetric: "Switch to Metric",
    temperature: "Temperature",
    windSpeed: "Wind Speed",
    locale: "en-US",
  },
  es: {
    heroTitle: "¿Cómo está el cielo hoy?",
    searchPlaceholder: "Busca una ciudad, ej. Madrid",
    searchBtn: "Buscar",
    errorMessage: "¡No se encontraron resultados!",
    dailyForecast: "Previsión diaria",
    hourlyForecast: "Previsión por horas",
    today: "Hoy",
    feelsLike: "Sensación",
    humidity: "Humedad",
    wind: "Viento",
    precipitation: "Precipitación",
    unitsBtn: "Unidades",
    switchToImperial: "Cambiar a Imperial",
    switchToMetric: "Cambiar a Métrico",
    temperature: "Temperatura",
    windSpeed: "Vel. del viento",
    locale: "es-ES",
  },
};

function applyLanguage() {
  const t = translations[currentLang];

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key.startsWith('[placeholder]')) {
      el.placeholder = t[key.replace('[placeholder]', '')];
    } else {
      el.textContent = t[key];
    }
  });

  document.querySelector('.units-menu__switch').textContent =
    currentUnits.temp === 'celsius' ? t.switchToImperial : t.switchToMetric;

  document.getElementById('langLabel').textContent = currentLang.toUpperCase();

  if (weatherData) {
    renderDaysMenu(weatherData.daily);
    renderWeather(weatherData, weatherLocation);
  } else {
    document.getElementById('selectedDayLabel').textContent = t.today;
    document.querySelector('#daysMenu li[data-index="0"]').textContent = t.today;
  }
}

// ── localStorage: guardar/restaurar preferencias ──
function savePreferences() {
  localStorage.setItem('lang', currentLang);
  localStorage.setItem('units', JSON.stringify(currentUnits));
}

function loadPreferences() {
  document.querySelectorAll('.lang-menu__option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });

  const units = localStorage.getItem('units');
  if (units) {
    currentUnits = JSON.parse(units);
    const sections = document.querySelectorAll('.units-menu__section');
    const [tempOpts, windOpts, precipOpts] = [
      sections[0].querySelectorAll('.units-menu__option'),
      sections[1].querySelectorAll('.units-menu__option'),
      sections[2].querySelectorAll('.units-menu__option'),
    ];
    tempOpts[0].classList.toggle('active', currentUnits.temp === 'celsius');
    tempOpts[1].classList.toggle('active', currentUnits.temp === 'fahrenheit');
    windOpts[0].classList.toggle('active', currentUnits.wind === 'kmh');
    windOpts[1].classList.toggle('active', currentUnits.wind === 'mph');
    precipOpts[0].classList.toggle('active', currentUnits.precip === 'mm');
    precipOpts[1].classList.toggle('active', currentUnits.precip === 'in');
  }
}

// ── Menú de unidades ──
const unitsBtn = document.getElementById('unitsBtn');
const unitsMenu = document.getElementById('unitsMenu');

unitsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  unitsMenu.classList.toggle('is-open');
});

// ── Menú de idioma ──
const langBtn = document.getElementById('langBtn');
const langMenu = document.getElementById('langMenu');

langBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  langMenu.classList.toggle('is-open');
});

document.querySelectorAll('.lang-menu__option').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentLang = btn.dataset.lang;
    document.querySelectorAll('.lang-menu__option').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    langMenu.classList.remove('is-open');
    savePreferences();
    applyLanguage();
  });
});

// ── Menú de días ──
const daysBtn = document.getElementById('daySelectorBtn');
const daysMenu = document.getElementById('daysMenu');

daysBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  daysMenu.classList.toggle('is-open');
});

// ── Cerrar menús al hacer clic fuera ──
const searchWrapper = document.querySelector('.search-wrapper');
const searchDropdown = document.getElementById('searchDropdown');

document.addEventListener('click', (e) => {
  if (!unitsMenu.contains(e.target) && !unitsBtn.contains(e.target)) {
    unitsMenu.classList.remove('is-open');
  }
  if (!daysMenu.contains(e.target) && !daysBtn.contains(e.target)) {
    daysMenu.classList.remove('is-open');
  }
  if (!langMenu.contains(e.target) && !langBtn.contains(e.target)) {
    langMenu.classList.remove('is-open');
  }
  if (!searchWrapper.contains(e.target)) {
    searchDropdown.innerHTML = '';
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
    searchDropdown.innerHTML = '';
    document.querySelector('.error__text').textContent = translations[currentLang].errorMessage;
    document.getElementById('errorMessage').hidden = false;
    return;
  }

  document.getElementById('errorMessage').hidden = true;
  document.getElementById('weatherContent').hidden = false;
  showSuggestions(results);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

const clearBtn = document.getElementById('clearBtn');

searchInput.addEventListener('input', async () => {
  const query = searchInput.value.trim();
  clearBtn.hidden = query === '';

  if (query.length < 3) {
    searchDropdown.innerHTML = '';
    return;
  }

  const results = await searchCity(query);
  if (results.length > 0) {
    document.getElementById('errorMessage').hidden = true;
    showSuggestions(results);
  } else {
    searchDropdown.innerHTML = '';
  }
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.hidden = true;
  searchDropdown.innerHTML = '';
  searchInput.focus();
});

// ── Ciudades rápidas ──
document.querySelectorAll('.quick-city-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const results = await searchCity(btn.dataset.city);
    if (results.length === 0) return;
    searchInput.value = results[0].name;
    clearBtn.hidden = false;
    searchDropdown.innerHTML = '';
    document.getElementById('errorMessage').hidden = true;
    document.getElementById('weatherContent').hidden = false;
    await loadWeather(results[0]);
  });
});

async function searchCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results || [];
}

function showSuggestions(results) {
  searchDropdown.innerHTML = '';
  results.forEach((loc) => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-item';
    btn.textContent = [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ');
    btn.addEventListener('click', async () => {
      searchInput.value = loc.name;
      searchDropdown.innerHTML = '';
      await loadWeather(loc);
    });
    searchDropdown.appendChild(btn);
  });
}

// ── Cargar clima ──
async function loadWeather(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&forecast_days=7&timezone=auto`;
  const response = await fetch(url);
  const data = await response.json();
  weatherData = data;
  weatherLocation = loc;
  selectedDayIndex = 0;

  renderWeather(data, loc);
}

function renderWeather(data, loc) {
  const current = data.current;
  const t = translations[currentLang];

  document.getElementById('cityName').textContent = [loc.name, loc.country].filter(Boolean).join(', ');
  document.getElementById('currentTemp').textContent = formatTemp(current.temperature_2m);
  document.getElementById('weatherIcon').src = getIcon(current.weather_code);
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString(t.locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  document.getElementById('feelsLike').textContent = formatTemp(current.apparent_temperature);
  document.getElementById('humidity').textContent = current.relative_humidity_2m + '%';
  document.getElementById('wind').textContent = formatWind(current.wind_speed_10m);
  document.getElementById('precipitation').textContent = formatPrecip(current.precipitation);

  renderDaily(data.daily);
  renderDaysMenu(data.daily);
  renderHourly(data.hourly, data.daily.time[selectedDayIndex]);
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

// ── Actualizar menú de días ──
function renderDaysMenu(daily) {
  const t = translations[currentLang];
  const items = document.querySelectorAll('#daysMenu li');
  items.forEach((li, i) => {
    if (i === 0) {
      li.textContent = t.today;
    } else {
      li.textContent = new Date(daily.time[i] + 'T12:00:00').toLocaleDateString(t.locale, { weekday: 'long' });
    }
  });

  const label = document.getElementById('selectedDayLabel');
  if (selectedDayIndex === 0) {
    label.textContent = t.today;
  } else {
    label.textContent = new Date(daily.time[selectedDayIndex] + 'T12:00:00').toLocaleDateString(t.locale, { weekday: 'long' });
  }
}

// ── Pronóstico horario ──
function renderHourly(hourly, date) {
  const t = translations[currentLang];
  let count = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (!hourly.time[i].startsWith(date)) continue;
    if (count >= 10) break;
    document.getElementById('hour-' + count + '-time').textContent = new Date(hourly.time[i]).toLocaleTimeString(t.locale, { hour: 'numeric', hour12: currentLang === 'en' });
    document.getElementById('hour-' + count + '-icon').src = getIcon(hourly.weather_code[i]);
    document.getElementById('hour-' + count + '-temp').textContent = formatTemp(hourly.temperature_2m[i]);
    count++;
  }
}

// ── Menú de días - cambiar horas ──
document.querySelectorAll('#daysMenu li').forEach((li) => {
  li.addEventListener('click', () => {
    if (!weatherData) return;
    const index = parseInt(li.dataset.index);
    selectedDayIndex = index;
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

    if (text.includes('Celsius')) currentUnits.temp = 'celsius';
    if (text.includes('Fahrenheit')) currentUnits.temp = 'fahrenheit';
    if (text.includes('km/h')) currentUnits.wind = 'kmh';
    if (text.includes('mph')) currentUnits.wind = 'mph';
    if (text.includes('mm') || text.includes('Millimeters')) currentUnits.precip = 'mm';
    if (text.includes('in') || text.includes('Inches')) currentUnits.precip = 'in';

    const section = btn.closest('.units-menu__section');
    section.querySelectorAll('.units-menu__option').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const t = translations[currentLang];
    document.querySelector('.units-menu__switch').textContent =
      currentUnits.temp === 'celsius' ? t.switchToImperial : t.switchToMetric;

    savePreferences();
    if (weatherData) renderWeather(weatherData, weatherLocation);
  });
});

// Switch Imperial/Metric completo
document.querySelector('.units-menu__switch').addEventListener('click', () => {
  const isMetric = currentUnits.temp === 'celsius';
  currentUnits = isMetric
    ? { temp: 'fahrenheit', wind: 'mph', precip: 'in' }
    : { temp: 'celsius', wind: 'kmh', precip: 'mm' };

  document.querySelectorAll('.units-menu__section').forEach((section) => {
    const options = section.querySelectorAll('.units-menu__option');
    options.forEach((btn) => btn.classList.remove('active'));
    options[isMetric ? 1 : 0].classList.add('active');
  });

  const t = translations[currentLang];
  document.querySelector('.units-menu__switch').textContent =
    currentUnits.temp === 'celsius' ? t.switchToImperial : t.switchToMetric;

  savePreferences();
  if (weatherData) renderWeather(weatherData, weatherLocation);
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
  return new Date(dateString + 'T12:00:00').toLocaleDateString(translations[currentLang].locale, { weekday: 'short' });
}

function getIcon(code) {
  if (weatherCodeMap[code]) return weatherCodeMap[code][1];
  return 'assets/images/icon-overcast.webp';
}

// ── Geolocalización automática al cargar ──
async function loadGeolocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const geo = await res.json();

        const loc = {
          latitude,
          longitude,
          name: geo.address.city || geo.address.town || geo.address.village || geo.address.county || 'Tu ubicación',
          country: geo.address.country_code?.toUpperCase() ?? '',
        };

        document.getElementById('weatherContent').hidden = false;
        document.getElementById('errorMessage').hidden = true;
        await loadWeather(loc);
      } catch {
        // Si falla el reverse geocoding, continúa sin carga automática
      }
    },
    () => {
      // Permiso denegado: la app permanece en modo búsqueda
    }
  );
}

loadPreferences();
loadGeolocation();
applyLanguage();

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
