export const WEATHER = {
  0: ["快晴", "☀️"],
  1: ["晴れ", "🌤️"],
  2: ["晴れ時々曇り", "⛅"],
  3: ["曇り", "☁️"],
  45: ["霧", "🌫️"],
  48: ["霧", "🌫️"],
  51: ["弱い霧雨", "🌦️"],
  53: ["霧雨", "🌦️"],
  55: ["強い霧雨", "🌧️"],
  56: ["着氷性の霧雨", "🌧️"],
  57: ["着氷性の霧雨", "🌧️"],
  61: ["小雨", "🌦️"],
  63: ["雨", "🌧️"],
  65: ["強い雨", "🌧️"],
  66: ["着氷性の雨", "🌧️"],
  67: ["着氷性の雨", "🌧️"],
  71: ["小雪", "🌨️"],
  73: ["雪", "🌨️"],
  75: ["大雪", "❄️"],
  77: ["雪", "🌨️"],
  80: ["にわか雨", "🌦️"],
  81: ["にわか雨", "🌧️"],
  82: ["激しい雨", "⛈️"],
  85: ["にわか雪", "🌨️"],
  86: ["強いにわか雪", "❄️"],
  95: ["雷雨", "⛈️"],
  96: ["雷雨・ひょう", "⛈️"],
  99: ["雷雨・ひょう", "⛈️"]
};

export function weatherDisplay(code, isDay = true) {
  const [summary, icon] = WEATHER[code] ?? ["天気不明", "--"];
  if (code === 0 && !isDay) return { summary: "快晴", icon: "🌙" };
  if ((code === 1 || code === 2) && !isDay) return { summary, icon: "☁️" };
  return { summary, icon };
}

export function threeHoursLater(payload) {
  const currentTime = Number(payload?.current?.time);
  const times = payload?.hourly?.time;
  const temperatures = payload?.hourly?.temperature_2m;
  const codes = payload?.hourly?.weather_code;
  if (!Number.isFinite(currentTime) || !Array.isArray(times) || !Array.isArray(temperatures)) return null;

  const target = currentTime + 3 * 60 * 60;
  const index = times.findIndex((time) => Number(time) >= target);
  if (index < 0 || !Number.isFinite(Number(temperatures[index]))) return null;
  return {
    temperature: Number(temperatures[index]),
    code: Number(codes?.[index]),
    isDay: payload?.hourly?.is_day?.[index] !== 0
  };
}

export function calendarCells(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const start = new Date(year, month, 1 - firstDay);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + index);
    return {
      day: cellDate.getDate(),
      weekday: cellDate.getDay(),
      outside: cellDate.getMonth() !== month,
      today:
        cellDate.getFullYear() === date.getFullYear() &&
        cellDate.getMonth() === date.getMonth() &&
        cellDate.getDate() === date.getDate()
    };
  });
}
