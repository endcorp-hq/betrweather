export const ENABLE_NETWORK_TOGGLE: boolean = String(
  process.env.EXPO_PUBLIC_ENABLE_NETWORK_TOGGLE ?? ''
)
  .trim()
  .toLowerCase() === 'true';


