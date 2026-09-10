const NEWS_URL = "news.json";
const NEWS_REFRESH_MS = 5 * 60 * 1000;
const TICKER_PIXELS_PER_SECOND = 90;
const CACHE_KEY = "echoshow-news-v1";

const dateElement = document.querySelector("#date");
const timeElement = document.querySelector("#time");
const tickerElement = document.querySelector("#ticker");

let newsItems = [];
let newsIndex = 0;

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

function createTickerItem(item) {
  const link = document.createElement("a");
  link.className = "ticker-item";
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = item.title;
  return link;
}

function showNews() {
  tickerElement.classList.remove("is-moving");
  void tickerElement.offsetWidth;
  const item = newsItems[newsIndex];

  if (!item) {
    tickerElement.textContent = "ニュースを取得できません";
    return;
  }

  tickerElement.replaceChildren(createTickerItem(item));
  const windowWidth = tickerElement.parentElement.clientWidth;
  const tickerWidth = tickerElement.getBoundingClientRect().width;
  const duration = Math.max(8, Math.min(28, (windowWidth + tickerWidth) / TICKER_PIXELS_PER_SECOND));
  tickerElement.style.setProperty("--ticker-duration", `${duration}s`);
  tickerElement.style.setProperty("--ticker-start", `${windowWidth}px`);
  tickerElement.style.setProperty("--ticker-end", `${-tickerWidth}px`);
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

tickerElement.addEventListener("animationend", (event) => {
  if (event.animationName !== "ticker" || newsItems.length === 0) return;
  newsIndex = (newsIndex + 1) % newsItems.length;
  showNews();
});

updateClock();
setInterval(updateClock, 1000);
await refreshNews();
setInterval(refreshNews, NEWS_REFRESH_MS);
