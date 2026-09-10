import { calendarCells, threeHoursLater, weatherDisplay } from "./dashboard.js";

const NEWS_URL = "news.json";
const NEWS_REFRESH_MS = 5 * 60 * 1000;
const CACHE_KEY = "echoshow-news-v1";
const WEATHER_CACHE_KEY = "echoshow-weather-v1";
const WEATHER_REFRESH_MS = 30 * 60 * 1000;
const DEFAULT_LOCATION = { latitude: 35.681236, longitude: 139.767125, label: "東京" };

const dateElement = document.querySelector("#date");
const timeElement = document.querySelector("#time");
const tickerElement = document.querySelector("#ticker");
const calendarTitleElement = document.querySelector("#calendar-title");
const calendarDaysElement = document.querySelector("#calendar-days");
const weatherPlaceElement = document.querySelector("#weather-place");
const weatherNowIconElement = document.querySelector("#weather-now-icon");
const weatherNowSummaryElement = document.querySelector("#weather-now-summary");
const weatherNowTempElement = document.querySelector("#weather-now-temp");
const weatherLaterIconElement = document.querySelector("#weather-later-icon");
const weatherLaterSummaryElement = document.querySelector("#weather-later-summary");
const weatherLaterTempElement = document.querySelector("#weather-later-temp");

let newsItems = [];
let renderedCalendarKey = "";
let weatherLocation;

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric", month: "long", day: "numeric", weekday: "short"
});
const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});

function updateClock() {
  const now = new Date();
  dateElement.textContent = dateFormatter.format(now);
  timeElement.dateTime = now.toISOString();
  timeElement.textContent = timeFormatter.format(now);
  renderCalendar(now);
}

function renderCalendar(now) {
  const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (key === renderedCalendarKey) return;
  renderedCalendarKey = key;
  calendarTitleElement.textContent = `${now.getFullYear()}年 ${now.getMonth() + 1}月`;
  calendarDaysElement.replaceChildren(...calendarCells(now).map((cell) => {
    const day = document.createElement("span");
    day.className = "calendar-day";
    day.textContent = cell.day;
    if (cell.outside) day.classList.add("is-outside");
    if (cell.weekday === 0) day.classList.add("is-sunday");
    if (cell.weekday === 6) day.classList.add("is-saturday");
    if (cell.today) {
      day.classList.add("is-today");
      day.setAttribute("aria-current", "date");
      day.setAttribute("aria-label", `今日 ${cell.day}日`);
    } else {
      day.setAttribute("aria-hidden", "true");
    }
    return day;
  }));
}

function roundTemperature(value) {
  return `${Math.round(Number(value))}°`;
}

function showWeather(payload, label) {
  const current = payload?.current;
  const later = threeHoursLater(payload);
  if (!current || !Number.isFinite(Number(current.temperature_2m)) || !later) return false;

  const nowDisplay = weatherDisplay(Number(current.weather_code), Boolean(current.is_day));
  const laterDisplay = weatherDisplay(later.code, later.isDay);
  weatherPlaceElement.textContent = label;
  weatherNowIconElement.textContent = nowDisplay.icon;
  weatherNowSummaryElement.textContent = nowDisplay.summary;
  weatherNowTempElement.textContent = roundTemperature(current.temperature_2m);
  weatherLaterIconElement.textContent = laterDisplay.icon;
  weatherLaterSummaryElement.textContent = laterDisplay.summary;
  weatherLaterTempElement.textContent = roundTemperature(later.temperature);
  return true;
}

function loadCachedWeather() {
  try { return JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)); } catch { return null; }
}

function saveWeather(payload, label) {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ payload, label }));
  } catch { /* storage is optional */ }
}

function getLocation() {
  if (!navigator.geolocation) return Promise.resolve(DEFAULT_LOCATION);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, label: "現在地" }),
      () => resolve(DEFAULT_LOCATION),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

async function refreshWeather() {
  try {
    weatherLocation ??= await getLocation();
    const params = new URLSearchParams({
      latitude: weatherLocation.latitude,
      longitude: weatherLocation.longitude,
      current: "temperature_2m,weather_code,is_day",
      hourly: "temperature_2m,weather_code,is_day",
      forecast_days: "2",
      timeformat: "unixtime",
      timezone: "auto"
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`weather API returned ${response.status}`);
    const payload = await response.json();
    if (!showWeather(payload, weatherLocation.label)) throw new Error("weather API returned unusable data");
    saveWeather(payload, weatherLocation.label);
  } catch (error) {
    const cached = loadCachedWeather();
    if (!showWeather(cached?.payload, cached?.label ?? "直近の天気")) {
      weatherPlaceElement.textContent = "天気を取得できません";
    }
    console.warn("Could not refresh weather", error);
  }
}

function validItems(payload) {
  if (!payload || !Array.isArray(payload.items)) return [];
  return payload.items.filter((item) =>
    item && typeof item.title === "string" && item.title.trim() &&
    typeof item.url === "string" && /^https?:\/\//.test(item.url)
  );
}

function saveNews(payload) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch { /* storage is optional */ }
}

function loadCachedNews() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}

function createTickerGroup(items, hidden = false) {
  const group = document.createElement("div");
  group.className = "ticker-group";
  if (hidden) group.setAttribute("aria-hidden", "true");

  for (const item of items) {
    const link = document.createElement("a");
    link.className = "ticker-item";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.title;
    if (hidden) link.tabIndex = -1;
    group.append(link);
  }
  return group;
}

function showNews() {
  tickerElement.classList.remove("is-moving");
  void tickerElement.offsetWidth;

  if (!newsItems.length) {
    tickerElement.textContent = "ニュースを取得できません";
    return;
  }

  tickerElement.replaceChildren(
    createTickerGroup(newsItems),
    createTickerGroup(newsItems, true)
  );
  const characters = newsItems.reduce((total, item) => total + item.title.length, 0);
  const duration = Math.max(35, Math.min(120, characters * 0.42));
  tickerElement.style.setProperty("--ticker-duration", `${duration}s`);
  tickerElement.classList.add("is-moving");
}

async function refreshNews() {
  try {
    const response = await fetch(`${NEWS_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`news.json returned ${response.status}`);
    const payload = await response.json();
    const items = validItems(payload);
    if (items.length === 0) throw new Error("news.json contains no usable items");
    newsItems = items;
    saveNews(payload);
  } catch (error) {
    const cached = validItems(loadCachedNews());
    if (cached.length) {
      newsItems = cached;
    } else {
      newsItems = [];
    }
    console.warn("Could not refresh news", error);
  }
  showNews();
}

updateClock();
setInterval(updateClock, 1000);
await Promise.all([refreshNews(), refreshWeather()]);
setInterval(refreshNews, NEWS_REFRESH_MS);
setInterval(refreshWeather, WEATHER_REFRESH_MS);
