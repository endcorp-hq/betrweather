import path from "path";
import fs from "fs";

//there's no need of this file by the looks of it but it works so dont touch it.
export const modifyMainApplication = () => {
    const mainApplicationPath = path.join(
      __dirname,
      "../android/app/src/main/java/com/betrweather/app/MainApplication.kt"
    );
  
    if (!fs.existsSync(mainApplicationPath)) {
      console.log(
        "Warning: MainApplication.kt not found, skipping modifications"
      );
      return;
    }
  
    try {
      let content = fs.readFileSync(mainApplicationPath, "utf8");
  
      if (content.includes("WeatherUpdateWorker")) {
        console.log(
          "WorkManager already configured, skipping MainApplication modifications"
        );
        return;
      }
  
      console.log("✅ MainApplication.kt - no WorkManager scheduling needed");
    } catch (error) {
      console.error("Error modifying MainApplication.kt:", error);
    }
  };