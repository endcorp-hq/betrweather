// Function to get the appropriate background video based on weather and time
export default function getBackgroundVideo(weatherType: any, isDay: boolean): any {
    // Extract base weather type from day/night variant (e.g., "sunny_day" -> "sunny")
    const baseWeatherType = weatherType?.includes("_")
      ? weatherType.split("_")[0]
      : weatherType;
  
    if (baseWeatherType === "sunny" || baseWeatherType === null) {
      return isDay
        ? require("../../assets/weatherBg/clear-day.mp4")
        : require("../../assets/weatherBg/clear-night.mp4");
    } else if (
      baseWeatherType === "cloudy" ||
      baseWeatherType === "partly_cloudy" ||
      baseWeatherType === "overcast"
    ) {
      return isDay
        ? require("../../assets/weatherBg/cloudy-day.mp4")
        : require("../../assets/weatherBg/cloudy-night.mp4");
    } else if (baseWeatherType === "rainy") {
      return isDay
        ? require("../../assets/weatherBg/rainy-cloudy-day.mp4")
        : require("../../assets/weatherBg/rainy-cloudy-night.mp4");
    }
    // For other weather types, use cloudy backgrounds as fallback
    return isDay
      ? require("../../assets/weatherBg/cloudy-day.mp4")
      : require("../../assets/weatherBg/cloudy-night.mp4");
  }

  