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

// Helper function to get date from timestamp
function getDateFromTimestamp(timestamp: string): string {
  return timestamp.split('T')[0]; // Returns YYYY-MM-DD format
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

  // --- Daily temperature min/max calculation for each model ---
  const dailyTempByModel: Record<string, Record<string, { min: number; max: number }>> = {};
  
  for (const model of data) {
    const modelName = model.model;
    dailyTempByModel[modelName] = {};
    
    // Group hourly data by date for this model
    const hourlyByDate: Record<string, number[]> = {};
    
    for (const hour of model.hourly || []) {
      if (!hour.timestamp || typeof hour.temperature !== 'number') continue;
      
      const date = getDateFromTimestamp(hour.timestamp);
      if (!hourlyByDate[date]) {
        hourlyByDate[date] = [];
      }
      hourlyByDate[date].push(hour.temperature);
    }
    
    // Calculate min/max for each date in this model
    for (const [date, temperatures] of Object.entries(hourlyByDate)) {
      if (temperatures.length > 0) {
        dailyTempByModel[modelName][date] = {
          min: Math.min(...temperatures),
          max: Math.max(...temperatures)
        };
      }
    }
  }

  // --- Average min/max temperatures across all models for each day ---
  const dailyAverages: Record<string, { min: number | null; max: number | null }> = {};
  
  // Get all unique dates across all models
  const allDates = new Set<string>();
  for (const modelData of Object.values(dailyTempByModel)) {
    for (const date of Object.keys(modelData)) {
      allDates.add(date);
    }
  }
  
  // Calculate averages for each date
  for (const date of allDates) {
    const minTemps: number[] = [];
    const maxTemps: number[] = [];
    
    for (const modelData of Object.values(dailyTempByModel)) {
      if (modelData[date]) {
        minTemps.push(modelData[date].min);
        maxTemps.push(modelData[date].max);
      }
    }
    
    dailyAverages[date] = {
      min: minTemps.length > 0 ? Number((minTemps.reduce((a, b) => a + b, 0) / minTemps.length).toFixed(1)) : null,
      max: maxTemps.length > 0 ? Number((maxTemps.reduce((a, b) => a + b, 0) / maxTemps.length).toFixed(1)) : null
    };
  }

  // --- Daily averages for other metrics (existing logic) ---
  const dailyKeys: (keyof MMForecastDaily)[] = [
    "temperature_max", "temperature_min", "humidity", "uv_index", "pressure", "wind_speed"
  ];
  const dailyOtherAverages: Record<string, number | null> = {};
  for (const key of dailyKeys) {
    const values = data
      .map((m: any) => m.daily?.[key])
      .filter((v: any) => typeof v === "number");
    dailyOtherAverages[key] = values.length > 0 ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : null;
  }

  // --- Hourly averages by timestamp (existing logic) ---
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

  // Sort by timestamp
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
    dailyAverages: {
      ...dailyOtherAverages,
      temperatureByDay: dailyAverages // New field with min/max for each day
    },
  };
}