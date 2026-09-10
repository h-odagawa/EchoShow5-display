const NEWS_URL = "news.json";
const NEWS_REFRESH_MS = 5 * 60 * 1000;
const NEWS_ROTATE_MS = 16 * 1000;
const CACHE_KEY = "echoshow-news-v1";

const dateElement = document.querySelector("#date");
const timeElement = document.querySelector("#time");
const tickerElement = document.querySelector("#ticker");

let newsItems = [];
let newsIndex = 0;
let rotateTimer;

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

function showNews() {
  clearTimeout(rotateTimer);
  const item = newsItems[newsIndex];
  tickerElement.classList.remove("is-moving");
  void tickerElement.offsetWidth;

  if (!item) {
    tickerElement.removeAttribute("href");
    tickerElement.textContent = "ニュースを取得できません";
    return;
  }

  tickerElement.href = item.url;
  tickerElement.textContent = item.title;
  const duration = Math.max(12, Math.min(35, item.title.length * 0.38));
  tickerElement.style.setProperty("--ticker-duration", `${duration}s`);
  tickerElement.classList.add("is-moving");

  rotateTimer = setTimeout(() => {
    if (newsItems.length > 1) newsIndex = (newsIndex + 1) % newsItems.length;
    showNews();
  }, Math.max(NEWS_ROTATE_MS, duration * 1000));
}

async function refreshNews() {
  try {
    const response = await fetch(`${NEWS_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`news.json returned ${response.status}`);
    const payload = await response.json();
    const items = validItems(payload);
    if (items.length === 0) throw new Error("news.json contains no usable items");
    newsItems = items;
    newsIndex %= newsItems.length;
    saveNews(payload);
  } catch (error) {
    const cached = validItems(loadCachedNews());
    if (cached.length) {
      newsItems = cached;
      newsIndex %= newsItems.length;
    } else {
      newsItems = [];
    }
    console.warn("Could not refresh news", error);
  }
  showNews();
}

updateClock();
setInterval(updateClock, 1000);
await refreshNews();
setInterval(refreshNews, NEWS_REFRESH_MS);
