
// Helper to format market duration
export function formatMarketDuration(startTs: string | number | undefined, endTs: string | number | undefined) {
    if (!startTs || !endTs) return "N/A";
    
    const startDate = new Date(Number(startTs) * 1000);
    const endDate = new Date(Number(endTs) * 1000);
    const currentDate = new Date();
    
    // Check if market time is today
    const isToday = startDate.toDateString() === currentDate.toDateString();
    
    if (isSameDay(startTs, endTs)) {
      if (isToday) {
        // Same day and today: show "6PM - 7PM UTC"
      return `${formatTime(startTs)} - ${formatTime(endTs)} UTC`;
      } else {
        // Same day but not today: show "6PM - 7PM UTC 10th July"
        const dateFormatted = `${startDate.getDate()}${getDaySuffix(startDate.getDate())} ${startDate.toLocaleDateString('en-US', { month: 'long' })}`;
        return `${formatTime(startTs)} - ${formatTime(endTs)} UTC ${dateFormatted}`;
      }
    } else {
      // Different days: show "10th July 12AM - 11th July 1AM UTC"
      const startFormatted = `${startDate.getDate()}${getDaySuffix(startDate.getDate())} ${startDate.toLocaleDateString('en-US', { month: 'long' })} ${formatTime(startTs)}`;
      const endFormatted = `${endDate.getDate()}${getDaySuffix(endDate.getDate())} ${endDate.toLocaleDateString('en-US', { month: 'long' })} ${formatTime(endTs)}`;
      return `${startFormatted} - ${endFormatted} UTC`;
    }
  }

  // Helper to check if start and end are on the same day
function isSameDay(startTs: string | number | undefined, endTs: string | number | undefined) {
    if (!startTs || !endTs) return false;
    const startDate = new Date(Number(startTs) * 1000);
    const endDate = new Date(Number(endTs) * 1000);
    return startDate.toDateString() === endDate.toDateString();
  }
  
  
  // Helper to get day suffix (1st, 2nd, 3rd, etc.)
  function getDaySuffix(day: number) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // Helper to format timestamp to show time in hours
function formatTime(ts: string | number | undefined) {
    if (!ts) return "N/A";
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      hour12: true 
    });
  }