import path from "path";
import fs from "fs";

export const modifyBuildGradle = () => {
    const buildGradlePath = path.join(__dirname, "../android/app/build.gradle");
  
    if (!fs.existsSync(buildGradlePath)) {
      console.log(
        "Warning: build.gradle not found, skipping dependency modifications"
      );
      return;
    }
  
    try {
      let content = fs.readFileSync(buildGradlePath, "utf8");
  
      // Check if dependencies are already added
      if (content.includes("androidx.work:work-runtime-ktx")) {
        console.log("Dependencies already present in build.gradle, skipping...");
        return;
      }
  
      // Find the dependencies block
      const dependenciesPattern = /dependencies\s*\{/;
      if (dependenciesPattern.test(content)) {
        // Add dependencies after the dependencies { line
        const newDependencies = `        
          // WorkManager for background tasks
          implementation "androidx.work:work-runtime-ktx:2.10.3"
                
          // For JSON parsing
          implementation 'com.google.code.gson:gson:2.8.9'
          
          // OkHttp for API calls
          implementation "com.squareup.okhttp3:okhttp:4.9.3"
          
          // Google Play Services for location
          implementation "com.google.android.gms:play-services-location:+"
          
          // Kotlin coroutines
          implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.1"
          implementation "org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.1"
      `;
  
        content = content.replace(
          /dependencies\s*\{/,
          `dependencies {${newDependencies}`
        );
  
        fs.writeFileSync(buildGradlePath, content);
        console.log("✅ Dependencies added to build.gradle");
      } else {
        console.log("Warning: Could not find dependencies block in build.gradle");
      }
    } catch (error) {
      console.error("Error modifying build.gradle:", error);
    }
  };