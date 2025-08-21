export const widgetConfig = {
  name: "WeatherWidget",
  updateInterval: 15, // minutes
  layout: {
    temperature: {
      id: "temperature_text",
      defaultText: "72°",
      textSize: "24sp",
      textColor: "#FFFFFF"
    },
    condition: {
      id: "condition_text", 
      defaultText: "No Data",
      textSize: "16sp",
      textColor: "#FFFFFF"
    },
    refreshCounter: {
      id: "refresh_counter_text",
      defaultText: "Refresh counter: 0",
      textSize: "12sp",
      textColor: "#FFFFFF"
    }
  }
};
