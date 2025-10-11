export const getMarketToken = (mint: string): "BONK" | "USDC" => {
    switch (mint) {
        case 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
        case '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU':
            return 'USDC';
        default:
            return 'BONK';
    }
}

export const toUi = (raw: string | number | null | undefined, decimals = 6): number => {
  const n = Number(raw || 0);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals);
};

export const computeDerived = (m: any) => {
  const decimals = Number(m?.decimals ?? 6);
  const yes = Number(m?.yesLiquidity || 0);
  const no = Number(m?.noLiquidity || 0);
  const total = yes + no;
  const yesPct = total > 0 ? yes / total : 0.5;
  const noPct = 1 - yesPct;
  return {
    totalLiquidity: String(total),
    yesPct,
    noPct,
    ui: {
      yes: toUi(yes, decimals),
      no: toUi(no, decimals),
      total: toUi(total, decimals),
      volume: toUi(m?.volume || 0, decimals),
    },
  };
};