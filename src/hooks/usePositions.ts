import { useState, useCallback, useRef } from "react";
import { InteractionManager } from "react-native";
import { useAuthorization, useNftMetadata, useShortx } from "./solana";
import { useBackendRelay } from "./useBackendRelay";
import { Buffer } from "buffer";
import { useMobileWallet } from "./useMobileWallet";

import { useToast } from "../contexts/CustomToast/ToastProvider";
import {
  PositionWithMarket,
  calculatePayout,
  extractErrorMessage,
  getAssetInfo,
} from "@/utils";
// Bubblegum burn handled by backend builder; remove client-side burn
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { PublicKey as Web3PublicKey } from "@solana/web3.js";
import { getMarketToken } from "src/utils/marketUtils";

import { useChain } from "@/contexts";

export function usePositions() {
  const { selectedAccount } = useAuthorization();
  const { fetchNftMetadata, loading, retryCount, lastError, clearError } = useNftMetadata();
  const { getMarketById } = useShortx();
  const { toast } = useToast();
  const { currentChain } = useChain();
  const { forwardTx, buildBubblegumBurn, verifyOwnership, signBuiltTransaction, buildPayout, checkBubblegumAsset } = useBackendRelay();
  const { signTransaction } = useMobileWallet();

  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const lastRefreshTime = useRef<number>(0);
  const isRefreshing = useRef(false);
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
    try {
      const missingIds = Array.from(
        new Set(
          positionsToHydrate
            .filter((p) => !p.market && typeof p.marketId === 'number')
            .map((p) => p.marketId)
        )
      );
      if (missingIds.length === 0) return;

      const results = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const market = await getMarketById(id);
            return market ? { id, market } : null;
          } catch {
            return null;
          }
        })
      );

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
  }, [getMarketById]);

  // Manual refresh function
  const refreshPositions = useCallback(async () => {
    if (!selectedAccount) return;

    setLoadingMarkets(true);
    try {
      const metadata = await fetchNftMetadata();
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
              isActive: p.isActive ?? undefined,
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
          // Defer to the end of current UI interactions to keep gestures/refresh smooth
          void hydrateMarkets(filteredPositions);
        });
      }
    } catch (error) {
      console.error("Error refreshing positions:", error);
    } finally {
      setLoadingMarkets(false);
    }
  }, [selectedAccount, fetchNftMetadata, hydrateMarkets, makePositionKey, currentChain]);

  // Unified transaction handler for both claim and burn operations
  const handlePositionTransaction = useCallback(
    async (
      position: PositionWithMarket,
      operation: 'claim' | 'burn',
      createTransaction: () => Promise<any>
    ) => {
      // Set claiming state for this specific position
      setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, true);

      // Define labels based on operation
      const labels = {
        loading: operation === 'claim' ? 'Claiming Payout' : 'Burning Position',
        processing: operation === 'claim' ? 'Processing your claim...' : 'Processing your burn...',
        processingTx: 'Transaction sent to blockchain...',
        transactionSent: 'Transaction Sent',
        processingBlockchain: 'Processing on blockchain...',
        success: operation === 'claim' ? 'Payout Claimed!' : 'Position Burned!',
        successMessage: (amount: number) => 
          operation === 'claim' 
            ? `Successfully claimed ${amount.toFixed(4)} ${getMarketToken(position.market.mint)}!`
            : 'Position successfully burned!',
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
                options: { skipPreflight: false, maxRetries: 3 },
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
              // Remove position from UI immediately for better UX
              setPositions((prev) =>
                prev.filter(
                  (p) => !(new Web3PublicKey(p.assetId).toBase58() === new Web3PublicKey(position.assetId).toBase58() && p.marketId === position.marketId)
                )
              );

              // Remember removal locally to prevent re-adding on subsequent refreshes until backend reflects it
              try {
                const key = makePositionKey({ assetId: new Web3PublicKey(position.assetId).toBase58(), marketId: position.marketId });
                locallyRemovedKeysRef.current.add(key);
              } catch {}

              // Show final success message by updating the existing toast
              let uiPayout = 0;
              if (operation === 'claim') {
                const rawPayout = calculatePayout(position) || 0;
                const decimals = Number(position.market?.decimals ?? 6);
                // Guard: if payout looks like base units, scale down
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

              // Reset claiming state immediately
              setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
            } else {
              // Transaction failed
              toast.update(loadingToastId, {
                type: "error",
                title: "Error",
                message: "Transaction failed. Please try again.",
                duration: 4000,
              });
              setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
            }
          } catch (error) {
            console.error(`Error in background ${operation} transaction:`, error);
            const errMsg = String((error as any)?.message || error || "");
            const isAlreadySettledClaim =
              operation === 'claim' && (
                errMsg.includes('Position not found') ||
                errMsg.includes('6013') ||
                errMsg.includes('0x177d')
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

              toast.update(loadingToastId, {
                type: "success",
                title: "Payout Claimed!",
                message: "Position already settled on-chain.",
                duration: 4000,
              });
              setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
            } else {
              toast.update(loadingToastId, {
                type: "error",
                title: "Error",
                message: "Transaction failed. Please try again.",
                duration: 4000,
              });
              setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
            }
          }
        });

      } catch (error) {
        console.error(`Error ${operation}ing position:`, error);
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: extractErrorMessage(error, labels.error),
          duration: 4000,
        });
        setPositionClaiming(new Web3PublicKey(position.assetId).toBase58(), position.marketId, false);
      }
    },
    [
      selectedAccount,
      toast,
      setPositionClaiming,
      calculatePayout,
    ]
  );

  // Claim payout handler
  const handleClaimPayout = useCallback(
    async (position: PositionWithMarket) => {
      if (!selectedAccount?.publicKey) return;
      
      await handlePositionTransaction(position, 'claim', async () => {
        // Build payout on backend to avoid DAS on client
        const build = await buildPayout({
          marketId: position.marketId,
          payerPubkey: selectedAccount.publicKey.toBase58(),
          assetId: new Web3PublicKey(position.assetId).toBase58(),
          network: currentChain || 'devnet',
        });
        const messageBase64 = (build as any).message || (build as any).messageBase64;
        if (!messageBase64) throw new Error('Builder did not return base64 message');
        const { signedTx } = await signBuiltTransaction(messageBase64);
        const signedTxB64 = Buffer.from(signedTx.serialize()).toString('base64');
        const forwarded = await forwardTx({
          signedTx: signedTxB64,
          // Use cNFT assetId as reference per new claim processing contract
          reference: new Web3PublicKey(position.assetId).toBase58(),
          options: { skipPreflight: false, maxRetries: 3 },
        });
        return forwarded.signature
          ? ({ relaySubmitted: true, signature: forwarded.signature } as any)
          : null;
      });
    },
    [handlePositionTransaction, buildPayout, signBuiltTransaction, forwardTx, selectedAccount, currentChain]
  );

  // Burn position handler
  const handleBurnPosition = useCallback(
    async (position: PositionWithMarket) => {
      if (!selectedAccount?.publicKey) return;
      
      await handlePositionTransaction(position, 'burn', async () => {
        // Debug: print the cNFT AssetID we're attempting to burn
        try {
          const assetIdB58 = new Web3PublicKey(position.assetId).toBase58();
          console.log('[Burn] AssetID:', assetIdB58, 'marketId:', position.marketId);
        } catch {}

        // Step 1: backend asset check (burned/ownership) – no signing if early exit
        const assetIdB58 = new Web3PublicKey(position.assetId).toBase58();
        const check = await checkBubblegumAsset({ assetId: assetIdB58, network: currentChain || 'devnet' });
        if (check?.burned === true) {
          // Signal already-burned success to removal logic and custom toast
          return { relaySubmitted: true, signature: 'ALREADY_BURNED' } as any;
        }

        // Optional preflight ownership check
        try {
          await verifyOwnership({
            assetId: new Web3PublicKey(position.assetId).toBase58(),
            owner: selectedAccount.publicKey.toBase58(),
            network: currentChain || 'devnet',
          });
        } catch {}

        // Build burn via backend, sign locally, forward
        const doBuildSignForward = async () => {
          // 1) Build; surface early backend errors without prompting a signature
          let b: any;
          try {
            b = await buildBubblegumBurn({
              assetId: new Web3PublicKey(position.assetId).toBase58(),
              leafOwner: selectedAccount.publicKey.toBase58(),
              payerPubkey: selectedAccount.publicKey.toBase58(),
              coreCollection: position.market?.nftCollectionMint,
              network: currentChain || 'devnet',
            });
          } catch (e: any) {
            const emsg = String(e?.message || e);
            if (emsg.includes('ASSET_ALREADY_BURNED_DAS') || emsg.includes('ASSET_ALREADY_BURNED_DB')) {
              throw new Error('Already burned');
            }
            if (emsg.includes('LEAF_OWNER_NOT_AUTHORIZED')) {
              throw new Error('Wallet is not owner/delegate');
            }
            throw e;
          }

          // 2) Sign locally
          const msgB64 = b.message || b.messageBase64;
          if (!msgB64) throw new Error('Builder did not return base64 message');
          const { signedTx } = await signBuiltTransaction(msgB64);
          const signedTxB64 = Buffer.from(signedTx.serialize()).toString('base64');

          // 3) Forward; handle post-submit statuses
          try {
            const res = await forwardTx({
              signedTx: signedTxB64,
              reference: assetIdB58,
              options: { skipPreflight: false, maxRetries: 3 },
            });
            return res.signature ? ({ relaySubmitted: true, signature: res.signature } as any) : null;
          } catch (fe: any) {
            const fmsg = String(fe?.message || fe);
            if (fmsg.includes('ASSET_ALREADY_BURNED_SYNCED')) {
              // Treat as already-burned success to remove from list and show proper toast
              return { relaySubmitted: true, signature: 'ALREADY_BURNED' } as any;
            }
            throw fe;
          }
        };

        try {
          return await doBuildSignForward();
        } catch (err: any) {
          const msg = String(err?.message || err);
          if (msg.includes('PROOF_STALE') || msg.includes('Invalid root recomputed')) {
            // Rebuild immediately with fresh proof, re-sign, and forward again
            return await doBuildSignForward();
          }
          throw err;
        }
      });
    },
    [handlePositionTransaction, verifyOwnership, buildBubblegumBurn, signBuiltTransaction, forwardTx, selectedAccount, currentChain]
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

  return {
    positions: sortedPositions,
    loading,
    loadingMarkets,
    refreshPositions,
    handleClaimPayout,
    handleBurnPosition,
    lastError,
    retryCount,
  };
}
