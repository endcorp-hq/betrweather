import { View, ScrollView, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Switch } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useShortx } from "../solana/useContract";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";
import { formatMarketDuration } from "../components/market/format-market-duration";
import { WinningDirection } from "shortx-sdk";
import { useAuthorization } from "../utils/useAuthorization";
import axios from "axios";
import { getMint, formatDate } from "../utils/helpers";
import { PublicKey } from "@solana/web3.js";
import { useCreateAndSendTx } from "../utils/useCreateAndSendTx";
import { DynamicTextInput } from "../components/ui/dynamicTextInput";
import { toast } from "sonner-native";
import { useAPI } from "../utils/useAPI";
import GlassyCard from '../components/ui/GlassyCard';
import MaterialCard from '../components/ui/MaterialCard';
import theme from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const icons = {
  rain: "🌧️",
  sun: "☀️",
};

const REEL_HEIGHT = 100;
const REEL_ITEMS = ["rain", "sun", "rain", "sun", "rain"];
const DUMMY_API_RESPONSE = ["rain", "sun", "rain"];

const SUGGESTED_BETS = [1, 3, 5, 10];

// Single swipeable card with all info
function SwipeableBetCard({ market, onSelect }: { market: any, onSelect: (dir: 'yes'|'no') => void }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [swiping, setSwiping] = useState(false);
  const [swipeDir, setSwipeDir] = useState<'yes'|'no'|null>(null);
  const insets = useSafeAreaInsets ? useSafeAreaInsets() : { bottom: 24 };
  // Opacity for each overlay
  const yesOverlayOpacity = pan.x.interpolate({
    inputRange: [0, 80, 200],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });
  const noOverlayOpacity = pan.x.interpolate({
    inputRange: [-200, -80, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Wobble animation on mount
  useEffect(() => {
    Animated.sequence([
      Animated.timing(pan.x, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(pan.x, { toValue: 20, duration: 120, useNativeDriver: true }),
      Animated.timing(pan.x, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRelease = (_: any, gesture: any) => {
    if (gesture.dx > 80) {
      setSwipeDir('yes');
      Animated.timing(pan, { toValue: { x: 500, y: 0 }, duration: 200, useNativeDriver: true }).start(() => {
        onSelect('yes');
        pan.setValue({ x: 0, y: 0 });
        setSwipeDir(null);
      });
    } else if (gesture.dx < -80) {
      setSwipeDir('no');
      Animated.timing(pan, { toValue: { x: -500, y: 0 }, duration: 200, useNativeDriver: true }).start(() => {
        onSelect('no');
        pan.setValue({ x: 0, y: 0 });
        setSwipeDir(null);
      });
    } else {
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      setSwipeDir(null);
    }
  };

  return (
    <View style={{ flex: 1, width: '100%', position: 'absolute', left: 0, right: 0, top: 60, bottom: 0, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: insets.bottom + 16, zIndex: 10 }}>
      <Animated.View
        style={{
          width: '92%',
          minHeight: 420,
          maxHeight: '98%',
          borderRadius: theme.borderRadius.xl,
          overflow: 'hidden',
          ...theme.elevation.level4,
          backgroundColor: 'transparent',
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            {
              rotate: pan.x.interpolate({
                inputRange: [-200, 0, 200],
                outputRange: ['-15deg', '0deg', '15deg'],
                extrapolate: 'clamp',
              })
            }
          ],
        }}
        {...{
          ...require('react-native').PanResponder.create({
            onMoveShouldSetPanResponder: (_: any, g: any) => Math.abs(g.dx) > 10,
            onPanResponderGrant: () => setSwiping(true),
            onPanResponderMove: Animated.event([
              null,
              { dx: pan.x, dy: pan.y },
            ], { useNativeDriver: false }),
            onPanResponderRelease: handleRelease,
            onPanResponderTerminate: () => setSwiping(false),
          }).panHandlers,
        }}
      >
        {/* Two overlays: green for right, red for left */}
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: theme.swipe.yesOverlay,
            opacity: yesOverlayOpacity,
            borderRadius: theme.borderRadius.xl,
            zIndex: 2,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: theme.swipe.noOverlay,
            opacity: noOverlayOpacity,
            borderRadius: theme.borderRadius.xl,
            zIndex: 2,
          }}
        />
        <GlassyCard style={{ flex: 1, minHeight: 420, justifyContent: 'center', alignItems: 'center' }} intensity={0} shimmer={false}>
          <View style={[styles.swipeCardInner, { backgroundColor: 'transparent' }]}>
            <Text style={styles.swipeInstruction}>
              Swipe <Text style={{ color: theme.swipe.yesText, fontWeight: "bold" }}>right</Text> for <Text style={{ color: theme.swipe.yesText, fontWeight: "bold" }}>YES</Text>, <Text style={{ color: theme.swipe.noText, fontWeight: "bold" }}>left</Text> for <Text style={{ color: theme.swipe.noText, fontWeight: "bold" }}>NO</Text>
            </Text>
            {/* YES/NO overlays */}
            <Animated.View style={[styles.swipeOverlay, { backgroundColor: 'transparent', opacity: yesOverlayOpacity }]}>
              <Text style={[styles.swipeYesText, { color: theme.swipe.yesText }]}>YES</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeOverlay, { backgroundColor: 'transparent', opacity: noOverlayOpacity }]}>
              <Text style={[styles.swipeNoText, { color: theme.swipe.noText }]}>NO</Text>
            </Animated.View>
            {/* Market Info */}
            <Text style={styles.swipeCardQuestion}>{market.question}</Text>
            <View style={{ marginTop: 12, backgroundColor: 'transparent' }}>
              <Text style={styles.swipeCardMeta}>Resolution Time: <Text style={styles.swipeCardMetaValue}>{formatMarketDuration(market.marketStart, market.marketEnd)}</Text></Text>
              <Text style={styles.swipeCardMeta}>Betting Ends: <Text style={styles.swipeCardMetaValue}>{formatDate(market.marketEnd)}</Text></Text>
              <Text style={styles.swipeCardMeta}>Volume: <Text style={styles.swipeCardMetaValue}>${(parseFloat(market.volume || "0") / 10 ** 6).toFixed(1)}</Text></Text>
            </View>
          </View>
        </GlassyCard>
      </Animated.View>
    </View>
  );
}

const SlotMachineScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { selectedAccount } = useAuthorization();
  const { createAndSendTx } = useCreateAndSendTx();
  // @ts-ignore
  const { id } = route.params || {};
  const {
    openPosition,
    getMarketById,
    selectedMarket,
    loadingMarket,
    error: shortxError,
  } = useShortx();

  const [betAmount, setBetAmount] = useState("");
  const [selectedDirection, setSelectedDirection] = useState<'yes'|'no'|null>(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [betStatus, setBetStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [manualSuccess, setManualSuccess] = useState(true); // manual override for success/failure
  const insets = useSafeAreaInsets ? useSafeAreaInsets() : { bottom: 24 };
  const statusScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function fetchMarket() {
      await getMarketById(id);
    }
    if (id) fetchMarket();
  }, [id]);

  // Animate status text when betStatus changes to success or error
  useEffect(() => {
    if (betStatus === 'success' || betStatus === 'error') {
      statusScale.setValue(0.8);
      Animated.sequence([
        Animated.timing(statusScale, {
          toValue: 1.15,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(statusScale, {
          toValue: 1.0,
          friction: 4,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [betStatus]);

  const reelAnimations = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  const handleBet = async (bet: string) => {
    if (!selectedAccount || !selectedAccount.publicKey) {
      toast.error("Please connect your wallet");
      return;
    }
    setBetStatus('loading');
    try {
      const metadata = {
        question: selectedMarket?.question,
        collection: false,
        startTime: selectedMarket?.marketStart,
        endTime: selectedMarket?.marketEnd,
        amount: parseFloat(betAmount),
        direction: bet === "yes" ? WinningDirection.YES : WinningDirection.NO,
      };
      const response = await axios.post(
        "http://192.168.1.20:8001/nft/create",
        metadata,
        {
          headers: {
            "wallet-address": selectedAccount.publicKey.toBase58(),
          },
        }
      );
      const metadataUri = response.data.metadataUrl;
      if (!metadataUri || !selectedMarket) {
        setBetStatus('error');
        return;
      }
      const buyIxs = await openPosition({
        marketId: parseInt(selectedMarket.marketId),
        direction: bet === "yes" ? { yes: {} } : { no: {} },
        amount: parseFloat(betAmount),
        mint: getMint("USDC", "devnet"),
        token: getMint("USDC", "devnet").toBase58(),
        payer: selectedAccount.publicKey,
        feeVaultAccount: new PublicKey(
          process.env.EXPO_PUBLIC_FEE_VAULT || "DrBmuCCXHoug2K9dS2DCoBBwzj3Utoo9FcXbDcjgPRQx"
        ),
        usdcMintAddress: new PublicKey(
          process.env.EXPO_PUBLIC_USDC_MINT || ""
        ),
        metadataUri: metadataUri,
      });
      if (typeof buyIxs === "string" || !buyIxs) {
        setBetStatus('error');
        return;
      }
      const signature = await createAndSendTx(buyIxs.ixs, true, undefined, {
        addressLookupTableAccounts: buyIxs.addressLookupTableAccounts,
      });
      setBetStatus('success');
    } catch (error) {
      setBetStatus('error');
    }
  };

  useEffect(() => {
    startSlotMachine();
  }, []);

  const startSlotMachine = () => {
    DUMMY_API_RESPONSE.forEach((result, index) => {
      setTimeout(() => {
        animateReelToIcon(reelAnimations[index], result);
      }, index * 500);
    });
  };

  const animateReelToIcon = (animatedValue: Animated.Value, result: string) => {
    const indexInLoop = REEL_ITEMS.findIndex((item) => item === result);
    const totalSpins = 3;
    const finalPosition =
      (REEL_ITEMS.length * totalSpins + indexInLoop) * REEL_HEIGHT;

    Animated.timing(animatedValue, {
      toValue: finalPosition,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  };

  const renderReel = (animatedValue: Animated.Value, key: number) => (
    <View style={styles.reelWrapper} key={key}>
      <Text style={styles.reelLabel}>Model {key + 1}</Text>
      <View style={styles.reelContainer}>
        <Animated.View
          style={{
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, REEL_HEIGHT * REEL_ITEMS.length * 5],
                  outputRange: [0, -REEL_HEIGHT * REEL_ITEMS.length * 5],
                }),
              },
            ],
          }}
        >
          {Array(5)
            .fill(null)
            .map((_, loopIndex) =>
              REEL_ITEMS.map((icon, iconIndex) => (
                <View
                  key={`${loopIndex}-${iconIndex}`}
                  style={styles.reelItem}
                >
                  <Text style={styles.reelIcon}>
                    {icons[icon as keyof typeof icons]}
                  </Text>
                </View>
              ))
            )}
        </Animated.View>
      </View>
    </View>
  );

  useEffect(() => {
    if (betStatus === 'success' || betStatus === 'error') {
      const timeout = setTimeout(() => {
        setBetStatus('idle');
        setBetAmount("");
        setSelectedDirection(null);
        navigation.goBack();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [betStatus]);

  return (
    <ScreenWrapper>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonText}>View All Markets</Text>
          </TouchableOpacity>

          {loadingMarket && (
            <View style={styles.centered}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}

          {shortxError && (
            <MaterialCard variant="filled" style={styles.errorCard}>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorMessage}>{shortxError.message}</Text>
            </MaterialCard>
          )}

          {!loadingMarket && !shortxError && !selectedMarket && (
            <MaterialCard variant="filled" style={styles.errorCard}>
              <Text style={styles.errorMessage}>No market found.</Text>
            </MaterialCard>
          )}

          {!loadingMarket && !shortxError && selectedMarket && (
            <>
              {/* Single Swipeable Card with all info */}
              <View style={{ alignItems: 'center', marginVertical: 24 }}>
                <SwipeableBetCard
                  market={selectedMarket}
                  onSelect={(dir) => {
                    setSelectedDirection(dir);
                    setShowBetModal(true);
                  }}
                />
              </View>
              {/* Slot Machine, Aggregated outcome, etc. can go here if desired */}
            </>
          )}
        </ScrollView>
        {/* Bet Modal (restyled) */}
        <Modal
          visible={showBetModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowBetModal(false)}
        >
          <View style={styles.betModalOverlay}>
            <View style={styles.betModalCard}>
              <Text style={styles.betModalDirection}>
                {selectedDirection === 'yes' ? "You're betting YES" : "You're betting NO"}
              </Text>
              <Text style={styles.betModalLabelBig}>How much do you want to bet?</Text>
              <DynamicTextInput
                value={betAmount}
                onChangeText={setBetAmount}
                placeholder="0"
              />
              <View style={styles.suggestedRowBig}>
                {SUGGESTED_BETS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.suggestedButtonBig,
                      betAmount === amt.toString() && styles.suggestedButtonBigSelected
                    ]}
                    onPress={() => setBetAmount(amt.toString())}
                    activeOpacity={0.85}
                  >
                    <Text style={betAmount === amt.toString() ? styles.suggestedButtonTextBigSelected : styles.suggestedButtonTextBig}>
                      ${amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Manual success/failure toggle */}
              <View style={styles.manualToggleRow}>
                <Text style={styles.manualToggleLabel}>Simulate Success</Text>
                <Switch
                  value={manualSuccess}
                  onValueChange={setManualSuccess}
                  thumbColor={manualSuccess ? theme.colors.success : theme.colors.error}
                  trackColor={{ true: theme.colors.success + '55', false: theme.colors.error + '55' }}
                />
                <Text style={styles.manualToggleLabel}>Simulate Failure</Text>
              </View>
              <TouchableOpacity
                style={styles.placeBetButtonBig}
                onPress={async () => {
                  setShowBetModal(false); // Close modal immediately
                  setBetStatus('loading');
                  setTimeout(() => {
                    setBetStatus(manualSuccess ? 'success' : 'error');
                  }, 1200);
                }}
                disabled={!betAmount || betStatus === 'loading'}
              >
                <Text style={styles.placeBetButtonTextBig}>Place Bet</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowBetModal(false)} style={{ marginTop: 12 }}>
                <Text style={{ color: theme.colors.primary, textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Full-screen Bet Status Overlay */}
        {betStatus !== 'idle' && (
          <View style={styles.fullScreenStatusOverlay} pointerEvents="auto">
            {betStatus === 'loading' && (
              <View style={styles.betStatusCard}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.betStatusText}>Placing Bet…</Text>
              </View>
            )}
            {betStatus === 'success' && (
              <Animated.Text
                style={[
                  styles.fullScreenStatusText,
                  { color: theme.colors.success, transform: [{ scale: statusScale }] }
                ]}
              >
                BET PLACED
              </Animated.Text>
            )}
            {betStatus === 'error' && (
              <Animated.Text
                style={[
                  styles.fullScreenStatusText,
                  { color: theme.colors.error, transform: [{ scale: statusScale }] }
                ]}
              >
                ERROR, bet not placed
              </Animated.Text>
            )}
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.lg,
    backgroundColor: 'transparent',
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    maxWidth: 120,
  },
  backButtonText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
  },
  loadingText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '500',
  },
  errorCard: {
    marginVertical: 18,
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorTitle: {
    color: theme.colors.error,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    color: theme.colors.onSurface,
    fontSize: 16,
    textAlign: 'center',
  },
  marketInfoCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  marketInfoHeader: {
    marginBottom: 4,
    flex: 1,
    alignItems: 'flex-end',
  },
  marketInfoDate: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  marketInfoQuestion: {
    color: theme.colors.onSurface,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Poppins-Bold',
  },
  marketInfoMeta: {
    marginTop: 2,
    gap: 2,
  },
  marketInfoMetaLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  marketInfoMetaValue: {
    color: theme.colors.onSurface,
    fontWeight: '500',
    fontFamily: 'Poppins-Bold',
  },
  slotMachineCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  slotMachineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: 8,
  },
  reelWrapper: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  reelLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginBottom: 4,
  },
  reelContainer: {
    width: 100,
    height: 100,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
  },
  reelItem: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelIcon: {
    fontSize: 48,
    textAlign: 'center',
  },
  aggregatedCard: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 14,
  },
  aggregatedText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'Poppins-Regular',
  },
  inputCard: {
    marginBottom: theme.spacing.lg,
    padding: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  betButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 18,
    marginHorizontal: 4,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    elevation: 2,
  },
  yesButton: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: '#10b981',
  },
  noButton: {
    backgroundColor: 'rgba(244,63,94,0.18)',
    borderColor: '#f43f5e',
  },
  betButtonText: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  fixedBetBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingBottom: 0,
  },
  fixedBetCard: {
    width: '100%',
    alignSelf: 'center',
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: theme.colors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
    minHeight: 90,
    justifyContent: 'center',
  },
  betLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  compactInput: {
    height: 60,
    minHeight: 40,
    maxHeight: 60,
    borderRadius: 12,
    fontSize: 32,
    paddingVertical: 0,
    marginVertical: 0,
  },
  suggestedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
    gap: 6,
  },
  suggestedButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  swipeCard: {
    width: '90%',
    height: 150,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  swipeCardInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  swipeCardQuestion: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  swipeOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  swipeYes: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  swipeNo: {
    backgroundColor: 'rgba(244,63,94,0.2)',
  },
  swipeYesText: {
    color: '#10b981',
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  swipeNoText: {
    color: '#ef4444',
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  swipeInstruction: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  swipeCardMeta: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  swipeCardMetaValue: {
    color: theme.colors.onSurface,
    fontWeight: '500',
    fontFamily: 'Poppins-Bold',
  },
  betModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  betModalCard: {
    width: '90%',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  betModalDirection: {
    color: theme.colors.onSurface,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: 'Poppins-Bold',
  },
  betModalLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    fontFamily: 'Poppins-Regular',
  },
  betModalLabelBig: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: 'Poppins-Bold',
  },
  suggestedRowBig: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
    gap: 6,
  },
  suggestedButtonBig: {
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedButtonBigSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  suggestedButtonTextBig: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  suggestedButtonTextBigSelected: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  placeBetButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeBetButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  placeBetButtonBig: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeBetButtonTextBig: {
    color: theme.colors.onPrimary,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  betStatusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  },
  fullScreenStatusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.82)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenStatusText: {
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.2,
    fontFamily: 'Poppins-Bold',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  betStatusCard: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  betStatusText: {
    color: theme.colors.onSurface,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    fontFamily: 'Poppins-Bold',
  },
  manualToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    width: '100%',
  },
  manualToggleLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins-Regular',
  },
});

export default SlotMachineScreen;
