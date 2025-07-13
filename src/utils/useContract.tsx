// import { useMemo, useCallback } from "react";
// import { AnchorProvider, Program } from "@coral-xyz/anchor";
// import { PublicKey, Connection } from "@solana/web3.js";
// import { idl, ShortxContract } from "../solana";
// import { formatMarket } from "./formatMarket";
// import { BN } from "bn.js";

// export function useContract(connection: Connection, anchorWallet: any) {
//   const provider = useMemo(() => {
//     if (!anchorWallet) return null;
//     return new AnchorProvider(connection, anchorWallet, {
//       preflightCommitment: "confirmed",
//       commitment: "processed",
//     });
//   }, [anchorWallet, connection]);

//   const program = useMemo(() => {
//     if (!provider) return null;
//     return new Program<ShortxContract>(idl as any, provider);
//   }, [provider]);

//   // Fetch and format all markets
//   const getAllMarkets = useCallback(async () => {
//     if (!program) return [];
//     const allMarkets = await program.account.marketState.all();
//     return allMarkets.map((m: any) => formatMarket(m.account));
//   }, [program]);

//   // Fetch and format a market by marketId
//   const getMarketById = useCallback(
//     async (marketId: string | number) => {
//       if (!program) return null;
//       // You may need to adjust how you get the PDA for the market
//       const marketPDA = PublicKey.findProgramAddressSync(
//         [Buffer.from("market"), new BN(marketId).toArrayLike(Buffer, "le", 8)],
//         program.programId
//       );

//       const market = await program.account.marketState.fetch(marketPDA[0]);
//       return formatMarket(market);
//     },
//     [program]
//   );

//   return { program, provider, getAllMarkets, getMarketById };
// }
