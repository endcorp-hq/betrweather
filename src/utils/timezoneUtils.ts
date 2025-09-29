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