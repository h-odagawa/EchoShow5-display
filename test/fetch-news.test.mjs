import test from "node:test";
import assert from "node:assert/strict";
import { parseRss, stripHtml } from "../scripts/fetch-news.mjs";

const feed = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[<b>最初</b> &amp; ニュース]]></title><link>https://example.test/one</link><guid>a</guid><pubDate>Wed, 10 Sep 2026 01:02:03 +0000</pubDate></item>
<item><title>重複</title><link>https://example.test/duplicate</link><guid>a</guid><pubDate>Wed, 10 Sep 2026 01:02:03 +0000</pubDate></item>
<item><title>二番目</title><link>https://example.test/two</link><guid>b</guid><pubDate>not-a-date</pubDate></item>
</channel></rss>`;

test("stripHtml removes markup and decodes XML entities", () => {
  assert.equal(stripHtml("<![CDATA[<p>東京 &amp; <strong>大阪</strong></p>]]>"), "東京 & 大阪");
});

test("parseRss normalizes entries and removes duplicate GUIDs", () => {
  const items = parseRss(feed);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    id: "a", title: "最初 & ニュース", url: "https://example.test/one",
    publishedAt: "2026-09-10T01:02:03.000Z", source: "NHK NEWS WEB"
  });
  assert.equal(items[1].publishedAt, null);
});

test("parseRss rejects feeds without usable items", () => {
  assert.throws(() => parseRss("<rss><channel></channel></rss>"), /no usable items/);
  assert.throws(() => parseRss("<html></html>"), /not RSS XML/);
});

test("parseRss limits its output to 20 items", () => {
  const entries = Array.from({ length: 22 }, (_, index) =>
    `<item><title>記事${index}</title><link>https://example.test/${index}</link><guid>${index}</guid></item>`
  ).join("");
  assert.equal(parseRss(`<rss><channel>${entries}</channel></rss>`).length, 20);
});
