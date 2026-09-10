const NEWS_URL = "news.json";
const NEWS_REFRESH_MS = 5 * 60 * 1000;
const CACHE_KEY = "echoshow-news-v1";

const dateElement = document.querySelector("#date");
const timeElement = document.querySelector("#time");
const tickerElement = document.querySelector("#ticker");

let newsItems = [];

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
await refreshNews();
setInterval(refreshNews, NEWS_REFRESH_MS);
