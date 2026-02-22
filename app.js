const form = document.getElementById("searchForm");
const input = document.getElementById("q");

const statusEl = document.getElementById("status");
const cardEl = document.getElementById("card");

const placeNameEl = document.getElementById("placeName");
const todayTextEl = document.getElementById("todayText");
const tempNowEl = document.getElementById("tempNow");
const weatherTextEl = document.getElementById("weatherText");
const subTextEl = document.getElementById("subText");
const dailyTextEl = document.getElementById("dailyText");

function showStatus(message, type = "info") {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function hideStatus() {
  statusEl.hidden = true;
  statusEl.textContent = "";
  statusEl.dataset.type = "";
}

function showCard() {
  cardEl.hidden = false;
}

function hideCard() {
  cardEl.hidden = true;
}

function weatherCodeToText(code) {
  // Open-Meteo weather_code: 代表的なものだけ日本語化（必要なら増やせる）
  const map = new Map([
    [0, "快晴"],
    [1, "晴れ"],
    [2, "一部くもり"],
    [3, "くもり"],
    [45, "霧"],
    [48, "霧（着氷性）"],
    [51, "霧雨（弱）"],
    [53, "霧雨（中）"],
    [55, "霧雨（強）"],
    [61, "雨（弱）"],
    [63, "雨（中）"],
    [65, "雨（強）"],
    [71, "雪（弱）"],
    [73, "雪（中）"],
    [75, "雪（強）"],
    [80, "にわか雨（弱）"],
    [81, "にわか雨（中）"],
    [82, "にわか雨（強）"],
    [95, "雷雨"],
  ]);
  return map.get(code) ?? `天気コード: ${code}`;
}

function formatTodayJP() {
  const d = new Date();
  const w = ["日","月","火","水","木","金","土"][d.getDay()];
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}（${w}）`;
}

async function geocodePlace(name) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "ja");
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  if (!res.ok) throw new Error("地点検索に失敗しました");
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("地点が見つかりませんでした。別の地名で試してみてください。");
  }
  const r = data.results[0];
  return {
    name: r.name,
    admin: [r.admin1, r.country].filter(Boolean).join(" / "),
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

async function fetchWeather(lat, lon) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "Asia/Tokyo");

  const res = await fetch(url);
  if (!res.ok) throw new Error("天気取得に失敗しました");
  const data = await res.json();

  return {
    temp: data.current?.temperature_2m,
    feels: data.current?.apparent_temperature,
    code: data.current?.weather_code,
    tMax: data.daily?.temperature_2m_max?.[0],
    tMin: data.daily?.temperature_2m_min?.[0],
  };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;

  hideCard();
  showStatus("取得中…", "loading");

  try {
    const place = await geocodePlace(q);
    const w = await fetchWeather(place.latitude, place.longitude);

    placeNameEl.textContent = `${place.name}`;
    todayTextEl.textContent = `今日 ${formatTodayJP()}`;
    tempNowEl.textContent = Math.round(w.temp);
    weatherTextEl.textContent = weatherCodeToText(w.code);
    subTextEl.textContent = `体感 ${Math.round(w.feels)}℃ / ${place.admin}`;
    dailyTextEl.textContent = `最高 ${Math.round(w.tMax)}℃ / 最低 ${Math.round(w.tMin)}℃`;

    hideStatus();
    showCard();
  } catch (err) {
    showStatus(err?.message ?? "エラーが発生しました", "error");
  }
});