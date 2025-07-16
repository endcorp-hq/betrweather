import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import MaterialCard from '../components/ui/MaterialCard';
import theme from '../theme';
import { useAuthorization } from "../utils/useAuthorization";
import Feather from 'react-native-vector-icons/Feather';

export default function AccountScreen() {
  const { selectedAccount } = useAuthorization();

  // Example placeholder for account data
  const balance = 1250.00;
  const stats = [
    { label: 'Bets Won', value: 12, color: theme.colors.success },
    { label: 'Active', value: 3, color: theme.colors.primary },
    { label: 'Win Rate', value: '67%', color: theme.colors.warning },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* App Bar/Header */}
      <View style={styles.appBar}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>JD</Text>
        </View>
        <Text style={styles.appBarTitle}>My Account</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Feather name="settings" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <MaterialCard elevation="level3" style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Portfolio Balance</Text>
          <Text style={styles.balanceValue}>${balance.toFixed(2)}</Text>
        </MaterialCard>
        <View style={styles.statsRow}>
          {stats.map((stat, idx) => (
            <MaterialCard key={idx} elevation="level2" style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </MaterialCard>
          ))}
        </View>
        {/* Add more MaterialCard-wrapped sections for bets, transactions, etc. as needed */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.surfaceContainerHigh,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    backgroundColor: 'transparent',
    paddingBottom: 32,
  },
  balanceCard: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  balanceLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  balanceValue: {
    color: theme.colors.onSurface,
    fontSize: 32,
    fontWeight: '300',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
});
