import { useState, useCallback, useRef, useEffect } from "react";
import { InteractionManager } from "react-native";
import { useAuthorization } from "./solana/useAuthorization";
import { useNftMetadata } from "./solana/useNft";
import { useBackendRelay } from "./useBackendRelay";
import { useShortx } from "./solana";
import { Buffer } from "buffer";
import { useMobileWallet } from "./useMobileWallet";

import { useToast } from "../contexts/CustomToast/ToastProvider";
import { timeStart } from "@/utils";
import { CURRENCY_DISPLAY_NAMES, CurrencyType } from "../types/currency";
import {
  PositionWithMarket,
  calculatePayout,
  extractErrorMessage,
} from "@/utils";
import { getJWTTokens, isTokenExpired } from "../utils/authUtils";
import { tokenManager } from "../utils/tokenManager";

// Bubblegum burn handled by backend builder; remove client-side burn
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { PublicKey as Web3PublicKey } from "@solana/web3.js";

import { useChain } from "../contexts/ChainProvider";
import { useQueryClient } from "@tanstack/react-query";

export function usePositions() {
  const { selectedAccount } = useAuthorization();
  const { fetchNftMetadata, loading, retryCount, lastError } = useNftMetadata();
  const { toast } = useToast();
  const { currentChain, connection } = useChain();
  const { forwardTx, signBuiltTransaction, buildSettle, getMarketById: backendGetMarketById } = useBackendRelay();
  const { signTransaction } = useMobileWallet();
  const queryClient = useQueryClient();
  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const lastRefreshTime = useRef<number>(0);
  const inflightPromiseRef = useRef<Promise<void> | null>(null);
  // Track positions removed locally (e.g., after burn) to prevent re-adding on refresh until backend syncs
  const locallyRemovedKeysRef = useRef<Set<string>>(new Set());

  // Use assetId + marketId as canonical key
  const makePositionKey = useCallback((position: { assetId: string | Web3PublicKey; marketId: number }) => {
    const assetB58 = typeof position.assetId === 'string' ? position.assetId : new Web3PublicKey(position.assetId).toBase58();
    return `${assetB58}:${position.marketId}`;
  }, []);

  // Add a function to update claiming state for a specific position
  const setPositionClaiming = useCallback(
    (assetId: string | Web3PublicKey, marketId: number, isClaiming: boolean) => {
      setPositions((prev) =>
        prev.map((position) =>
          new Web3PublicKey(position.assetId).toBase58() === (typeof assetId === 'string' ? assetId : new Web3PublicKey(assetId).toBase58()) &&
          position.marketId === marketId
            ? { ...position, isClaiming }
            : position
        )
      );
    },
    []
  );

  // Hydrate market details in the background for any positions missing market data
  const hydrateMarkets = useCallback(async (positionsToHydrate: PositionWithMarket[]) => {
    const t = timeStart('Positions', 'hydrateMarkets');
    try {
      const missingIds = Array.from(
        new Set(
          positionsToHydrate
            .filter((p) => !p.market && typeof p.marketId === 'number')
            .map((p) => p.marketId)
        )
      );
      if (missingIds.length === 0) return;

      // Limit concurrency to avoid large spikes; process in small batches (backend only)
      const concurrency = 4;
      const results: Array<{ id: number; market: any } | null> = [];
      for (let i = 0; i < missingIds.length; i += concurrency) {
        const slice = missingIds.slice(i, i + concurrency);
        const batch = await Promise.all(
          slice.map(async (id) => {
            try {
              const market = await backendGetMarketById(id);
              return market ? { id, market } : null;
            } catch {
              return null;
            }
          })
        );
        results.push(...batch);
      }

      const marketById = new Map<number, any>();
      for (const res of results) {
        if (res && res.market) {
          marketById.set(res.id, res.market);
        }
      }
      if (marketById.size === 0) return;

      // Single batched state update to reduce re-renders
      setPositions((prev) =>
        prev.map((p) => (p.market || !marketById.has(p.marketId) ? p : { ...p, market: marketById.get(p.marketId) }))
      );
    } catch {}
    finally { t.end({ missing: 0 }); }
  }, [backendGetMarketById]);

  // Manual refresh function
  const refreshPositions = useCallback(async () => {
    if (!selectedAccount) return;
    const now = Date.now();
    // Debounce/throttle rapid calls (e.g., from multiple views)
    if (now - lastRefreshTime.current < 1500 && inflightPromiseRef.current) {
      return inflightPromiseRef.current;
    }
    lastRefreshTime.current = now;

    const t = timeStart('Positions', 'refresh');
    setLoadingMarkets(true);
    const p = (async () => {
      if (!selectedAccount) return;
      const tokens = await getJWTTokens();
      if (!tokens) return;
      const expired = isTokenExpired(tokens);
      if (expired) {
        const success = await tokenManager.refreshTokens();
        if (!success) return;
      }
      const metadata = await fetchNftMetadata();
      // console.log("metadata obtained", metadata);
      if (metadata) {
        // Prefer market from backend if included; fallback to client fetch
        const positionsMapped = metadata.map((position) => {
          try {
            // New backend fields mapping (using loose typing to support transitional backend fields)
            const p: any = position as any;
            const assetIdStr = (p.nftAddress || p.assetId) as string;
            const marketId = Number(p.marketId);
            const mappedDirection = (p.direction === 'Yes' || p.direction === 'YES') ? 'Yes' : 'No';
            const market = p.market ?? null; // do not block on fetching market here
            const decimals = Number((market?.decimals) ?? 6);
            const amountRaw = Number(p.amount || 0);
            // Display amounts consistently assuming 6 decimals by default
            const amountUiUnits = amountRaw / Math.pow(10, decimals);
            const prepared = {
              assetId: umiPublicKey(assetIdStr),
              marketId,
              amount: amountUiUnits,
              direction: mappedDirection as "Yes" | "No",
              isBurned: p.isBurned ?? p.burned ?? undefined,
              userWallet: p.userWallet ?? p.owner ?? undefined,
              market,
            } as PositionWithMarket;
            return prepared;
          } catch (error) {
            console.error(
              `Error preparing position for market ${position.marketId}:`,
              error
            );
            return null;
          }
        }).filter((p): p is PositionWithMarket => p !== null);

        // Filter out any positions that were locally removed (e.g., just burned)
        const filteredPositions = positionsMapped.filter((p) => {
          const key = makePositionKey({ assetId: new Web3PublicKey(p.assetId).toBase58(), marketId: p.marketId });
          return !locallyRemovedKeysRef.current.has(key);
        });

        // Render immediately
        setPositions(filteredPositions);

        // Hydrate missing markets in the background without blocking initial render
        InteractionManager.runAfterInteractions(() => {
          // Add slight delay and batch to avoid backend spikes
          setTimeout(() => { void hydrateMarkets(filteredPositions); }, 300);
        });
      }
    })();

    inflightPromiseRef.current = p.then(() => undefined).catch(() => undefined);

    try {
      await p;
    } catch (error) {
      console.error("Error refreshing positions:", error);
    } finally {
      setLoadingMarkets(false);
      t.end({ positions: undefined });
      inflightPromiseRef.current = null;
    }
  }, [selectedAccount, fetchNftMetadata, hydrateMarkets, makePositionKey, currentChain]);

  // Unified transaction handler for both claim and burn operations
  const handlePositionTransaction = useCallback(
    async (
      position: PositionWithMarket,
      operation: 'claim' | 'burn',
      createTransaction: () => Promise<any>
    ) => {
      // Helper: detect user-cancelled wallet actions across platforms/adapters
      const isUserCancelled = (err: unknown): boolean => {
        const msg = String((err as any)?.message ?? err ?? '').toLowerCase();
        return (
          msg.includes('user canceled') ||
          msg.includes('cancelled') ||
          msg.includes('user rejected') ||
          msg.includes('user declined') ||
          msg.includes('rejected by user') ||
          msg.includes('wallet closed') ||
          msg.includes('closed wallet') ||
          msg.includes('did not return a signed transaction')
        );
      };
      // Set claiming state for this specific position
      setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, true);

      // Safety guard: never leave UI stuck if relay hangs unexpectedly
      const guardTimeoutId = setTimeout(() => {
        try {
          setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
        } catch {}
      }, 30000);

      // Define labels based on operation
      const labels = {
        loading: operation === 'claim' ? 'Claiming Payout' : 'Burning Position',
        processing: operation === 'claim' ? 'Processing your claim...' : 'Processing your burn...',
        processingTx: 'Transaction sent to blockchain...',
        success: operation === 'claim' ? 'Payout Claimed!' : 'Position Burned!',
        successMessage: (amount: number) => {
          if (operation !== 'claim') return 'Position successfully burned!';
          // Prefer explicit currency if provided by backend; else infer from decimals
          const currencyType: CurrencyType | undefined = (position.market as any)?.currency as CurrencyType | undefined;
          const inferred: CurrencyType = ((): CurrencyType => {
            const d = Number((position.market as any)?.decimals ?? 6);
            if (d === 9) return CurrencyType.SOL_9;
            if (d === 5) return CurrencyType.BONK_5;
            return CurrencyType.USDC_6;
          })();
          const symbol = CURRENCY_DISPLAY_NAMES[currencyType || inferred];
          return `Successfully claimed ${amount.toFixed(2)} ${symbol}!`;
        },
        error: operation === 'claim' ? 'Failed to claim payout' : 'Failed to burn position'
      };

      // Show loading toast
      const loadingToastId = toast.loading(
        labels.loading,
        labels.processing,
        { position: "top" }
      );

      if (!selectedAccount) {
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: "Please connect your wallet",
          duration: 4000,
        });
        setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
        return;
      }

      try {
        const tx = await createTransaction();

        if (!tx) {
          toast.update(loadingToastId, {
            type: "error",
            title: "Error",
            message: "Failed to create transaction",
            duration: 4000,
          });
          setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
          return;
        }

        // Show immediate feedback that transaction is being processed
        toast.update(loadingToastId, {
          type: "loading",
          title: "Processing...",
          message: labels.processingTx,
          duration: 2000,
        });

        // Send the transaction in background to avoid blocking UI
        Promise.resolve().then(async () => {
          try {
            let signature;

            // If the transaction was already submitted via relay, treat as success
            if ((tx as any)?.relaySubmitted) {
              signature = (tx as any).signature;
            } else {
              // Sign locally and forward to backend instead of local send
              const signed = await signTransaction(tx);
              if (!signed) throw new Error('Wallet did not return a signed transaction');
              const signedTxB64 = Buffer.from((signed as any).serialize()).toString('base64');
              const forwarded = await forwardTx({
                signedTx: signedTxB64,
                options: { skipPreflight: true, maxRetries: 3 },
              });
              signature = forwarded.signature;
            }

            // Log the transaction signature for debugging/investigation
            if (signature) {
              try {
                console.log(`[${operation.toUpperCase()}] transaction signature:`, signature);
              } catch {}
            }

            if (signature) {
              // Wait for confirmation before mutating UI
              if (connection) {
                try {
                  await connection.confirmTransaction(signature, 'confirmed');
                  const [status, parsed] = await Promise.all([
                    connection.getSignatureStatuses([signature]),
                    connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 } as any),
                  ]);
                  const err = (status?.value?.[0] as any)?.err ?? (parsed as any)?.meta?.err;
                  if (err) throw new Error('Transaction confirmed with error');
                } catch (postErr) {
                  // Confirmation failed or returned error → surface error and stop
                  toast.update(loadingToastId, {
                    type: "error",
                    title: "Transaction Failed",
                    message: "Your transaction did not confirm successfully.",
                    duration: 4000,
                  });
                  setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
                  try { clearTimeout(guardTimeoutId); } catch {}
                  return;
                }
              }

              // Success: now remove from UI and show success toast
              setPositions((prev) =>
                prev.filter(
                  (p) => !(new Web3PublicKey(p.assetId).toBase58() === new Web3PublicKey(position.assetId).toBase58() && p.marketId === position.marketId)
                )
              );
              try {
                const key = makePositionKey({ assetId: new Web3PublicKey(position.assetId).toBase58(), marketId: position.marketId });
                locallyRemovedKeysRef.current.add(key);
              } catch {}

              let uiPayout = 0;
              if (operation === 'claim') {
                const rawPayout = calculatePayout(position) || 0;
                const decimals = Number(position.market?.decimals ?? 6);
                const scale = Math.pow(10, decimals);
                uiPayout = rawPayout >= scale ? rawPayout / scale : rawPayout;
              }
              const successMessage = operation === 'claim'
                ? labels.successMessage(uiPayout)
                : (signature === 'ALREADY_BURNED' ? 'Position already burned' : labels.successMessage(0));

              toast.update(loadingToastId, {
                type: "success",
                title: labels.success,
                message: successMessage,
                duration: 4000,
              });

              setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
              try { clearTimeout(guardTimeoutId); } catch {}
            } else {
              // Transaction failed
              toast.update(loadingToastId, {
                type: "error",
                title: "Error",
                message: "Transaction failed. Please try again.",
                duration: 4000,
              });
              setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
              try { clearTimeout(guardTimeoutId); } catch {}
            }
          } catch (error) {
            // Graceful user cancellation handling (do not log as error)
            if (isUserCancelled(error)) {
              toast.update(loadingToastId, {
                type: "info",
                title: "Cancelled",
                message: operation === 'claim' ? 'Claim cancelled' : 'Burn cancelled',
                duration: 2500,
              });
              setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
              try { clearTimeout(guardTimeoutId); } catch {}
              return;
            }
            console.error(`Error in background ${operation} transaction:`, error);
            const errMsg = String((error as any)?.message || error || "");
            const isAlreadySettledClaim =
              operation === 'claim' && (
              errMsg.includes('Position not found') ||
              errMsg.includes('6013') ||
              errMsg.includes('0x177d') ||
              errMsg.includes('POSITION_ALREADY_CLAIMED') ||
              errMsg.toLowerCase().includes('already settled on-chain') ||
              errMsg.toLowerCase().includes('record marked claimed')
              );

            if (isAlreadySettledClaim) {
              // Treat as already-claimed/settled: remove locally and persist removal key
              setPositions((prev) =>
                prev.filter(
                  (p) => !(new Web3PublicKey(p.assetId).toBase58() === new Web3PublicKey(position.assetId).toBase58() && p.marketId === position.marketId)
                )
              );
              try {
                const key = makePositionKey({ assetId: new Web3PublicKey(position.assetId).toBase58(), marketId: position.marketId });
                locallyRemovedKeysRef.current.add(key);
              } catch {}

              // Show warning instead of success: on-chain reports position not found
              toast.update(loadingToastId, {
                type: "warning",
                title: "Position Not Found",
                message: "Removed from your portfolio. It may have already been claimed.",
                duration: 4000,
              });
              setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
              try { clearTimeout(guardTimeoutId); } catch {}
            } else {
              toast.update(loadingToastId, {
                type: "error",
                title: "Error",
                message: "Transaction failed. Please try again.",
                duration: 4000,
              });
              setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
              try { clearTimeout(guardTimeoutId); } catch {}
            }
          }
        });

      } catch (error) {
        // Graceful user cancellation handling for pre-send phases (e.g., signing the built TX)
        if (isUserCancelled(error)) {
          toast.update(loadingToastId, {
            type: "info",
            title: "Cancelled",
            message: operation === 'claim' ? 'Claim cancelled' : 'Burn cancelled',
            duration: 2500,
          });
          setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
          try { clearTimeout(guardTimeoutId); } catch {}
          return;
        }
        console.error(`Error ${operation}ing position:`, error);
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: extractErrorMessage(error, labels.error),
          duration: 4000,
        });
        setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
        try { clearTimeout(guardTimeoutId); } catch {}
      }
    },
    [
      selectedAccount,
      toast,
      setPositionClaiming,
      calculatePayout,
      queryClient,
    ]
  );

  // Unified settle handler (claims when user won, burns when user lost)
  const settlePosition = useCallback(
    async (position: PositionWithMarket) => {
      if (!selectedAccount?.publicKey) return;

      const payout = calculatePayout(position) ?? 0;
      const operation: 'claim' | 'burn' = payout > 0 ? 'claim' : 'burn';

      await handlePositionTransaction(position, operation, async () => {
        const build = await buildSettle({
          marketId: position.marketId,
          payerPubkey: selectedAccount.publicKey.toBase58(),
          assetId: new Web3PublicKey(position.assetId).toBase58(),
          network: currentChain,
        });

        if (Array.isArray(build.setupMessages) && build.setupMessages.length > 0) {
          for (const setup of build.setupMessages) {
            const setupMessage = setup.message || (setup as any).messageBase64;
            if (!setupMessage) continue;
            const { signedTx: setupSigned } = await signBuiltTransaction(setupMessage);
            const setupB64 = Buffer.from(setupSigned.serialize()).toString('base64');
            await forwardTx({
              signedTx: setupB64,
              options: { skipPreflight: false, maxRetries: 3 },
            });
          }
        }

        const messageBase64 = (build as any).message || (build as any).messageBase64;
        if (!messageBase64) throw new Error('Builder did not return base64 message');
        const { signedTx } = await signBuiltTransaction(messageBase64);
        const signedTxB64 = Buffer.from(signedTx.serialize()).toString('base64');
        const forwarded = await forwardTx({
          signedTx: signedTxB64,
          reference: new Web3PublicKey(position.assetId).toBase58(),
          options: { skipPreflight: true, maxRetries: 3 },
        });
        return forwarded.signature
          ? ({ relaySubmitted: true, signature: forwarded.signature } as any)
          : null;
      });
    },
    [handlePositionTransaction, buildSettle, signBuiltTransaction, forwardTx, selectedAccount, currentChain]
  );

  

  // Filter out positions with null markets for better UX
  const validPositions = positions.filter(
    (position) => position.market !== null
  );

  // Sort by marketId ascending (oldest → newest proxy)
  const sortedPositions = [...validPositions].sort((a, b) => {
    const aId = Number(a.marketId) || Number.MAX_SAFE_INTEGER;
    const bId = Number(b.marketId) || Number.MAX_SAFE_INTEGER;
    return aId - bId;
  });

  // Clear positions and caches on network or wallet change to avoid stale cross-network items
  // Then trigger a fresh background refresh
  useEffect(() => {
    locallyRemovedKeysRef.current.clear();
    setPositions([]);
    lastRefreshTime.current = 0;
    inflightPromiseRef.current = null;
    if (selectedAccount?.publicKey) {
      InteractionManager.runAfterInteractions(() => { void refreshPositions(); });
    }
  }, [currentChain, selectedAccount?.publicKey?.toBase58?.()]);

  return {
    positions: sortedPositions,
    loading,
    loadingMarkets,
    refreshPositions,
    settlePosition,
    lastError,
    retryCount,
  };
}
