/* ─────────────────────────────────────────────
   WeatherNow — app.js  (Full Interactive)
   Features:
   • Search (Enter + button click)
   • Geolocation
   • °C / °F toggle (unit toggle btn + settings select)
   • Language toggle (EN / HI)
   • Settings dropdown
   • Loading overlay
   • Toast notifications
   • Auto clock
   • Mobile sidebar drawer
   • Chart.js temperature chart
   • Circular SVG rings (Rain, UV, Cloud)
───────────────────────────────────────────── */
"use strict";

/* ── State ── */
let currentCity  = localStorage.getItem("lastCity") || "New York";
let currentUnit  = localStorage.getItem("unit")     || "celsius";
let currentLang  = localStorage.getItem("lang")     || "en";
let chartInstance = null;
let lastLat = null, lastLon = null;

/* ── Conditions map ── */
const CONDITIONS = {
  en: {
    0:"Clear sky", 1:"Mainly clear", 2:"Partly cloudy", 3:"Overcast",
    45:"Foggy", 48:"Rime fog", 51:"Light drizzle", 53:"Drizzle", 55:"Heavy drizzle",
    61:"Slight rain", 63:"Moderate rain", 65:"Heavy rain",
    71:"Light snow", 73:"Moderate snow", 75:"Heavy snow",
    80:"Light showers", 81:"Moderate showers", 82:"Heavy showers",
    95:"Thunderstorm", 96:"Thunderstorm+hail", 99:"Heavy thunderstorm"
  },
  hi: {
    0:"साफ़ आसमान", 1:"मुख्यतः साफ़", 2:"आंशिक बादल", 3:"घने बादल",
    45:"कोहरा", 48:"ओस कोहरा", 51:"हल्की बूंदाबांदी", 53:"बूंदाबांदी", 55:"भारी बूंदाबांदी",
    61:"हल्की बारिश", 63:"मध्यम बारिश", 65:"भारी बारिश",
    71:"हल्की बर्फ", 73:"मध्यम बर्फ", 75:"भारी बर्फ",
    80:"हल्की बौछारें", 81:"मध्यम बौछारें", 82:"भारी बौछारें",
    95:"तूफान", 96:"ओलावृष्टि", 99:"भारी तूफान"
  }
};

/* ── Weather icons ── */
const DAY_ICONS = {
  0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️",
  45:"🌫️", 48:"🌫️", 51:"🌦️", 53:"🌧️", 55:"🌧️",
  61:"🌧️", 63:"🌧️", 65:"🌧️", 71:"🌨️", 73:"🌨️", 75:"❄️",
  80:"🌦️", 81:"🌧️", 82:"🌧️",
  95:"⛈️", 96:"⛈️", 99:"⛈️"
};
const NIGHT_ICONS = {
  0:"🌙", 1:"🌙", 2:"☁️", 3:"☁️",
  45:"🌫️", 48:"🌫️", 51:"🌦️", 53:"🌧️", 55:"🌧️",
  61:"🌧️", 63:"🌧️", 65:"🌧️", 71:"🌨️", 73:"🌨️", 75:"❄️",
  80:"🌦️", 81:"🌧️", 82:"🌧️",
  95:"⛈️", 96:"⛈️", 99:"⛈️"
};
function getIcon(code, isDay = 1) {
  const map = isDay === 0 ? NIGHT_ICONS : DAY_ICONS;
  return map[code] ?? (isDay === 0 ? "🌙" : "☀️");
}

/* ── Unit helpers ── */
function toDisplay(celsiusVal) {
  if (currentUnit === "fahrenheit") return Math.round(celsiusVal * 9/5 + 32);
  return Math.round(celsiusVal);
}
function unitLabel() { return currentUnit === "fahrenheit" ? "°F" : "°C"; }

/* ── Toast ── */
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

/* ── Loading ── */
function setLoading(on) {
  const ov = document.getElementById("loadingOverlay");
  if (ov) ov.classList.toggle("active", on);
}

/* ── Clock ── */
function updateClock() {
  const now = new Date();
  const dateEl = document.getElementById("currentDate");
  const timeEl = document.getElementById("currentTime");
  if (dateEl) dateEl.textContent = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  if (timeEl) timeEl.textContent = now.toLocaleTimeString("en-US", { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

/* ── Settings dropdown ── */
function initSettings() {
  const btn     = document.getElementById("settingsBtn");
  const dropdown = document.getElementById("settingsDropdown");
  const wrap    = document.getElementById("settingsWrap");

  btn?.addEventListener("click", e => {
    e.stopPropagation();
    dropdown?.classList.toggle("open");
  });

  document.addEventListener("click", e => {
    if (wrap && !wrap.contains(e.target)) dropdown?.classList.remove("open");
  });

  /* Unit select inside settings */
  const unitSelect = document.getElementById("unitSelect");
  if (unitSelect) {
    unitSelect.value = currentUnit;
    unitSelect.addEventListener("change", e => {
      currentUnit = e.target.value;
      localStorage.setItem("unit", currentUnit);
      syncUnitToggleBtn();
      if (lastLat !== null) loadWeatherData(null, lastLat, lastLon);
      else loadWeatherData(currentCity);
    });
  }

  /* Language select inside settings */
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener("change", e => {
      currentLang = e.target.value;
      localStorage.setItem("lang", currentLang);
      if (lastLat !== null) loadWeatherData(null, lastLat, lastLon);
      else loadWeatherData(currentCity);
    });
  }
}

/* ── Unit toggle button (°C / °F quick-switch) ── */
function syncUnitToggleBtn() {
  const btn = document.getElementById("unitToggle");
  if (!btn) return;
  btn.textContent = currentUnit === "celsius" ? "°C" : "°F";
}

function initUnitToggle() {
  syncUnitToggleBtn();
  document.getElementById("unitToggle")?.addEventListener("click", () => {
    currentUnit = currentUnit === "celsius" ? "fahrenheit" : "celsius";
    localStorage.setItem("unit", currentUnit);
    syncUnitToggleBtn();
    // sync settings dropdown too
    const unitSelect = document.getElementById("unitSelect");
    if (unitSelect) unitSelect.value = currentUnit;
    if (lastLat !== null) loadWeatherData(null, lastLat, lastLon);
    else loadWeatherData(currentCity);
  });
}

/* ── Geolocation ── */
function initGeolocation() {
  const doGeo = () => {
    if (!navigator.geolocation) { showToast("Geolocation not supported"); return; }
    showToast("📍 Detecting location…");
    navigator.geolocation.getCurrentPosition(
      pos => loadWeatherData(null, pos.coords.latitude, pos.coords.longitude),
      ()  => showToast("❌ Location permission denied")
    );
  };
  document.getElementById("locBtn")?.addEventListener("click", doGeo);
  document.getElementById("mobileLocBtn")?.addEventListener("click", doGeo);
}

/* ── Mobile sidebar ── */
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const openBtn = document.getElementById("mobileMenuBtn");
  const closeBtn = document.getElementById("sidebarClose");
  const open  = () => { sidebar?.classList.add("open"); overlay?.classList.add("open"); };
  const close = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("open"); };
  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
}

/* ── Search ── */
function initSearch() {
  document.getElementById("q")?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const v = e.target.value.trim();
      if (v) { lastLat = null; lastLon = null; loadWeatherData(v); }
    }
  });
  document.getElementById("searchBtn")?.addEventListener("click", () => {
    const v = document.getElementById("q")?.value.trim();
    if (v) { lastLat = null; lastLon = null; loadWeatherData(v); }
  });
}

/* ── Geocode ── */
async function fetchCoords(city) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const d = await r.json();
  if (!d.results?.length) throw new Error("City not found");
  return d.results[0];
}

/* ── Ring ── */
function setRing(ringId, textId, badgeId, pct, displayText) {
  const ring  = document.getElementById(ringId);
  const text  = document.getElementById(textId);
  const badge = document.getElementById(badgeId);
  const clamped = Math.min(100, Math.max(0, pct));
  if (ring)  ring.setAttribute("stroke-dasharray", `${clamped.toFixed(1)}, 100`);
  if (text)  text.textContent = displayText;
  if (badge) {
    badge.textContent = pct < 30 ? "Low" : pct < 65 ? "Medium" : "High";
  }
}

/* ── Chart ── */
function renderChart(temps) {
  const ctx = document.getElementById("tempChart");
  if (!ctx) return;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Morning", "Afternoon", "Evening", "Night"],
      datasets: [{
        data: temps,
        borderColor: "#8986EA",
        backgroundColor: "rgba(137,134,234,0.18)",
        borderWidth: 2.5,
        tension: 0.45,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#8986EA",
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(30,32,53,0.95)",
          titleColor: "#fff",
          bodyColor: "#9799BA",
          borderColor: "rgba(108,99,255,0.4)",
          borderWidth: 1,
          padding: 10,
          callbacks: { label: c => `  ${c.parsed.y}${unitLabel()}` }
        }
      },
      scales: {
        x: { display: false },
        y: { display: false, min: min - 3, max: max + 3 }
      },
      layout: { padding: { top: 8, bottom: 4, left: 4, right: 4 } }
    }
  });
}

/* ── Main Data Load ── */
async function loadWeatherData(cityName = currentCity, lat = null, lon = null) {
  setLoading(true);
  try {
    let resolvedLat = lat, resolvedLon = lon, name = cityName;

    if (resolvedLat === null || resolvedLon === null) {
      const geo = await fetchCoords(cityName);
      resolvedLat = geo.latitude;
      resolvedLon = geo.longitude;
      const cc  = geo.country_code ? `, ${geo.country_code.toUpperCase()}` : "";
      name = `${geo.name}${cc}`;
      currentCity = geo.name;
      localStorage.setItem("lastCity", currentCity);
      // update search input
      const qInput = document.getElementById("q");
      if (qInput && qInput !== document.activeElement) qInput.value = geo.name;
    }

    // Save coords for unit/lang refresh
    lastLat = resolvedLat;
    lastLon = resolvedLon;

    // Update header location
    const hLoc = document.getElementById("headerLocation");
    if (hLoc) hLoc.textContent = name;

    // Build URL (always fetch Celsius — convert on display)
    const url = [
      `https://api.open-meteo.com/v1/forecast`,
      `?latitude=${resolvedLat}&longitude=${resolvedLon}`,
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m`,
      `,weather_code,wind_speed_10m,surface_pressure,is_day,cloud_cover`,
      `&hourly=temperature_2m,weather_code,is_day,precipitation_probability`,
      `&daily=weather_code,temperature_2m_max,temperature_2m_min`,
      `,uv_index_max,precipitation_probability_max`,
      `&temperature_unit=celsius&timezone=auto&forecast_days=7`
    ].join("");

    const res  = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    const cur  = data.current;
    const hrly = data.hourly;
    const day  = data.daily;

    const ul = unitLabel();

    /* ── 1. Hero card ── */
    document.getElementById("currentEmoji").textContent  = getIcon(cur.weather_code, cur.is_day);
    document.getElementById("currentTemp").textContent   = `${toDisplay(cur.temperature_2m)}${ul}`;
    document.getElementById("cityName").textContent      = name;
    document.getElementById("feelsLikeVal").textContent  = `${toDisplay(cur.apparent_temperature)}${ul}`;
    document.getElementById("detailPressure").textContent = cur.surface_pressure ? `${Math.round(cur.surface_pressure)} hPa` : "-- hPa";
    document.getElementById("detailHumidity").textContent = `${cur.relative_humidity_2m}%`;
    document.getElementById("detailWind").textContent     = `${Math.round(cur.wind_speed_10m)} km/h`;

    /* ── 2. Chart (6am, 12pm, 6pm, 11pm) ── */
    const t6  = toDisplay(hrly.temperature_2m[6]);
    const t12 = toDisplay(hrly.temperature_2m[12]);
    const t18 = toDisplay(hrly.temperature_2m[18]);
    const t23 = toDisplay(hrly.temperature_2m[23]);
    document.getElementById("tMorn").textContent  = `${t6}${ul}`;
    document.getElementById("tAft").textContent   = `${t12}${ul}`;
    document.getElementById("tEve").textContent   = `${t18}${ul}`;
    document.getElementById("tNight").textContent = `${t23}${ul}`;
    renderChart([t6, t12, t18, t23]);

    /* ── 3. Metric rings ── */
    document.getElementById("windVal").textContent = `${Math.round(cur.wind_speed_10m)} km/h`;

    const rainPct = day.precipitation_probability_max?.[0] ?? 0;
    setRing("rainRing", "rainPctText", "rainBadge", rainPct, `+${rainPct}%`);

    const uv    = day.uv_index_max?.[0] ?? 0;
    const uvPct = Math.min(100, (uv / 11) * 100);
    setRing("uvRing", "uvPctText", "uvBadge", uvPct, `+${Math.round(uv)}`);

    const cloud = cur.cloud_cover ?? 0;
    setRing("cloudRing", "cloudPctText", "cloudBadge", cloud, `${cloud}%`);

    /* ── 4. Hourly ── */
    const nowHour = new Date().getHours();
    const hourlyEl = document.getElementById("hourly");
    if (hourlyEl) {
      hourlyEl.innerHTML = hrly.time.slice(nowHour, nowHour + 8).map((ts, i) => {
        const idx  = nowHour + i;
        const h    = new Date(ts).getHours();
        const ampm = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h-12}pm`;
        const label = i === 0 ? "Now" : ampm;
        const temp  = toDisplay(hrly.temperature_2m[idx]);
        const icon  = getIcon(hrly.weather_code[idx], hrly.is_day[idx]);
        return `<div class="h-card ${i===0?"active":""}">
          <span class="h-time">${label}</span>
          <span class="h-icon">${icon}</span>
          <span class="h-temp">${temp}${ul}</span>
        </div>`;
      }).join("");
    }

    /* ── 5. Daily ── */
    const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dailyEl = document.getElementById("daily");
    if (dailyEl) {
      dailyEl.innerHTML = day.time.map((ds, i) => {
        const dt   = new Date(ds + "T12:00:00");
        let dname  = currentLang === "hi"
          ? ["रवि","सोम","मंगल","बुध","गुरु","शुक्र","शनि"][dt.getDay()]
          : DAYS[dt.getDay()];
        if (i === 0) dname = currentLang === "hi" ? "आज" : "Today";
        else if (i === 1) dname = currentLang === "hi" ? "कल" : "Tomorrow";
        const dateLabel = dt.toLocaleDateString("en-GB", { day:"numeric", month:"short" });
        const avg  = toDisplay((day.temperature_2m_max[i] + day.temperature_2m_min[i]) / 2);
        const icon = getIcon(day.weather_code[i], 1);
        return `<div class="d-row">
          <div class="d-left">
            <span class="d-name">${dname}</span>
            <span class="d-date">${dateLabel}</span>
          </div>
          <span class="d-temp">${avg}${ul}</span>
          <span class="d-icon">${icon}</span>
        </div>`;
      }).join("");
    }

  } catch (err) {
    console.error("WeatherNow:", err);
    showToast(`❌ ${err.message || "Failed to fetch weather"}`);
  } finally {
    setLoading(false);
  }
}

/* ── Init all interactive features ── */
initSidebar();
initSettings();
initUnitToggle();
initGeolocation();
initSearch();

/* ── Bootstrap ── */
loadWeatherData();
