import { PublicKey } from "@solana/web3.js";

export function getMint(
    token: string,
    connection: "devnet" | "mainnet"
  ) {
    console.log("token", token);
    console.log("connection", connection);
    switch (token) {
      case "SOL":
        return new PublicKey("So11111111111111111111111111111111111111112");
      case "USDC":
        if (connection === "devnet") {
          return new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
        } else {
          return new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
        }
      default:
        return new PublicKey("So11111111111111111111111111111111111111112");
    }
  }

// Helper to format date for display
export function formatDate(ts: string | number | undefined) {
    if (!ts) return "N/A";
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  }