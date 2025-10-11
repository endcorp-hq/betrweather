export type WinningDirection = 'Yes' | 'No' | 'Draw' | 'None';

export interface BackendMarket {
  id?: string;
  dbId?: string;
  _id?: string;
  uuid?: string;
  marketId?: number | string | null;
  question?: string;
  marketStart?: string | number | null;
  marketEnd?: string | number | null;
  marketType?: 'live' | 'future' | 'LIVE' | 'FUTURE' | string;
  currency?: string; // e.g. 'USDC_6'
  isActive?: boolean;
  winningDirection?: WinningDirection | string | null;
  yesLiquidity?: string | number | null;
  noLiquidity?: string | number | null;
  volume?: string | number | null;
  marketState?: string | object | null;
  nextPositionId?: string | number | null;
  decimals?: number | null;
  updatedAt?: string | number | null;
}


