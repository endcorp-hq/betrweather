import { PublicKey } from "@solana/web3.js";

export function getMint(
    token: string,
    connection: "devnet" | "mainnet"
  ) {
    console.log("token", token);
    switch (token) {
      case "SOL_9":
        return new PublicKey("So11111111111111111111111111111111111111112");
      case "USDC_6":
        if (connection === "devnet") {
          return new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
        } else {
          return new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
        }
      case "BONK_5":
        return new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
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

/**
 * Extracts user-friendly error messages from various error types
 * @param error - The error object to extract message from
 * @param fallbackMessage - Default message if extraction fails
 * @returns A clean, user-friendly error message
 */
export function extractErrorMessage(error: unknown, fallbackMessage: string = "An error occurred"): string {
  if (!error) return fallbackMessage;
  
  // If it's already a string, return it
  if (typeof error === "string") {
    return error;
  }
  
  // If it's an Error object
  if (error instanceof Error) {
    const errorStr = error.message;
    
    // Handle Solana/relay simulation errors
    if (errorStr.includes("Simulation failed") || errorStr.includes("SIMULATION_FAILED")) {
      // Look for the actual error message after "Message:"
      const messageMatch = errorStr.match(/Message:\s*(.+?)(?:\n|$)/);
      if (messageMatch) {
        return messageMatch[1].trim();
      }
      
      // Fallback: extract the part after "Simulation failed."
      const parts = errorStr.split("Simulation failed.");
      if (parts.length > 1) {
        return parts[1].trim();
      }
    }

    // Position not found UX
    if (errorStr.includes("POSITION_NOT_FOUND") || /Position\s+not\s+found/i.test(errorStr)) {
      return "We couldn’t find this position on-chain for this market.";
    }
    
    // Handle other error types
    if (errorStr.includes("Message:")) {
      const messagePart = errorStr.split("Message:")[1];
      if (messagePart) {
        return messagePart.trim().split('\n')[0]; // Take first line
      }
    }
    
    // Return the error message directly if no special handling needed
    return errorStr;
  }
  
  // If it's an object with a message property
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as any).message;
    if (typeof message === "string") {
      return extractErrorMessage(message, fallbackMessage);
    }
  }
  
  // Fallback for unknown error types
  return fallbackMessage;
}

export function ellipsify(str = "", len = 4) {
  if (str.length > 30) {
    return (
      str.substring(0, len) + ".." + str.substring(str.length - len, str.length)
    );
  }
  return str;
}
