export enum CurrencyType {
  BONK_5 = 'BONK_5',  // 5 decimals
  SOL_9 = 'SOL_9',    // 9 decimals
  USDC_6 = 'USDC_6',  // 6 decimals
}

export const CURRENCY_DECIMALS = {
  [CurrencyType.BONK_5]: 5,
  [CurrencyType.SOL_9]: 9,
  [CurrencyType.USDC_6]: 6,
} as const;

export const CURRENCY_DISPLAY_NAMES = {
  [CurrencyType.BONK_5]: 'BONK',
  [CurrencyType.SOL_9]: 'SOL',
  [CurrencyType.USDC_6]: 'USDC',
} as const;
