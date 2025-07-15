import { MMForecastHourly, MMForecastDaily } from '../types/weather';

function mostCommonIcon(icons: (number | null | undefined)[]): number | null {
  const counts: Record<number, number> = {};
  for (const icon of icons) {
    if (icon !== null && icon !== undefined) {
      counts[icon] = (counts[icon] || 0) + 1;
    }
  }
  let max = 0, result: number | null = null;
  for (const [icon, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      result = Number(icon);
    }
  }
  return result;
}

export default function weatherModelAverage(data: any) {
  if (!Array.isArray(data) || data.length === 0) return null;

  // --- Top-level averages as before (first hour of each model) ---
  const keys = [
    "temperature",
    "feels_like",
    "wind_speed",
    "humidity",
    "uv_index",
    "pressure",
  ];

  const getHourlyValue = (item: any, key: string) => item?.hourly?.[0]?.[key];
  const result: Record<string, number | null> = {};
  for (const key of keys) {
    const values = data
      .map((item: any) => getHourlyValue(item, key))
      .filter((v: any) => typeof v === "number");
    result[key] = values.length > 0 ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : null;
  }

  // --- Daily averages ---
  const dailyKeys: (keyof MMForecastDaily)[] = [
    "temperature_max", "temperature_min", "humidity", "uv_index", "pressure", "wind_speed"
  ];
  // Note: In your type, daily is a single object, not an array. If it becomes an array, adjust this logic.
  // For now, we will average across all models' daily objects (i.e., only one day per model)
  const dailyAverages: Record<string, number | null> = {};
  for (const key of dailyKeys) {
    const values = data
      .map((m: any) => m.daily?.[key])
      .filter((v: any) => typeof v === "number");
    dailyAverages[key] = values.length > 0 ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : null;
  }

  // --- Hourly averages by timestamp ---
  const hourlyMap: Record<string, MMForecastHourly[]> = {};
  for (const model of data) {
    for (const h of model.hourly || []) {
      if (!h.timestamp) continue;
      if (!hourlyMap[h.timestamp]) hourlyMap[h.timestamp] = [];
      hourlyMap[h.timestamp].push(h);
    }
  }

  const hourlyAverages = Object.entries(hourlyMap).map(([timestamp, entries]) => {
    const keys: (keyof MMForecastHourly)[] = [
      "temperature", "feels_like", "wind_speed", "humidity", "uv_index", "pressure",
      "precipitation", "precipitation_probability", "wind_direction"
    ];
    const avg: Record<string, number | string | null> = {};
    for (const key of keys) {
      const values = entries.map(e => e[key]).filter(v => typeof v === "number");
      avg[key] = values.length > 0 ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null;
    }
    // Icon: most common non-null number
    avg.icon = mostCommonIcon(entries.map(e => typeof e.icon === 'number' ? e.icon : null));
    avg.timestamp = String(timestamp);
    return avg;
  });

  // Sort by timestamp (guaranteed string)
  hourlyAverages.sort((a, b) => {
    const ta = typeof a.timestamp === 'string' ? a.timestamp : '';
    const tb = typeof b.timestamp === 'string' ? b.timestamp : '';
    return ta.localeCompare(tb);
  });

  // Return top-level keys as before, plus new averages
  return {
    temperature: result.temperature,
    feels_like: result.feels_like,
    wind_speed: result.wind_speed,
    humidity: result.humidity,
    uv_index: result.uv_index,
    pressure: result.pressure,
    hourlyAverages,
    dailyAverages,
  };
}