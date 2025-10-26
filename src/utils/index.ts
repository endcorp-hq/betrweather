// Utility Functions

// H3 Utilities
export { getH3Index, getH3IndexFromCell, getH3Neighbors } from './h3';

// Helper Functions
export { 
  getMint, 
  formatDate, 
  extractErrorMessage, 
  ellipsify 
} from './helpers';

// Position Utilities
export {
  PositionWithMarket,
  getWeatherBackground,
  getStatusColor,
  getStatusText,
  getStatusIcon,
  calculatePayout,
  isPositionClaimable,
  calculateExpectedPayout
} from './positionUtils';

// DAS helpers
export { getAssetInfo } from './das';

// Timezone Utilities
export { 
  getLocalTimeForTimezone, 
  formatTimezoneName 
} from './timezoneUtils';

// Weather Utilities
export {
  fallbackIcons,
  mapWXMV1IconToWeatherType,
  getWeatherXMIcon,
  formatDate as formatWeatherDate,
  default as getBackgroundVideo
} from './weatherUtils'; 

// Sign In Utilities
export {
  generateSecureSignInPayload,
  WALLET_ALREADY_REGISTERED_ERROR,
} from './signInUtils';

// Toast Utilities
export { toast, setToastHandler } from './toastUtils';

// Market utilities
export { getMarketToken, computeDerived, toUi } from './marketUtils';

// SSE Utilities
export { startSSE } from './sse';

// Logger
export { log, timeStart, throttle } from './logger';
