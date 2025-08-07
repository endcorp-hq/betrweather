export const getMarketToken = (mint: string): "BONK" | "USDC" => {
    switch (mint) {
        case 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
        case '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU':
            return 'USDC';
        default:
            return 'BONK';
    }
}