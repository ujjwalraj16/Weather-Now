/* ─────────────────────────────────────────────
   WeatherNow — app.js
   Full application logic
   NEW: Rain probability · Feels Like · Wind Direction
        Pressure & Visibility · What to Wear
        Share button · Auto-refresh (15 min)
───────────────────────────────────────────── */

"use strict";

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let currentCity  = localStorage.getItem("lastCity")      || "Patna";
let currentUnit  = localStorage.getItem("weatherUnit")   || "celsius";
let currentLang  = localStorage.getItem("weatherLang")   || "en";
let currentTheme = localStorage.getItem("weatherTheme")  || "light";
let favorites      = JSON.parse(localStorage.getItem("favCities")     || '["Patna"]');

// Auto-refresh state
const REFRESH_SECONDS = 15 * 60; // 15 minutes
let refreshTimer = null;
let countdownInterval = null;
let secondsLeft = REFRESH_SECONDS;

/* ══════════════════════════════════════════
   i18n STRINGS
══════════════════════════════════════════ */
const i18n = {
  en: {
    appName: "WeatherNow",
    searchPlaceholder: "Search city…",
    hourly: "Hourly (24h)",
    daily: "7-Day Forecast",
    aqi: "Air Quality",
    uvIndex: "UV Index",
    pollen: "Pollen",
    quickMetrics: "Conditions",
    sunrise: "Sunrise",
    sunset: "Sunset",
    wind: "Wind",
    humidity: "Humidity",
    pressure: "Pressure",
    visibility: "Visibility",
    feelsLike: "Feels like",
    whatToWear: "What to Wear",
    actions: "Actions",
    favorite: "Add to Favourites",
    unfavorite: "Favourited",
    shareWeather: "Share Weather",
    exportPdf: "Export as PDF",
    langLabel: "Language",
    unitLabel: "Units",
    footer: "Powered by Open-Meteo · auto-refreshes every 15 min",
    aqiCategories: { good: "Good", fair: "Fair", moderate: "Moderate", poor: "Poor", veryPoor: "Very Poor" },
    alerts: {
      thunderstorm: "⚡ Thunderstorm Warning — Seek indoor shelter.",
      heavyRain:    "🌧️ Heavy Rain Warning — Localised flooding possible.",
      heatwave:     "🔥 Heatwave Alert — Stay hydrated, avoid direct sun.",
      fog:          "🌫️ Dense Fog Advisory — Reduced driving visibility."
    },
    pollenLevels: { low: "Low", moderate: "Moderate", high: "High", veryHigh: "Very High" },
    days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    conditions: {
      0:"Clear", 1:"Mainly Clear", 2:"Partly Cloudy", 3:"Overcast",
      45:"Foggy", 48:"Rime Fog", 51:"Light Drizzle", 61:"Slight Rain",
      63:"Moderate Rain", 65:"Heavy Rain", 71:"Light Snow",
      95:"Thunderstorm", 96:"Thunderstorm + Hail", 99:"Heavy Thunderstorm"
    },
    compass: ["N","NE","E","SE","S","SW","W","NW"],
    toastShare: "✅ Copied to clipboard!",
    wear: {
      heavyCoat: "Heavy Coat", scarf: "Scarf", gloves: "Gloves",
      jacket: "Jacket", layers: "Layers", lightLayer: "Light Layer", jeans: "Jeans",
      tshirt: "T-Shirt", shorts: "Shorts", lightTop: "Light Top",
      umbrella: "Umbrella", rainShoes: "Shoes", windbreaker: "Windbreaker",
      sunglasses: "Sunglasses", sunscreen: "Sunscreen", torch: "Torch",
      cap: "Cap", water: "Water Bottle", mosquito: "Bug Repellent", reflective: "Reflective Gear"
    },
    wearTips: {
      freezing: "Bundle up! It's freezing outside.",
      cold: "Wear warm layers, it's quite cold.",
      mild: "Mild weather — a light layer should do.",
      warm: "Pleasant weather — dress light and comfortably.",
      hot: "It's hot! Stay cool with breathable fabrics.",
      rain: " Don't forget your umbrella!",
      uv: " High UV — apply sunscreen SPF 50+.",
      fog: " Reduced visibility — drive carefully."
    }
  },
  hi: {
    appName: "मौसम",
    searchPlaceholder: "शहर खोजें…",
    hourly: "प्रति घंटा पूर्वानुमान (24h)",
    daily: "7-दिवसीय पूर्वानुमान",
    aqi: "वायु गुणवत्ता",
    uvIndex: "यूवी इंडेक्स",
    pollen: "परागकण",
    quickMetrics: "मुख्य आंकड़े",
    sunrise: "सूर्योदय",
    sunset: "सूर्यास्त",
    wind: "हवा",
    humidity: "नमी",
    pressure: "दबाव",
    visibility: "दृश्यता",
    feelsLike: "महसूस होता है",
    whatToWear: "क्या पहनें",
    actions: "विकल्प",
    favorite: "पसंदीदा बनाएं",
    unfavorite: "पसंदीदा है ★",
    shareWeather: "मौसम शेयर करें",
    exportPdf: "PDF डाउनलोड करें",
    langLabel: "भाषा",
    unitLabel: "इकाई",
    footer: "Open-Meteo API द्वारा संचालित",
    aqiCategories: { good:"अच्छा", fair:"संतोषजनक", moderate:"मध्यम", poor:"खराब", veryPoor:"बहुत खराब" },
    alerts: {
      thunderstorm: "⚡ आंधी-तूफान की चेतावनी — सुरक्षित स्थान पर रहें।",
      heavyRain:    "🌧️ भारी बारिश की चेतावनी — जलभराव की संभावना।",
      heatwave:     "🔥 लू का अलर्ट — धूप से बचें और पानी पिएं।",
      fog:          "🌫️ घने कोहरे की चेतावनी — वाहन सावधानी से चलाएं।"
    },
    pollenLevels: { low:"कम", moderate:"मध्यम", high:"अधिक", veryHigh:"अत्यधिक" },
    days: ["रवि","सोम","मंगल","बुध","गुरु","शुक्र","शनि"],
    conditions: {
      0:"साफ़ आसमान", 1:"मुख्यतः साफ़", 2:"आंशिक बादल", 3:"घने बादल",
      45:"कोहरा", 48:"सफेद कोहरा", 51:"हल्की बूंदाबांदी", 61:"हल्की बारिश",
      63:"मध्यम बारिश", 65:"भारी बारिश", 71:"बर्फबारी",
      95:"गरज के साथ बारिश", 96:"ओलावृष्टि", 99:"भारी तूफान"
    },
    compass: ["उ","उ-पू","पू","द-पू","द","द-प","प","उ-प"],
    toastShare: "✅ क्लिपबोर्ड पर कॉपी किया गया!",
    wear: {
      heavyCoat: "भारी कोट", scarf: "मफ़लर", gloves: "दस्ताने",
      jacket: "जैकेट", layers: "गर्म कपड़े", lightLayer: "हल्के कपड़े", jeans: "जींस",
      tshirt: "टी-शर्ट", shorts: "शॉर्ट्स", lightTop: "हल्का टॉप",
      umbrella: "छाता", rainShoes: "जूते", windbreaker: "विंडब्रेकर",
      sunglasses: "धूप का चश्मा", sunscreen: "सनस्क्रीन", torch: "टॉर्च",
      cap: "टोपी", water: "पानी की बोतल", mosquito: "मच्छर भगाने वाला", reflective: "चमकदार कपड़े"
    },
    wearTips: {
      freezing: "अच्छे से कपड़े पहनें! बाहर बहुत ठंड है।",
      cold: "गर्म कपड़े पहनें, काफी ठंड है।",
      mild: "मौसम सुहावना है — हल्के कपड़े पहनें।",
      warm: "सुहावना मौसम — हल्के और आरामदायक कपड़े पहनें।",
      hot: "बहुत गर्मी है! हवादार कपड़े पहनें।",
      rain: " अपना छाता न भूलें!",
      uv: " तेज़ धूप — सनस्क्रीन SPF 50+ लगाएं।",
      fog: " कम दृश्यता — वाहन सावधानी से चलाएं।"
    }
  }
};

const weatherIcons = {
  0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️",
  45:"🌫️", 48:"🌫️", 51:"🌦️", 61:"🌧️",
  63:"🌧️", 65:"🌧️", 71:"🌨️",
  95:"⛈️", 96:"⛈️", 99:"⛈️"
};

const weatherIconsNight = {
  0:"🌙", 1:"🌙", 2:"☁️", 3:"☁️",
  45:"🌫️", 48:"🌫️", 51:"🌦️", 61:"🌧️",
  63:"🌧️", 65:"🌧️", 71:"🌨️",
  95:"⛈️", 96:"⛈️", 99:"⛈️"
};

function getIcon(code, isDay = 1) {
  if (isDay === 0) return weatherIconsNight[code] || "🌙";
  return weatherIcons[code] || "☀️";
}

/* ══════════════════════════════════════════
   THEME
══════════════════════════════════════════ */
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("weatherTheme", theme);
}

function toggleTheme() {
  applyTheme(currentTheme === "light" ? "dark" : "light");
}

/* ══════════════════════════════════════════
   i18n TEXT UPDATE
══════════════════════════════════════════ */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setAttr(id, attr, val) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, val);
}

function updateStaticText() {
  const t = i18n[currentLang];
  setText("txtAppName",    t.appName);
  setAttr("q", "placeholder", t.searchPlaceholder);
  setText("txtHourly",     t.hourly);
  setText("txtDaily",      t.daily);
  setText("txtAqi",        t.aqi);
  setText("lblUv",         t.uvIndex);
  setText("lblPollen",     t.pollen);
  setText("txtMetrics",    t.quickMetrics);
  setText("txtSunrise",    t.sunrise);
  setText("txtSunset",     t.sunset);
  setText("txtWind",       t.wind);
  setText("txtHumidity",   t.humidity);
  setText("txtPressure",   t.pressure);
  setText("txtVisibility", t.visibility);
  setText("feelsLikeLabel",t.feelsLike);
  setText("txtWear",       t.whatToWear);
  setText("lblLang",       t.langLabel);
  setText("lblUnit",       t.unitLabel);
  setText("exportPdfTxt",  t.exportPdf);
  setText("txtFooter",     t.footer);
  setText("shareBtnTxt",   t.shareWeather);
  setText("shareToast",    t.toastShare);
  updateFavUI();
}

/* ══════════════════════════════════════════
   AQI HELPER
══════════════════════════════════════════ */
function getAqiMeta(aqi) {
  const c = i18n[currentLang].aqiCategories;
  if (aqi <= 20)  return { label: c.good,     color: "#22c55e", pct: 20  };
  if (aqi <= 40)  return { label: c.fair,     color: "#84cc16", pct: 40  };
  if (aqi <= 60)  return { label: c.moderate, color: "#eab308", pct: 60  };
  if (aqi <= 80)  return { label: c.poor,     color: "#f97316", pct: 80  };
  return           { label: c.veryPoor,  color: "#ef4444", pct: 100 };
}

/* ══════════════════════════════════════════
   WIND DIRECTION  (degrees → compass + arrow)
══════════════════════════════════════════ */
function degreesToCompass(deg) {
  const dirs = i18n[currentLang].compass;
  return dirs[Math.round(deg / 45) % 8];
}

// The arrow starts pointing UP (North = 0°), rotates clockwise
function windArrowStyle(deg) {
  // meteorological: wind FROM direction; arrow should point the way wind is going
  return `transform: rotate(${deg}deg); display:inline-block;`;
}

/* ══════════════════════════════════════════
   WHAT TO WEAR  (returns array of {emoji, label})
══════════════════════════════════════════ */
function getWhatToWear({ tempC, rainPct, windKph, uvMax, weatherCode, isDay }) {
  const items = [];
  let tip = "";
  const w = i18n[currentLang].wear;
  const tips = i18n[currentLang].wearTips;

  // Temperature-based clothing
  if (tempC <= 5) {
    items.push({ emoji: "🧥", label: w.heavyCoat });
    items.push({ emoji: "🧣", label: w.scarf });
    items.push({ emoji: "🧤", label: w.gloves });
    tip = tips.freezing;
  } else if (tempC <= 12) {
    items.push({ emoji: "🧥", label: w.jacket });
    items.push({ emoji: "👕", label: w.layers });
    tip = tips.cold;
  } else if (tempC <= 20) {
    items.push({ emoji: "👔", label: w.lightLayer });
    items.push({ emoji: "👖", label: w.jeans });
    tip = tips.mild;
  } else if (tempC <= 28) {
    items.push({ emoji: "👕", label: w.tshirt });
    items.push({ emoji: "🩳", label: w.shorts });
    tip = tips.warm;
  } else {
    items.push({ emoji: "👕", label: w.lightTop });
    items.push({ emoji: "🩳", label: w.shorts });
    tip = tips.hot;
  }

  // Rain / wet weather
  if (rainPct >= 50 || [61,63,65,80,81,82,95,96,99].includes(weatherCode)) {
    items.push({ emoji: "☂️", label: w.umbrella });
    items.push({ emoji: "👟", label: w.rainShoes });
    tip += tips.rain;
  }

  // Strong wind
  if (windKph >= 30) {
    items.push({ emoji: "🧣", label: w.windbreaker });
  }

  // Day-specific items
  if (isDay !== 0) {
    if (uvMax >= 5) {
      items.push({ emoji: "🧢", label: w.cap });
    }
    if (uvMax >= 6) {
      items.push({ emoji: "🕶️", label: w.sunglasses });
    }
    if (uvMax >= 8) {
      items.push({ emoji: "🧴", label: w.sunscreen });
      tip += tips.uv;
    }
    if (tempC >= 28) {
      items.push({ emoji: "💧", label: w.water });
    }
  } else {
    // Night-specific items
    if (tempC >= 15 && rainPct < 50) {
      items.push({ emoji: "🦟", label: w.mosquito });
    }
    items.push({ emoji: "🦺", label: w.reflective });
  }

  // Fog / Low visibility
  if ([45,48].includes(weatherCode)) {
    items.push({ emoji: "🔦", label: w.torch });
    tip += tips.fog;
  }

  return { items: items.slice(0, 6), tip: tip.trim() };
}

/* ══════════════════════════════════════════
   FAVOURITES BAR
══════════════════════════════════════════ */
function renderChips() {
  const box = document.getElementById("recentChips");
  if (!box) return;
  
  if (favorites.length === 0) {
    box.innerHTML = ``;
    return;
  }
  
  box.innerHTML = favorites
    .map(city => `<button class="chip" onclick="searchCity('${city}')">★ ${city}</button>`)
    .join("");
}

/* ══════════════════════════════════════════
   FAVOURITE BUTTON
══════════════════════════════════════════ */
function updateFavUI() {
  const btn       = document.getElementById("favBtn");
  const txtEl     = document.getElementById("favBtnTxt");
  const iconFull  = document.getElementById("favIconFilled");
  const iconEmpty = document.getElementById("favIconEmpty");
  if (!btn) return;

  const isFav = favorites.includes(currentCity);
  const t     = i18n[currentLang];
  if (txtEl)     txtEl.textContent         = isFav ? t.unfavorite : t.favorite;
  if (iconFull)  iconFull.style.display    = isFav ? "inline" : "none";
  if (iconEmpty) iconEmpty.style.display   = isFav ? "none"   : "inline";
  btn.classList.toggle("active", isFav);
  btn.setAttribute("aria-pressed", String(isFav));
}

/* ══════════════════════════════════════════
   LOADING STATE
══════════════════════════════════════════ */
function setLoading(on) {
  const overlay = document.getElementById("loadingOverlay");
  const grid    = document.getElementById("mainGrid");
  if (overlay) overlay.classList.toggle("active", on);
  if (grid)    grid.style.opacity = on ? "0.4" : "1";
}

/* ══════════════════════════════════════════
   AUTO-REFRESH  (15 min countdown)
══════════════════════════════════════════ */
function startAutoRefresh() {
  if (refreshTimer)    clearTimeout(refreshTimer);
  if (countdownInterval) clearInterval(countdownInterval);

  secondsLeft = REFRESH_SECONDS;

  // Update countdown every second
  countdownInterval = setInterval(() => {
    secondsLeft--;
    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const secs = String(secondsLeft % 60).padStart(2, "0");
    setText("refreshCountdown", `${mins}:${secs}`);

    // Animate progress bar shrinking
    const progress = document.getElementById("refreshProgress");
    if (progress) {
      progress.style.transform = `scaleX(${secondsLeft / REFRESH_SECONDS})`;
    }

    if (secondsLeft <= 0) clearInterval(countdownInterval);
  }, 1000);

  // Fire refresh after full 15 min
  refreshTimer = setTimeout(() => {
    loadWeatherData(currentCity);
  }, REFRESH_SECONDS * 1000);
}

/* ══════════════════════════════════════════
   SHARE BUTTON  (Web Share API → clipboard)
══════════════════════════════════════════ */
function shareWeather(tempText, cond, city) {
  const text = `🌤 Weather in ${city}: ${tempText}, ${cond}\nCheck it out on WeatherNow!`;

  if (navigator.share) {
    navigator.share({ title: "WeatherNow", text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.getElementById("shareToast");
      if (!toast) return;
      toast.classList.add("visible");
      setTimeout(() => toast.classList.remove("visible"), 2500);
    });
  }
}

/* ══════════════════════════════════════════
   SETTINGS MENU
══════════════════════════════════════════ */
function openSettings(open) {
  const menu = document.getElementById("settingsMenu");
  const btn  = document.getElementById("settingsBtn");
  if (!menu) return;
  if (open === undefined) open = !menu.classList.contains("active");
  menu.classList.toggle("active", open);
  menu.setAttribute("aria-hidden", String(!open));
  if (btn) btn.setAttribute("aria-expanded", String(open));
}

document.addEventListener("click", e => {
  const wrapper = document.getElementById("settingsWrapper");
  if (wrapper && !wrapper.contains(e.target)) openSettings(false);
});

/* ══════════════════════════════════════════
   GEO FETCH
══════════════════════════════════════════ */
async function fetchCoordinates(city) {
  const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const data = await res.json();
  if (!data.results?.length) throw new Error("City not found");
  return data.results[0];
}

/* ══════════════════════════════════════════
   MAIN DATA LOAD
══════════════════════════════════════════ */
async function loadWeatherData(cityName = currentCity, lat = null, lon = null, displayName = null) {
  setLoading(true);

  try {
    let latitude    = lat;
    let longitude   = lon;
    let resolvedName = displayName || cityName;

    if (!latitude || !longitude) {
      const geo    = await fetchCoordinates(cityName);
      latitude     = geo.latitude;
      longitude    = geo.longitude;
      const cc     = geo.country_code ? geo.country_code.toUpperCase() : "";
      resolvedName = cc ? `${geo.name}, ${cc}` : geo.name;
      currentCity  = geo.name;
    }

    localStorage.setItem("lastCity", currentCity);
    updateFavUI();

    const unitParam = currentUnit === "fahrenheit" ? "fahrenheit" : "celsius";

    // ── API calls — now include new fields ──────────────
    const weatherURL = [
      `https://api.open-meteo.com/v1/forecast`,
      `?latitude=${latitude}&longitude=${longitude}`,
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,`,
      `weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day`,
      `&hourly=temperature_2m,weather_code,precipitation_probability,is_day`,
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,`,
      `sunrise,sunset,uv_index_max,precipitation_probability_max`,
      `&temperature_unit=${unitParam}&timezone=auto&forecast_days=7`
    ].join("");

    const aqiURL = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm2_5,birch_pollen,grass_pollen`;

    // Visibility from wttr.in (Open-Meteo doesn't expose visibility in free tier)
    // We approximate: low AQI + fog code → low vis, otherwise show N/A safely
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(weatherURL).then(r => r.json()),
      fetch(aqiURL).then(r => r.json())
    ]);

    const cur   = weatherRes.current;
    const daily = weatherRes.daily;
    const hrly  = weatherRes.hourly;
    const t     = i18n[currentLang];

    // ── Alerts ─────────────────────────────────────────
    const alertBox = document.getElementById("alerts");
    if (alertBox) {
      alertBox.innerHTML = "";
      const code  = cur.weather_code;
      const tempC = cur.temperature_2m;
      const alerts = [];

      if ([95,96,99].includes(code))   alerts.push({ type: "danger",  msg: t.alerts.thunderstorm });
      else if ([65,82].includes(code)) alerts.push({ type: "warning", msg: t.alerts.heavyRain });
      else if ([45,48].includes(code)) alerts.push({ type: "warning", msg: t.alerts.fog });

      const isHeat = (currentUnit === "celsius" && tempC >= 40) || (currentUnit === "fahrenheit" && tempC >= 104);
      if (isHeat) alerts.push({ type: "danger", msg: t.alerts.heatwave });

      alerts.forEach(a => {
        const div = document.createElement("div");
        div.className = `alert-banner alert-${a.type}`;
        div.innerHTML = `<span>${a.msg}</span><button class="alert-dismiss" aria-label="Dismiss">✕</button>`;
        div.querySelector(".alert-dismiss").addEventListener("click", () => div.remove());
        alertBox.appendChild(div);
      });
    }

    // ── Current weather ────────────────────────────────
    const tempRounded   = Math.round(cur.temperature_2m);
    const condLabel     = t.conditions[cur.weather_code] || "Clear";

    setText("cityName",    resolvedName);
    setText("currentTemp", `${tempRounded}°`);
    setText("currentCond", condLabel);
    setText("currentEmoji", getIcon(cur.weather_code, cur.is_day));

    // NEW: Feels Like
    const feelsEl = document.getElementById("feelsRow");
    const feelsVal = document.getElementById("feelsLikeVal");
    const feelsLabel = document.getElementById("feelsLikeLabel");
    if (feelsEl && cur.apparent_temperature !== undefined) {
      feelsEl.style.display = "flex";
      if (feelsLabel) feelsLabel.textContent = t.feelsLike;
      if (feelsVal)   feelsVal.textContent   = `${Math.round(cur.apparent_temperature)}°`;
    }

    // Detail chips
    setText("detailHumidity", `${cur.relative_humidity_2m}%`);
    setText("detailTime",     new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

    // NEW: Wind direction arrow
    const windDir = cur.wind_direction_10m ?? 0;
    const windEl  = document.getElementById("windArrow");
    if (windEl) windEl.setAttribute("style", windArrowStyle(windDir));
    const compassLabel = degreesToCompass(windDir);
    setText("detailWind", `${Math.round(cur.wind_speed_10m)} km/h ${compassLabel}`);

    // ── Quick Metrics ──────────────────────────────────
    const srTime = daily.sunrise?.[0]?.split("T")[1]  ?? "--:--";
    const ssTime = daily.sunset?.[0]?.split("T")[1]   ?? "--:--";
    setText("sunrise",  srTime);
    setText("sunset",   ssTime);
    setText("wind",     `${Math.round(cur.wind_speed_10m)} km/h ${compassLabel}`);
    setText("humidity", `${cur.relative_humidity_2m}%`);

    // NEW: Pressure
    const pressureVal = cur.surface_pressure ? `${Math.round(cur.surface_pressure)} hPa` : "-- hPa";
    setText("pressure", pressureVal);

    // NEW: Visibility (estimated from fog/AQI)
    const code = cur.weather_code;
    let visText = "> 10 km";
    if ([45,48].includes(code)) visText = "< 1 km";
    else if ([51,61].includes(code)) visText = "4–7 km";
    else if ([63,65].includes(code)) visText = "1–4 km";
    setText("visibility", visText);

    // ── AQI ───────────────────────────────────────────
    const aqiVal  = aqiRes.current?.european_aqi ?? 30;
    const aqiMeta = getAqiMeta(aqiVal);
    setText("aqiVal",      String(aqiVal));
    setText("aqiCategory", aqiMeta.label);

    const aqiBar = document.getElementById("aqiBar");
    if (aqiBar) {
      aqiBar.style.width           = `${aqiMeta.pct}%`;
      aqiBar.style.backgroundColor = aqiMeta.color;
    }

    const aqiScore = document.getElementById("aqiVal");
    if (aqiScore) aqiScore.style.color = aqiMeta.color;

    const uvMax = daily.uv_index_max ? Math.round(daily.uv_index_max[0]) : 1;
    setText("uvIndexVal", String(uvMax));

    const grass  = aqiRes.current?.grass_pollen  ?? 0;
    const birch  = aqiRes.current?.birch_pollen  ?? 0;
    const pollen = Math.max(grass, birch);
    let pollenLabel = t.pollenLevels.low;
    if      (pollen > 80) pollenLabel = t.pollenLevels.veryHigh;
    else if (pollen > 40) pollenLabel = t.pollenLevels.high;
    else if (pollen > 15) pollenLabel = t.pollenLevels.moderate;
    setText("pollenVal", `${pollenLabel} (${Math.round(pollen)})`);

    // ── Hourly Forecast  (now includes rain probability) ──
    const hourlyEl = document.getElementById("hourly");
    if (hourlyEl) {
      const nowHour = new Date().getHours();
      hourlyEl.innerHTML = hrly.time.slice(nowHour, nowHour + 24).map((timeStr, idx) => {
        const label   = idx === 0 ? "Now" : timeStr.split("T")[1];
        const dataIdx = nowHour + idx;
        const temp    = Math.round(hrly.temperature_2m[dataIdx]);
        const icon    = getIcon(hrly.weather_code[dataIdx], hrly.is_day[dataIdx]);
        const rainPct = hrly.precipitation_probability?.[dataIdx] ?? 0;
        const rainClass = rainPct >= 20 ? "" : "dry";
        const rainHtml = `<span class="rain-prob ${rainClass}">💧${rainPct}%</span>`;
        return `
          <div class="hourly-item ${idx === 0 ? "now" : ""}">
            <span class="muted">${label}</span>
            <span class="h-icon">${icon}</span>
            <strong>${temp}°</strong>
            ${rainHtml}
          </div>`;
      }).join("");
    }

    // ── 7-Day Forecast  (now includes rain probability) ──
    const dailyEl = document.getElementById("daily");
    if (dailyEl) {
      dailyEl.innerHTML = daily.time.map((dateStr, idx) => {
        const d          = new Date(dateStr + "T12:00:00");
        const dayName    = t.days[d.getDay()];
        const icon       = getIcon(daily.weather_code[idx], 1);
        const cond       = t.conditions[daily.weather_code[idx]]  || "Clear";
        const hi         = Math.round(daily.temperature_2m_max[idx]);
        const lo         = Math.round(daily.temperature_2m_min[idx]);
        const rainPct    = daily.precipitation_probability_max?.[idx] ?? 0;
        const rainHtml   = rainPct >= 10
          ? `<span class="day-rain">💧${rainPct}%</span>`
          : `<span class="day-rain" style="opacity:0.35">💧${rainPct}%</span>`;
        return `
          <div class="daily-row">
            <span class="day-name">${dayName}</span>
            <span class="day-icon">${icon}</span>
            <span class="day-cond">${cond}</span>
            ${rainHtml}
            <span class="day-temps"><span class="day-high">${hi}°</span><span class="day-low"> / ${lo}°</span></span>
          </div>`;
      }).join("");
    }

    // ── What to Wear ─────────────────────────────────
    const wearGrid = document.getElementById("wearGrid");
    const wearTip  = document.getElementById("wearTip");
    if (wearGrid) {
      // Convert temp to Celsius for logic regardless of display unit
      let tempCelsius = cur.temperature_2m;
      if (currentUnit === "fahrenheit") tempCelsius = (cur.temperature_2m - 32) * 5/9;

      const nowHour2  = new Date().getHours();
      const rainPctNow = hrly.precipitation_probability?.[nowHour2] ?? 0;

      const { items, tip } = getWhatToWear({
        tempC:       tempCelsius,
        rainPct:     rainPctNow,
        windKph:     cur.wind_speed_10m,
        uvMax:       uvMax,
        weatherCode: cur.weather_code,
        isDay:       cur.is_day
      });

      wearGrid.innerHTML = items.map((item, i) => `
        <div class="wear-item" style="animation-delay:${i * 60}ms">
          <span class="wear-emoji">${item.emoji}</span>
          <span>${item.label}</span>
        </div>`).join("");

      if (wearTip) wearTip.textContent = tip;
    }

    // ── Wire share button data ─────────────────────────
    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.__shareData = { temp: `${tempRounded}°`, cond: condLabel, city: resolvedName };
    }

    // ── Restart auto-refresh ───────────────────────────
    startAutoRefresh();

  } catch (err) {
    console.error("WeatherNow:", err);
    const cond = document.getElementById("currentCond");
    if (cond) cond.textContent = currentLang === "hi" ? "स्थान नहीं मिला" : "Location not found";
  } finally {
    setLoading(false);
  }
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function searchCity(name) {
  const q = document.getElementById("q");
  if (q) q.value = name;
  loadWeatherData(name);
}

/* ══════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════ */

// Search on Enter
document.getElementById("q")?.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const val = e.target.value.trim();
    if (val) loadWeatherData(val);
  }
});

// Geolocation
document.getElementById("useLocation")?.addEventListener("click", () => {
  if (!navigator.geolocation) { alert("Geolocation not supported by your browser."); return; }
  navigator.geolocation.getCurrentPosition(
    pos => loadWeatherData(null, pos.coords.latitude, pos.coords.longitude,
      currentLang === "hi" ? "मेरा स्थान" : "My Location"),
    () => alert("Location permission denied.")
  );
});

// Theme toggle
document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);

// Settings
document.getElementById("settingsBtn")?.addEventListener("click", e => {
  e.stopPropagation();
  openSettings();
});

// Language
document.getElementById("lang")?.addEventListener("change", e => {
  currentLang = e.target.value;
  localStorage.setItem("weatherLang", currentLang);
  updateStaticText();
  loadWeatherData(currentCity);
});

// Units
document.getElementById("unit")?.addEventListener("change", e => {
  currentUnit = e.target.value;
  localStorage.setItem("weatherUnit", currentUnit);
  loadWeatherData(currentCity);
});

// Favourite
document.getElementById("favBtn")?.addEventListener("click", () => {
  if (favorites.includes(currentCity)) {
    favorites = favorites.filter(c => c !== currentCity);
  } else {
    favorites.push(currentCity);
  }
  localStorage.setItem("favCities", JSON.stringify(favorites));
  updateFavUI();
  renderChips();
});

// Share
document.getElementById("shareBtn")?.addEventListener("click", () => {
  const btn = document.getElementById("shareBtn");
  const d   = btn?.__shareData;
  if (d) shareWeather(d.temp, d.cond, d.city);
});

// Export PDF
document.getElementById("exportPdf")?.addEventListener("click", () => {
  openSettings(false);
  window.print();
});

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
(function init() {
  applyTheme(currentTheme);

  const langEl = document.getElementById("lang");
  const unitEl = document.getElementById("unit");
  if (langEl) langEl.value = currentLang;
  if (unitEl) unitEl.value = currentUnit;

  renderChips();
  updateStaticText();
  loadWeatherData(currentCity);
})();
