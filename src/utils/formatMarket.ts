// import { IdlAccounts } from "@coral-xyz/anchor";
// import { PublicKey } from "@solana/web3.js";
// import { ShortxContract } from "@endcorp/depredict";

// export const formatMarket = (
//     account: IdlAccounts<ShortxContract>['marketState'],
//   ) => {
//     return {
//       bump: account.bump,
//       authority: account.authority.toString(),
//       marketId: account.marketId.toString(),
//       yesLiquidity: account.yesLiquidity.toString(),
//       noLiquidity: account.noLiquidity.toString(),
//       volume: String(Number(account.volume.toString()) / 10 ** 6),
//       oraclePubkey: account.oraclePubkey ? account.oraclePubkey.toString() : '',
//       nftCollectionMint: account.nftCollection ? account.nftCollection.toString() : '',
//       marketUsdcVault: account.marketUsdcVault ? account.marketUsdcVault.toString() : '',
//       marketState: getMarketState(account.marketState),
//       updateTs: account.updateTs.toString(),
//       nextPositionId: account.nextPositionId.toString(),
//       marketStart: account.marketStart.toString(),
//       marketEnd: account.marketEnd.toString(),
//       question: Buffer.from(account.question).toString().replace(/\0+$/, ''),
//       winningDirection: getWinningDirection(account.winningDirection),
//     }
//   }


//   export const getMarketState = (
//     status: IdlAccounts<ShortxContract>['marketState']['marketState']
//   ) => {
//     return Object.keys(status)[0];
    
//   }

//   export const getWinningDirection = (
//     direction: IdlAccounts<ShortxContract>['marketState']['winningDirection']
//   ) => {
//     const key = Object.keys(direction)[0];
//     switch (key) {
//       case 'yes':
//         return 'yes';
//       case 'no':
//         return 'no';
//       case 'none':
//         return 'none';
//       default:
//         return key;
//     }
//   };