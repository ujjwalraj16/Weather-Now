/* ─────────────────────────────────────────────
   WeatherNow — app.js (Purple Dashboard)
───────────────────────────────────────────── */
"use strict";

let currentCity   = localStorage.getItem("lastCity") || "New York";
let chartInstance = null;

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

/* ── Sidebar mobile toggle ── */
function initSidebar() {
  const sidebar  = document.getElementById("sidebar");
  const overlay  = document.getElementById("sidebarOverlay");
  const openBtn  = document.getElementById("mobileMenuBtn");
  const closeBtn = document.getElementById("sidebarClose");

  function openSidebar()  { sidebar?.classList.add("open"); overlay?.classList.add("open"); }
  function closeSidebar() { sidebar?.classList.remove("open"); overlay?.classList.remove("open"); }

  openBtn?.addEventListener("click",  openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click",  closeSidebar);
}
initSidebar();

/* ── Search ── */
document.getElementById("q")?.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.value.trim()) loadWeatherData(e.target.value.trim());
});
document.getElementById("searchBtn")?.addEventListener("click", () => {
  const v = document.getElementById("q")?.value.trim();
  if (v) loadWeatherData(v);
});

/* ── Geocode ── */
async function fetchCoords(city) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const d = await r.json();
  if (!d.results?.length) throw new Error("City not found");
  return d.results[0];
}

/* ── Ring updater ── */
function setRing(ringId, textId, badgeId, pct, displayText) {
  const ring  = document.getElementById(ringId);
  const text  = document.getElementById(textId);
  const badge = document.getElementById(badgeId);
  const clamped = Math.min(100, Math.max(0, pct));
  if (ring)  ring.setAttribute("stroke-dasharray", `${clamped.toFixed(1)}, 100`);
  if (text)  text.textContent = displayText;
  if (badge) {
    if (pct < 30)       badge.textContent = "Low";
    else if (pct < 65)  badge.textContent = "Medium";
    else                badge.textContent = "High";
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
        backgroundColor: "rgba(137, 134, 234, 0.18)",
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
      animation: { duration: 700 },
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: "rgba(30,32,53,0.95)",
        titleColor: "#fff",
        bodyColor: "#9799BA",
        borderColor: "rgba(108,99,255,0.4)",
        borderWidth: 1,
        padding: 10,
        callbacks: { label: ctx => `  ${ctx.parsed.y}° C` }
      }},
      scales: {
        x: { display: false },
        y: { display: false, min: min - 3, max: max + 3 }
      },
      layout: { padding: { top: 8, bottom: 4, left: 4, right: 4 } }
    }
  });
}

/* ── Main loader ── */
async function loadWeatherData(cityName = currentCity) {
  try {
    const geo = await fetchCoords(cityName);
    const lat = geo.latitude;
    const lon = geo.longitude;
    const cc  = geo.country_code ? `, ${geo.country_code.toUpperCase()}` : "";
    const name = `${geo.name}${cc}`;
    currentCity = geo.name;
    localStorage.setItem("lastCity", currentCity);

    /* Update location labels */
    ["headerLocation"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = name;
    });

    /* Build API URL */
    const url = [
      `https://api.open-meteo.com/v1/forecast`,
      `?latitude=${lat}&longitude=${lon}`,
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m`,
      `,weather_code,wind_speed_10m,surface_pressure,is_day,cloud_cover`,
      `&hourly=temperature_2m,weather_code,is_day,precipitation_probability`,
      `&daily=weather_code,temperature_2m_max,temperature_2m_min`,
      `,uv_index_max,precipitation_probability_max`,
      `&temperature_unit=celsius&timezone=auto&forecast_days=7`
    ].join("");

    const res  = await fetch(url);
    const data = await res.json();
    const cur  = data.current;
    const hrly = data.hourly;
    const day  = data.daily;

    /* ── 1. Hero card ── */
    const tempRounded = Math.round(cur.temperature_2m);
    const feelsRounded = Math.round(cur.apparent_temperature);
    document.getElementById("currentEmoji").textContent = getIcon(cur.weather_code, cur.is_day);
    document.getElementById("currentTemp").textContent  = `${tempRounded}° C`;
    document.getElementById("cityName").textContent     = name;
    document.getElementById("feelsLikeVal").textContent = `${feelsRounded}° C`;
    document.getElementById("detailPressure").textContent = cur.surface_pressure ? `${Math.round(cur.surface_pressure)} hPa` : "-- hPa";
    document.getElementById("detailHumidity").textContent = `${cur.relative_humidity_2m}%`;
    document.getElementById("detailWind").textContent     = `${Math.round(cur.wind_speed_10m)} km/h`;

    /* ── 2. Temperature chart data (6am, 12pm, 6pm, 11pm) ── */
    const t6  = Math.round(hrly.temperature_2m[6]);
    const t12 = Math.round(hrly.temperature_2m[12]);
    const t18 = Math.round(hrly.temperature_2m[18]);
    const t23 = Math.round(hrly.temperature_2m[23]);
    document.getElementById("tMorn").textContent  = `${t6}° C`;
    document.getElementById("tAft").textContent   = `${t12}° C`;
    document.getElementById("tEve").textContent   = `${t18}° C`;
    document.getElementById("tNight").textContent = `${t23}° C`;
    renderChart([t6, t12, t18, t23]);

    /* ── 3. Metric rings ── */
    // Wind (no ring – just value)
    document.getElementById("windVal").textContent = `${Math.round(cur.wind_speed_10m)} km/h`;

    // Rain chance
    const rainPct = day.precipitation_probability_max?.[0] ?? 0;
    setRing("rainRing", "rainPctText", "rainBadge", rainPct, `+${rainPct}%`);

    // UV index (0–11 scale → 0–100%)
    const uv = day.uv_index_max?.[0] ?? 0;
    const uvPct = Math.min(100, (uv / 11) * 100);
    setRing("uvRing", "uvPctText", "uvBadge", uvPct, `+${Math.round(uv)}`);

    // Cloud cover
    const cloud = cur.cloud_cover ?? 0;
    setRing("cloudRing", "cloudPctText", "cloudBadge", cloud, `${cloud}%`);

    /* ── 4. Hourly row ── */
    const nowHour = new Date().getHours();
    const hourlyEl = document.getElementById("hourly");
    if (hourlyEl) {
      hourlyEl.innerHTML = hrly.time.slice(nowHour, nowHour + 8).map((ts, i) => {
        const idx  = nowHour + i;
        const d    = new Date(ts);
        const h    = d.getHours();
        const ampm = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
        const label = i === 0 ? "Now" : ampm;
        const temp = Math.round(hrly.temperature_2m[idx]);
        const icon = getIcon(hrly.weather_code[idx], hrly.is_day[idx]);
        const active = i === 0 ? "active" : "";
        return `
          <div class="h-card ${active}">
            <span class="h-time">${label}</span>
            <span class="h-icon">${icon}</span>
            <span class="h-temp">${temp}° C</span>
          </div>`;
      }).join("");
    }

    /* ── 5. Daily list ── */
    const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dailyEl = document.getElementById("daily");
    if (dailyEl) {
      dailyEl.innerHTML = day.time.map((ds, i) => {
        const dt   = new Date(ds + "T12:00:00");
        let dname  = DAYS[dt.getDay()];
        if (i === 0) dname = "Today";
        else if (i === 1) dname = "Tomorrow";
        const dateLabel = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        const avg  = Math.round((day.temperature_2m_max[i] + day.temperature_2m_min[i]) / 2);
        const icon = getIcon(day.weather_code[i], 1);
        return `
          <div class="d-row">
            <div class="d-left">
              <span class="d-name">${dname}</span>
              <span class="d-date">${dateLabel}</span>
            </div>
            <span class="d-temp">${avg}° C</span>
            <span class="d-icon">${icon}</span>
          </div>`;
      }).join("");
    }

  } catch (err) {
    console.error("WeatherNow:", err);
  }
}

/* Init */
loadWeatherData();
