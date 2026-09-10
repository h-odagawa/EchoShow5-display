import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const RSS_URL = "https://www.nhk.or.jp/rss/news/cat0.xml";
const OUTPUT_PATH = resolve(process.cwd(), process.env.NEWS_OUTPUT ?? "public/news.json");

function decodeEntities(value) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? _;
    const codePoint = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    try { return String.fromCodePoint(codePoint); } catch { return _; }
  });
}
export function stripHtml(value = "") {
  return decodeEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function xmlText(item, tag) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function stableId(guid, url, title) {
  return guid || url || title;
}

export function parseRss(xml) {
  if (typeof xml !== "string" || !/<rss[\s>]/i.test(xml)) throw new Error("The feed is not RSS XML");
  const seen = new Set();
  const items = [];
  const itemPattern = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemPattern.exec(xml)) !== null && items.length < 20) {
    const raw = match[1];
    const title = xmlText(raw, "title");
    const url = xmlText(raw, "link");
    const guid = xmlText(raw, "guid");
    const published = xmlText(raw, "pubDate");
    const id = stableId(guid, url, title);
    if (!id || !title || !/^https?:\/\//.test(url) || seen.has(id)) continue;
    seen.add(id);
    const parsedDate = Date.parse(published);
    items.push({
      id,
      title,
      url,
      publishedAt: Number.isNaN(parsedDate) ? null : new Date(parsedDate).toISOString(),
      source: "NHK NEWS WEB"
    });
  }
  if (!items.length) throw new Error("The RSS feed has no usable items");
  return items;
}

export async function fetchNews(fetchImpl = fetch) {
  const response = await fetchImpl(RSS_URL, {
    headers: { "User-Agent": "echoshow-clock-github-pages/1.0 (+https://github.com/)" },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`RSS request failed with HTTP ${response.status}`);
  return {
    generatedAt: new Date().toISOString(),
    items: parseRss(await response.text())
  };
}

export async function writeNews(payload, outputPath = OUTPUT_PATH) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await writeNews(await fetchNews());
    console.log(`Wrote ${OUTPUT_PATH}`);
  } catch (error) {
    console.error(`News update failed: ${error.message}`);
    process.exitCode = 1;
  }
}
