// Debug utilities for tracking performance and errors

export const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(`[DEBUG] ${message}`, data || '');
  }
};

export const debugError = (message: string, error?: any) => {
  if (__DEV__) {
    console.error(`[ERROR] ${message}`, error || '');
  }
};

export const debugWarn = (message: string, data?: any) => {
  if (__DEV__) {
    console.warn(`[WARN] ${message}`, data || '');
  }
};

export const debugPerformance = (operation: string, startTime: number) => {
  if (__DEV__) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`[PERF] ${operation} took ${duration.toFixed(2)}ms`);
  }
};

// Track component re-renders
export const trackRender = (componentName: string) => {
  if (__DEV__) {
    console.log(`[RENDER] ${componentName} rendered at ${new Date().toISOString()}`);
  }
};

// Track API calls
export const trackAPICall = (endpoint: string, startTime: number) => {
  if (__DEV__) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`[API] ${endpoint} took ${duration.toFixed(2)}ms`);
  }
};

// Memory usage tracking
export const trackMemoryUsage = () => {
  if (__DEV__ && (global as any).performance?.memory) {
    const memory = (global as any).performance.memory;
    console.log(`[MEMORY] Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB, Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
  }
}; 