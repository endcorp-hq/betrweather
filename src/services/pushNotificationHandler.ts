// import { useWidgetCache } from '../hooks/useWidgetCache';

// export const handleMarketResolution = (data: any) => {
//   const { updateWidgetCacheDelayed } = useWidgetCache();
  
//   // Handle market resolution push notification
//   if (data.type === 'MARKET_RESOLVED') {
//     // Wait 5 seconds for blockchain to update, then refresh widget
//     updateWidgetCacheDelayed();
//   }
// };

// export const handlePositionUpdate = (data: any) => {
//   const { updateWidgetCacheDelayed } = useWidgetCache();
  
//   // Handle position creation/claim/burn
//   if (['POSITION_CREATED', 'POSITION_CLAIMED', 'POSITION_BURNED'].includes(data.type)) {
//     // Wait 5-10 seconds then refresh widget
//     const delay = Math.random() * 5000 + 5000; // 5-10 seconds
//     setTimeout(() => {
//       updateWidgetCacheDelayed();
//     }, delay);
//   }
// };