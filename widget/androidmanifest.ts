import path from "path";
import fs from "fs";

export const modifyAndroidManifest = () => {
    const manifestPath = path.join(
      __dirname,
      "../android/app/src/main/AndroidManifest.xml"
    );
  
    if (!fs.existsSync(manifestPath)) {
      console.log(
        "Warning: AndroidManifest.xml not found, skipping manifest modifications"
      );
      return;
    }
  
    try {
      let content = fs.readFileSync(manifestPath, "utf8");
  
      // Check if widget receiver is already added
      if (content.includes("WeatherWidgetProvider")) {
        console.log(
          "Widget receiver already present in AndroidManifest.xml, skipping..."
        );
        return;
      }
  
      // Find the application tag
      const applicationPattern = /<application[^>]*>/;
      if (applicationPattern.test(content)) {
        // Add widget receiver and permissions before the closing </application> tag
        const widgetManifest = `
          <!-- Weather Widget -->
          <receiver android:name=".widget.WeatherWidgetProvider"
              android:exported="true">
              <intent-filter>
                  <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
              </intent-filter>
              <meta-data
                  android:name="android.appwidget.provider"
                  android:resource="@xml/weather_widget_info" />
          </receiver>
      
          <!-- Weather Update Worker -->
          <provider
              android:name="androidx.startup.InitializationProvider"
              android:authorities="\${applicationId}.androidx-startup"
              android:exported="false">
              <meta-data
                  android:name="androidx.work.WorkManagerInitializer"
                  android:value="androidx.startup" />
          </provider>`;
  
        // Add before closing </application> tag
        content = content.replace(
          /<\/application>/,
          `${widgetManifest}
      </application>`
        );
  
        // Add permissions if they don't exist
        const permissionsToAdd = [
          "android.permission.ACCESS_COARSE_LOCATION",
          "android.permission.ACCESS_FINE_LOCATION",
          "android.permission.INTERNET",
          "android.permission.ACCESS_BACKGROUND_LOCATION",
          "android.permission.ACCESS_NETWORK_STATE"
        ];
  
        permissionsToAdd.forEach((permission) => {
          if (!content.includes(permission)) {
            // Add permission after the opening <manifest> tag
            content = content.replace(
              /<manifest[^>]*>/,
              `$&
          <uses-permission android:name="${permission}" />`
            );
          }
        });
  
        fs.writeFileSync(manifestPath, content);
        console.log(
          "✅ Widget receiver and permissions added to AndroidManifest.xml"
        );
      } else {
        console.log(
          "Warning: Could not find application tag in AndroidManifest.xml"
        );
      }
    } catch (error) {
      console.error("Error modifying AndroidManifest.xml:", error);
    }
  };