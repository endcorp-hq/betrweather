import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
  } from "react";
  import ShortXClient from "@endcorp/depredict";
  import {
    AddressLookupTableAccount,
    PublicKey,
    TransactionInstruction,
    VersionedTransaction,
  } from "@solana/web3.js";
  import {
    Market,
    OpenOrderArgs,
    CreateMarketArgs,
    MarketStates,
    WinningDirection,
  } from "@endcorp/depredict";
import { Position } from "@endcorp/depredict";
  import BN from "bn.js";
  import { useCallback } from 'react';
  import { useChain } from "../../contexts/ChainProvider";
import { useAuthorization } from "./useAuthorization";
  import { useBackendRelay } from "../useBackendRelay";
  
  export enum ShortxErrorType {
    MARKET_CREATION = 'MARKET_CREATION',
    POSITION_OPENING = 'POSITION_OPENING',
    PAYOUT = 'PAYOUT',
    MARKET_UPDATE = 'MARKET_UPDATE',
    MARKET_RESOLUTION = 'MARKET_RESOLUTION',
    MARKET_CLOSURE = 'MARKET_CLOSURE',
    CONFIG_CREATION = 'CONFIG_CREATION',
    CONFIG_UPDATE = 'CONFIG_UPDATE',
    CONFIG_CLOSURE = 'CONFIG_CLOSURE',
    MARKET_FETCH = 'MARKET_FETCH',
    POSITION_FETCH = 'POSITION_FETCH',
    INITIALIZATION = 'INITIALIZATION',
    CONFIG_FETCH = 'CONFIG_FETCH',
  }
  
  interface ShortxError extends Error {
    type: ShortxErrorType;
    originalError?: unknown;
  }
  
  export interface ConfigAccount {
    bump: number;
    authority: PublicKey;
    feeVault: PublicKey;
    feeAmount: number;
    version: number;
    nextMarketId: BN;
    globalMarkets: BN;
    baseUri: number[];
  }
  
  interface ShortxContextType {
    client: ShortXClient | null;
    markets: Market[];
    loadingMarket: boolean;
    loadingMarkets: boolean;
    error: ShortxError | null;
    isInitialized: boolean;
    recentTrades: Position[];
    marketEvents: {
      marketId: number;
      state: string;
      yesLiquidity: number;
      noLiquidity: number;
      volume: number;
      updateTs: number;
      nextPositionId: number;
      marketStart: number;
      marketEnd: number;
      winningDirection: WinningDirection;
    }[];
    refresh: () => void;
    openPosition: (
      args: Omit<OpenOrderArgs, "direction"> & {
        direction: { yes: object } | { no: object };
      }
    ) => Promise<
      | string
      | {
          ixs: TransactionInstruction[];
          addressLookupTableAccounts: AddressLookupTableAccount[];
        }
      | undefined
      | null
    >;
    getAllPositionPagesForMarket: (
      marketId: number
    ) => Promise<PositionPageInfo[] | null>;
    payoutPosition: (args: {
      marketId: number;
      payer: PublicKey;
      assetId: PublicKey;
    }) => Promise<any | null>;
    createConfig: (
      feeAmount: number,
      payer: PublicKey
    ) => Promise<TransactionInstruction[] | null>;
    closeConfig: (payer: PublicKey) => Promise<TransactionInstruction[] | null>;
    getConfig: () => Promise<ConfigAccount | null>;
    createMarket: (
      args: CreateMarketArgs
    ) => Promise<{ tx: VersionedTransaction; marketId: number } | null>;
    updateMarket: (
      marketId: number,
      payer: PublicKey,
      marketEnd?: number,
      marketState?: MarketStates
    ) => Promise<VersionedTransaction | null>;
    resolveMarket: (args: {
      marketId: number;
      winningDirection:
        | { yes: object }
        | { no: object }
        | { draw: object }
        | { none: object };
      state: MarketStates;
      oraclePubkey: PublicKey;
      payer: PublicKey;
    }) => Promise<VersionedTransaction | null>;
    loadingConfig: boolean;
    getMarketById: (id: number) => Promise<Market | null | undefined>;
    closeMarket: (
      marketId: number,
      payer: PublicKey
    ) => Promise<TransactionInstruction[] | null>;
    // getUserPositions: (user: PublicKey) => Promise<Position[]>;
  }

  type PositionPageInfo = {
    pageIndex: number;
    totalSlots: number;
    usedSlots: number;
    availableSlots: number;
    isFull: boolean;
    prewarmNext: boolean;
    exists: boolean;
  };
  
  const ShortxContext = createContext<ShortxContextType | undefined>(undefined);
  
  export const ShortxProvider = ({ children }: { children: ReactNode }) => {
    const { connection, currentChain } = useChain(); // Get dynamic RPC URL
    const {selectedAccount} = useAuthorization();
    const { getMarkets: backendGetMarkets } = useBackendRelay();
    const [client, setClient] = useState<ShortXClient | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [markets, setMarkets] = useState<Market[]>([]);
    const [loadingMarkets, setLoadingMarkets] = useState(true);
    const [loadingMarket, setLoadingMarket] = useState(true);
    const [error, setError] = useState<ShortxError | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [refreshCount, setRefreshCount] = useState(0);
    const [recentTrades, setRecentTrades] = useState<Position[]>([]);
    const [marketEvents, setMarketEvents] = useState<{
      marketId: number;
      state: string;
      yesLiquidity: number;
      noLiquidity: number;
      volume: number;
      updateTs: number;
      nextPositionId: number;
      marketStart: number;
      marketEnd: number;
      winningDirection: WinningDirection;
    }[]>([]);
    const [eventSubscriptions, setEventSubscriptions] = useState<number[]>([]);
    const refresh = () => setRefreshCount((c) => c + 1);
  
    const createShortxError = (type: ShortxErrorType, message: string, originalError?: unknown): ShortxError => {
      const error = new Error(message) as ShortxError;
      error.type = type;
      error.originalError = originalError;
      return error;
    };
  
    useEffect(() => {
      const initializeSDK = async () => {
        try {
          if(!currentChain || !connection) {
            throw createShortxError(ShortxErrorType.INITIALIZATION, "Missing chain or RPC URL");
          }
  
          if (!process.env.EXPO_PUBLIC_ADMIN_KEY) {
            throw createShortxError(ShortxErrorType.INITIALIZATION, "Missing EXPO_PUBLIC_ADMIN_KEY");
          }
          const shortxClient = new ShortXClient(
            connection,
            new PublicKey(process.env.EXPO_PUBLIC_ADMIN_KEY || ""),
            new PublicKey(process.env.EXPO_PUBLIC_FEE_VAULT || "DrBmuCCXHoug2K9dS2DCoBBwzj3Utoo9FcXbDcjgPRQx"),
          );

        setClient(shortxClient);
        setIsInitialized(true);
        console.log(`SDK initialized for ${currentChain.toUpperCase()}`);
      } catch (err) {
        setError(
          createShortxError(
            ShortxErrorType.INITIALIZATION,
            "Failed to initialize SDK",
            err
          )
        );
        setIsInitialized(false);
      }
    };
    if (currentChain && connection && selectedAccount) initializeSDK();
  }, [connection, currentChain, selectedAccount]); // Re-initialize when chain changes

  const fetchAllMarkets = async () => {
    setLoadingMarkets(true);
    setError(null);
    try {
      const authority = new PublicKey("8WngPkskxHkYrZZyFVmviu8o7QhHcGWHJ7mowTi5JxzN");
      if (!authority) {
        throw createShortxError(
          ShortxErrorType.INITIALIZATION,
          "Missing environment variables"
        );
      }
      if (client) {
        const m = await client.trade.getMarketsByAuthority(authority);
        setMarkets(m || []);
      }
    } catch (err: unknown) {
      console.log("error", err);
      setError(
        createShortxError(ShortxErrorType.MARKET_FETCH, "Unknown error", err)
      );
      setMarkets([]);
    } finally {
      setLoadingMarkets(false);
    }
  };

  const getMarketById = useCallback(
    async (id: number) => {
      if (!client)
        throw createShortxError(
          ShortxErrorType.INITIALIZATION,
          "Client not initialized"
        );
      setLoadingMarket(true);
      setError(null);
      try {
        // Prefer authority-scoped lookup to avoid cross-authority ID collisions
        const authority = new PublicKey(process.env.EXPO_PUBLIC_ADMIN_KEY!);

        // 1) Check currently loaded authority markets first
        const existing = markets.find((m) => m.marketId === id.toString());
        if (existing) return existing;

        // 2) Fetch authority markets and search by id
        const byAuth = await client.trade.getMarketsByAuthority(authority);
        if (Array.isArray(byAuth)) {
          // Optionally refresh local cache
          setMarkets(byAuth);
          const found = byAuth.find((m) => m.marketId === id.toString());
          if (found) return found;
        }

        // 3) Last resort: avoid global getMarketById to prevent mismatch
        return null;
      } catch (e) {
        console.error("Error fetching market:", e);
        throw createShortxError(
          ShortxErrorType.MARKET_FETCH,
          "Failed to fetch market",
          e
        );
      } finally {
        setLoadingMarket(false);
      }
    }, [client, markets]);
  
    useEffect(() => {
      if (!client) return; // wait for SDK
      fetchAllMarkets();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, refreshCount]);

  // Update markets in real-time when market events are received
  useEffect(() => {
    if (marketEvents.length === 0) return;

      const latestEvent = marketEvents[0]; // Get the most recent event
      
      // Reduce main-thread blocking by batching updates
      // @ts-ignore startTransition exists in React 18
      const run = (React as any).startTransition || ((fn: any) => fn());
      run(() => setMarkets(prevMarkets => {
        const existingMarketIndex = prevMarkets.findIndex(market => market.marketId === latestEvent.marketId.toString());
        
        if (existingMarketIndex !== -1) {
          // Update existing market with new data from event
          const updatedMarkets = [...prevMarkets];
          const existingMarket = updatedMarkets[existingMarketIndex];
          
          // Convert winningDirection from object format to enum
          let winningDirection: WinningDirection;
          if (latestEvent.winningDirection && typeof latestEvent.winningDirection === 'object') {
            if ('yes' in latestEvent.winningDirection) {
              winningDirection = WinningDirection.YES;
            } else if ('no' in latestEvent.winningDirection) {
              winningDirection = WinningDirection.NO;
            } else if ('draw' in latestEvent.winningDirection) {
              winningDirection = WinningDirection.DRAW;
            } else if ('none' in latestEvent.winningDirection) {
              winningDirection = WinningDirection.NONE;
            } else {
              winningDirection = WinningDirection.NONE;
            }
          } else {
            winningDirection = latestEvent.winningDirection as WinningDirection;
          }
          
          updatedMarkets[existingMarketIndex] = {
            ...existingMarket,
            yesLiquidity: latestEvent.yesLiquidity.toString(),
            noLiquidity: latestEvent.noLiquidity.toString(),
            volume: latestEvent.volume.toString(),
            marketStart: latestEvent.marketStart.toString(),
            marketEnd: latestEvent.marketEnd.toString(),
            // Preserve the original winningDirection unless the event indicates a resolution
            winningDirection: winningDirection,
            marketState: latestEvent.state as any,
            nextPositionId: latestEvent.nextPositionId.toString(),
          };
          

          return updatedMarkets;
        } else {
          
          // Fetch the new market and add it to the list
          const fetchNewMarket = async () => {
            try {
              if (client) {
                const newMarket = await client.trade.getMarketById(latestEvent.marketId);
                if (newMarket) {
                  run(() => setMarkets(prev => {
                    // Check if market already exists to prevent duplicates
                    const marketExists = prev.some(market => market.marketId === latestEvent.marketId.toString());
                    if (marketExists) {
                      // console.log(`Market ${latestEvent.marketId} already exists in list, skipping...`);
                      return prev;
                    }
                    // console.log(`Added new market ${latestEvent.marketId} to the list`);
                    return [newMarket, ...prev];
                  }));
                }
              }
            } catch (error) {
              console.error(`Error fetching new market ${latestEvent.marketId}:`, error);
            }
          };
          
          fetchNewMarket();
          return prevMarkets; // Return current markets while fetching
        }
      }));
    }, [marketEvents, client]);
  
    useEffect(() => {
      if (!isInitialized || !client) return;
  
      const subscribeToEvents = async () => {
        try {
          // Subscribe to position events
          const positionListener = client.program.addEventListener(
            "marketEvent", // no position event, use market event instead
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (event: any) => {
              setRecentTrades((prev) => [
                {
                  positionId: event.positionId?.toString?.() ?? String(event.positionId),
                  mint: event.mint?.toString?.() ?? "",
                  positionNonce: event.positionNonce?.toString?.() ?? String(event.positionNonce),
                  marketId: event.marketId?.toString?.() ?? String(event.marketId),
                  amount: event.amount?.toString?.() ?? String(event.amount),
                  direction: event.direction,
                  positionStatus: event.positionStatus,
                  ts: event.ts?.toString?.() ?? String(event.ts),
                  createdAt: event.createdAt?.toString?.() ?? String(event.createdAt),
                } as unknown as Position,
                ...prev,
              ]);
            }
          );
  
          // Subscribe to market events
          const marketListener = client.program.addEventListener(
            "marketEvent",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (event: any) => {
              // console.log("=== MARKET EVENT RECEIVED ===");
              // console.log("Raw event:", event);
              // console.log("Event type:", typeof event);
              // console.log("Event keys:", Object.keys(event));
              // console.log("Market ID:", event.marketId?.toNumber());
              // console.log("Volume:", event.volume?.toNumber());
              // console.log("State:", event.marketState?.toString());
              // console.log("================================");
              
              setMarketEvents((prev) => {
                // Temporarily remove duplicate checking to debug
                // console.log(`Processing market event for market ${event.marketId.toNumber()} with volume ${event.volume.toNumber()}`);
                
                // Convert winningDirection from object format to enum
                let winningDirection: WinningDirection;
                if (event.winningDirection && typeof event.winningDirection === 'object') {
                  if ('yes' in event.winningDirection) {
                    winningDirection = WinningDirection.YES;
                  } else if ('no' in event.winningDirection) {
                    winningDirection = WinningDirection.NO;
                  } else if ('draw' in event.winningDirection) {
                    winningDirection = WinningDirection.DRAW;
                  } else if ('none' in event.winningDirection) {
                    winningDirection = WinningDirection.NONE;
                  } else {
                    winningDirection = WinningDirection.NONE;
                  }
                } else {
                  winningDirection = event.winningDirection as WinningDirection;
                }
                
                // console.log(`Adding market event for market ${event.marketId.toNumber()} with volume ${event.volume.toNumber()}`);
                
                return [
                  {
                    marketId: event.marketId.toNumber(),
                    state: event.marketState.toString(),
                    yesLiquidity: event.yesLiquidity.toNumber(),
                    noLiquidity: event.noLiquidity.toNumber(),
                    volume: event.volume.toNumber(),
                    updateTs: event.updateTs.toNumber(),
                    nextPositionId: event.nextPositionId.toNumber(),
                    marketStart: event.marketStart.toNumber(),
                    marketEnd: event.marketEnd.toNumber(),
                    winningDirection: winningDirection,
                  },
                  ...prev,
                ];
              });
            }
          );
  
          setEventSubscriptions([positionListener, marketListener]);
        } catch (error) {
          console.error("Error subscribing to events:", error);
          // Retry subscription after a delay
          setTimeout(() => {
            console.log("Retrying event subscription...");
            subscribeToEvents();
          }, 5000);
        }
      };
  
      subscribeToEvents();
  
      return () => {
        // Cleanup event listeners
        eventSubscriptions.forEach((subscriptionId) => {
          try {
            client.program.removeEventListener(subscriptionId);
          } catch (error) {
            console.error("Error unsubscribing from event:", error);
          }
        });
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, isInitialized]);
  
    // --- SDK Methods ---
    const openPosition: ShortxContextType["openPosition"] = async (args) => {
      if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
      try {
        const ixs = await client.trade.openPosition(args);
        return ixs;
      } catch (err) {
        console.log("openPosition error", err);
        setError(createShortxError(ShortxErrorType.POSITION_OPENING, "Failed to open position", err));
        throw err;
      }
    };
  
    const createConfig: ShortxContextType["createConfig"] = async (
      feeAmount,
      payer
    ) => {
      if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
      setLoadingConfig(true);
      try {
        const ixs = await client.config.createConfig(feeAmount, payer);
        return ixs;
      } catch (err) {
        setError(createShortxError(ShortxErrorType.CONFIG_CREATION, "Unknown error", err));
        throw err;
      } finally {
        setLoadingConfig(false);
      }
    };
  
    const closeConfig: ShortxContextType["closeConfig"] = async (
      payer: PublicKey
    ) => {
      if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
      try {
        const ixs = await client.config.closeConfig(payer);
        return ixs;
      } catch (err) {
        setError(createShortxError(ShortxErrorType.CONFIG_CLOSURE, "Unknown error", err));
        throw err;
      }
    };
  
    const getConfig: ShortxContextType["getConfig"] = async () => {
      if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
      setLoadingConfig(true);
      try {
        const config = await client.config.getConfig();
        return config;
      } catch (err) {
        console.log("getConfig error", err);
        setError(createShortxError(ShortxErrorType.CONFIG_FETCH, "Unknown error", err));
        return null;
      } finally {
        setLoadingConfig(false);
      }
    };
  
    const createMarket: ShortxContextType["createMarket"] = async (args) => {
      if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
      try {
        const result = await client.trade.createMarket(args);
        return result;
      } catch (err) {
        setError(createShortxError(ShortxErrorType.MARKET_CREATION, "Failed to create market", err));
        return null;
      }
    };
  
    const updateMarket: ShortxContextType["updateMarket"] = async (
        marketId,
        payer,
        marketEnd,
        marketState
    ) => {
      if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
      try {
        const ixs = await client.trade.updateMarket(marketId, payer, marketEnd, marketState);
        return ixs || null;
      } catch (err) {
        setError(createShortxError(ShortxErrorType.MARKET_UPDATE, "Failed to update market", err));
        return null;
      }
    };
  
    const closeMarket: ShortxContextType["closeMarket"] = async (
      marketId,
      payer
    ) => {
      if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
      try {
        const ixs = await client.trade.closeMarket(marketId, payer);
        return ixs;
      } catch (err) {
        setError(createShortxError(ShortxErrorType.MARKET_CLOSURE, "Failed to close market", err));
        return null;
      }
    };
  
    const resolveMarket: ShortxContextType["resolveMarket"] = async (args) => {
      if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
      try {
        const ixs = await client.trade.resolveMarket(args);
        return ixs;
      } catch (err) {
        setError(createShortxError(ShortxErrorType.MARKET_RESOLUTION, "Failed to resolve market", err));
        return null;
      }
    };
  
    const getAllPositionPagesForMarket: ShortxContextType["getAllPositionPagesForMarket"] =
      async (marketId) => {
        if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
        try {
          const accounts = await client.position.getAllPositionPagesForMarket(
            marketId
          );
          return accounts;
        } catch (err) {
          setError(createShortxError(ShortxErrorType.POSITION_FETCH, "Failed to fetch positions", err));
          return null;
        }
      };
  
    const payoutPosition: ShortxContextType["payoutPosition"] = async (args) => {
      if (!client) throw createShortxError(ShortxErrorType.INITIALIZATION, "SDK not initialized");
      try {
        const tx = await client.trade.payoutPosition({
          marketId: args.marketId,
          payer: args.payer,
          assetId: args.assetId,
        });
        return tx;
      } catch (err) {
        console.log("payoutPosition error", err);
        setError(createShortxError(ShortxErrorType.PAYOUT, "Failed to payout position", err));
        return null;
      }
    };
  
    return (
      <ShortxContext.Provider
        value={{
          client,
          markets,
          loadingMarket,
          loadingMarkets,
          error,
          isInitialized,
          recentTrades,
          marketEvents,
          getMarketById,
          refresh,
          openPosition,
          getAllPositionPagesForMarket,
          payoutPosition,
          createConfig,
          // updateConfig,
          closeConfig,
          getConfig,
          createMarket,
          updateMarket,
          resolveMarket,
          loadingConfig,
          closeMarket,
        }}
      >
        {children}
      </ShortxContext.Provider>
    );
  }
  
  export function useShortx() {
    const ctx = useContext(ShortxContext);
    if (!ctx) throw new Error("useShortx must be used within a ShortxProvider");
    return ctx;
  }
  