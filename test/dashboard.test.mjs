import assert from "node:assert/strict";
import test from "node:test";

import { calendarCells, threeHoursLater, weatherDisplay } from "../public/dashboard.js";

test("calendarCells creates a six-week calendar and marks today", () => {
  const cells = calendarCells(new Date(2026, 8, 10));
  assert.equal(cells.length, 42);
  assert.deepEqual(cells[0], { day: 30, weekday: 0, outside: true, today: false });
  assert.deepEqual(cells[11], { day: 10, weekday: 4, outside: false, today: true });
  assert.equal(cells.at(-1).day, 10);
  assert.equal(cells.at(-1).outside, true);
});

test("threeHoursLater selects the first forecast at least three hours ahead", () => {
  const currentTime = 1_800_000_000;
  const payload = {
    current: { time: currentTime },
    hourly: {
      time: [currentTime + 10_000, currentTime + 10_800, currentTime + 14_400],
      temperature_2m: [20, 21.4, 22],
      weather_code: [1, 2, 3],
      is_day: [1, 0, 0]
    }
  };
  assert.deepEqual(threeHoursLater(payload), { temperature: 21.4, code: 2, isDay: false });
});

test("weatherDisplay uses a moon for a clear night", () => {
  assert.deepEqual(weatherDisplay(0, false), { summary: "快晴", icon: "🌙" });
  assert.deepEqual(weatherDisplay(63), { summary: "雨", icon: "🌧️" });
});
