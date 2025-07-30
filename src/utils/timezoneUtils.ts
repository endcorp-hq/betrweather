// Timezone utility functions for world clock feature

interface TimezoneInfo {
  timezone: string;
  formattedTime: string;
  formattedDate: string;
}

// Get timezone information for coordinates using Google Timezone API
export const getTimezoneInfo = async (lat: number, lon: number): Promise<TimezoneInfo | null> => {
  try {
    const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY;
    
    if (!apiKey) {
      console.error('Google API key not found');
      return null;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${timestamp}&key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Timezone API response not ok:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.status === 'OK') {
      const timezone = data.timeZoneId; // e.g., "America/Los_Angeles"
      
      // Get current UTC date
      const utcDate = new Date();
      
      // Format time and date using timezone directly
      const formattedTime = utcDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
      });
      
      const formattedDate = utcDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: timezone
      });

      return {
        timezone,
        formattedTime,
        formattedDate
      };
    } else {
      console.error('Timezone API error:', data.status, data.errorMessage);
      return null;
    }
    
  } catch (error) {
    console.error('Error fetching timezone info:', error);
    return null;
  }
};

// Calculate local time for coordinates using timezone
export const calculateLocalTimeForCoordinates = async (lat: number, lon: number): Promise<{ time: string; date: string } | null> => {
  try {
    const timezoneInfo = await getTimezoneInfo(lat, lon);
    
    if (timezoneInfo) {
      return {
        time: timezoneInfo.formattedTime,
        date: timezoneInfo.formattedDate
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating local time:', error);
    return null;
  }
};

// Get current local time for a timezone (fallback function)
export const getLocalTimeForTimezone = (timezone: string): { time: string; date: string } => {
  try {
    const now = new Date();
    
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    });
    
    const date = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: timezone
    });

    return { time, date };
  } catch (error) {
    console.error('Error getting local time for timezone:', error);
    return { time: '--:--', date: '--' };
  }
};

// Format timezone name for display (e.g., "America/New_York" -> "New York")
export const formatTimezoneName = (timezone: string): string => {
  const parts = timezone.split('/');
  if (parts.length > 1) {
    return parts[parts.length - 1].replace(/_/g, ' ');
  }
  return timezone;
}; 