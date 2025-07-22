import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface StatusFilterBarProps {
  selected: string;
  onSelect: (status: string) => void;
}

const statusOptions = [
  {
    key: 'betting',
    label: 'Betting',
    icon: 'gavel',
    description: 'Open for bets',
    color: '#10b981', // Green
  },
  {
    key: 'active',
    label: 'Active',
    icon: 'play-circle',
    description: 'In progress',
    color: '#3b82f6', // Blue
  },
  {
    key: 'resolved',
    label: 'Resolved',
    icon: 'check-circle',
    description: 'Complete',
    color: '#8b5cf6', // Purple
  },
];

export function StatusFilterBar({ selected, onSelect }: StatusFilterBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Market Status</Text>
      <View style={styles.filterContainer}>
        {statusOptions.map((option) => {
          const isSelected = selected === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterCard,
                isSelected && styles.selectedCard,
                { borderColor: isSelected ? option.color : 'rgba(255, 255, 255, 0.2)' }
              ]}
              onPress={() => onSelect(option.key)}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconTitleRow}>
                  <MaterialCommunityIcons
                    name={option.icon as any}
                    size={20}
                    color={isSelected ? option.color : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <Text style={[
                    styles.label,
                    isSelected && { color: option.color }
                  ]}>
                    {option.label}
                  </Text>
                </View>
                <Text style={styles.description}>
                  {option.description}
                </Text>
              </View>
              {isSelected && (
                <View style={[styles.selectedIndicator, { backgroundColor: option.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    width: '100%',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
    minHeight: 70,
  },
  selectedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
  },
  cardContent: {
    flex: 1,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 0,
    borderBottomWidth: 12,
    borderTopWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'currentColor',
    borderTopColor: 'transparent',
  },
}); 