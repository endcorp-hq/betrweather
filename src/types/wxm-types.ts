export interface WeatherXMStation {
  id: string;
  name: string;
  lastDayQod: number;
  cellId: string;
  createdAt: string;
  lat: number;
  lon: number;
  elevation: number;
}

export interface WeatherXMObservation {
  timestamp: string;
  temperature: number;
  feels_like: number;
  dew_point: number;
  humidity: number;
  precipitation_rate: number;
  wind_speed: number;
  wind_gust: number;
  wind_direction: number;
  uv_index: number;
  pressure: number;
  solar_irradiance: number;
  icon: string;
  created_at: string;
}

export interface WeatherXMHealth {
  timestamp: string;
  data_quality: {
    score: number;
  };
  location_quality: {
    score: number;
  };
}

export interface WeatherXMLatestResponse {
  observation: WeatherXMObservation;
  health: WeatherXMHealth;
  location: {
    lat: number;
    lon: number;
    elevation: number;
  };
}

export interface ClosestStationResponseDto {
  station: WeatherXMStation;
  distance: number;
  weather?: WeatherXMLatestResponse;
}

interface WeatherXMWXMv1DailyData {
  temperature_max: number;
  temperature_min: number;
  precipitation_probability: number;
  precipitation_intensity: number;
  humidity: number;
  uv_index: number;
  pressure: number;
  icon: string;
  precipitation_type: string;
  wind_speed: number;
  wind_direction: number;
  timestamp: string;
}

interface WeatherXMWXMv1HourlyData {
  precipitation: number;
  precipitation_probability: number;
  temperature: number;
  icon: string;
  wind_speed: number;
  wind_direction: number;
  humidity: number;
  pressure: number;
  uv_index: number;
  timestamp: string;
  feels_like: number;
}

export interface WeatherXMWXMv1ForecastDay {
  tz: string;
  date: string;
  daily?: WeatherXMWXMv1DailyData;
  hourly?: WeatherXMWXMv1HourlyData[];
}

export interface WeatherXMWXMv1Response {
  data: {
    data: WeatherXMWXMv1ForecastDay[] | ClosestStationResponseDto | CurrentConditionsResponse;
    source: string;
  };
  message: string;
}

export interface CurrentConditionsResponse {
    currentTime: string;
    timeZone: {
      id: string;
    };
    isDaytime: boolean;
    weatherCondition: {
      iconBaseUri: string;
      description: {
        text: string;
        languageCode: string;
      };
      type: string;
    };
    temperature: {
      degrees: number;
      unit: string;
    };
    feelsLikeTemperature: {
      degrees: number;
      unit: string;
    };
    dewPoint: {
      degrees: number;
      unit: string;
    };
    heatIndex: {
      degrees: number;
      unit: string;
    };
    windChill: {
      degrees: number;
      unit: string;
    };
    relativeHumidity: number;
    uvIndex: number;
    precipitation: {
      probability: {
        percent: number;
        type: string;
      };
      snowQpf: {
        quantity: number;
        unit: string;
      };
      qpf: {
        quantity: number;
        unit: string;
      };
    };
    thunderstormProbability: number;
    airPressure: {
      meanSeaLevelMillibars: number;
    };
    wind: {
      direction: {
        degrees: number;
        cardinal: string;
      };
      speed: {
        value: number;
        unit: string;
      };
      gust: {
        value: number;
        unit: string;
      };
    };
    visibility: {
      distance: number;
      unit: string;
    };
    cloudCover: number;
    currentConditionsHistory: {
      temperatureChange: {
        degrees: number;
        unit: string;
      };
      maxTemperature: {
        degrees: number;
        unit: string;
      };
      minTemperature: {
        degrees: number;
        unit: string;
      };
      snowQpf: {
        quantity: number;
        unit: string;
      };
      qpf: {
        quantity: number;
        unit: string;
      };
    };
  }


  export interface GoogleHourlyForecastResponse {
    forecastHours: GoogleForecastHour[];
    timeZone: {
      id: string;
      version: string;
    };
    nextPageToken: string;
  }
  
  export interface GoogleForecastHour {
    interval: {
      startTime: string;
      endTime: string;
    };
    displayDateTime: {
      year: number;
      month: number;
      day: number;
      hours: number;
      minutes: number;
      seconds: number;
      nanos: number;
      utcOffset: string;
    };
    weatherCondition: {
      iconBaseUri: string;
      description: {
        text: string;
        languageCode: string;
      };
      type: string;
    };
    temperature: {
      unit: string;
      degrees: number;
    };
    feelsLikeTemperature: {
      unit: string;
      degrees: number;
    };
    dewPoint: {
      unit: string;
      degrees: number;
    };
    heatIndex: {
      unit: string;
      degrees: number;
    };
    windChill: {
      unit: string;
      degrees: number;
    };
    wetBulbTemperature: {
      unit: string;
      degrees: number;
    };
    precipitation: {
      probability: {
        type: string;
        percent: number;
      };
      snowQpf: {
        unit: string;
        quantity: number;
      };
      qpf: {
        unit: string;
        quantity: number;
      };
    };
    airPressure: {
      meanSeaLevelMillibars: number;
    };
    wind: {
      direction: {
        cardinal: string;
        degrees: number;
      };
      speed: {
        unit: string;
        value: number;
      };
      gust: {
        unit: string;
        value: number;
      };
    };
    visibility: {
      unit: string;
      distance: number;
    };
    iceThickness: {
      unit: string;
      thickness: number;
    };
    isDaytime: boolean;
    relativeHumidity: number;
    uvIndex: number;
    thunderstormProbability: number;
    cloudCover: number;
  }

  export interface HourlyForecastResponse {
    data: {
      data: GoogleHourlyForecastResponse | WeatherXMWXMv1ForecastDay[];
      source: string;
    };
    message: string;
  }

  export interface GoogleDailyForecastResponse {
    forecastDays: GoogleForecastDay[];
    timeZone: {
      id: string;
    };
  }
  
  export interface GoogleForecastDay {
    interval: {
      startTime: string;
      endTime: string;
    };
    displayDate: {
      year: number;
      month: number;
      day: number;
    };
    daytimeForecast: GoogleDayTimeForecast;
    nighttimeForecast: GoogleDayTimeForecast;
    maxTemperature: {
      degrees: number;
      unit: string;
    };
    minTemperature: {
      degrees: number;
      unit: string;
    };
    feelsLikeMaxTemperature: {
      degrees: number;
      unit: string;
    };
    feelsLikeMinTemperature: {
      degrees: number;
      unit: string;
    };
    sunEvents: {
      sunriseTime: string;
      sunsetTime: string;
    };
    moonEvents: {
      moonPhase: string;
      moonriseTimes: string[];
      moonsetTimes: string[];
    };
    maxHeatIndex: {
      degrees: number;
      unit: string;
    };
  }
  
  export interface GoogleDayTimeForecast {
    interval: {
      startTime: string;
      endTime: string;
    };
    weatherCondition: {
      iconBaseUri: string;
      description: {
        text: string;
        languageCode: string;
      };
      type: string;
    };
    relativeHumidity: number;
    uvIndex: number;
    precipitation: {
      probability: {
        percent: number;
        type: string;
      };
      snowQpf: {
        quantity: number;
        unit: string;
      };
      qpf: {
        quantity: number;
        unit: string;
      };
    };
    thunderstormProbability: number;
    wind: {
      direction: {
        degrees: number;
        cardinal: string;
      };
      speed: {
        value: number;
        unit: string;
      };
      gust: {
        value: number;
        unit: string;
      };
    };
    cloudCover: number;
    iceThickness: {
      thickness: number;
      unit: string;
    };
  }
  

  export interface DailyForecastResponse {
    data: {
      data: GoogleDailyForecastResponse | WeatherXMWXMv1ForecastDay[];
      source: string;
    };
    message: string;
  }
  
