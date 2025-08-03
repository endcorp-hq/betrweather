import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { MotiView } from 'moti';

interface StatusFilterBarProps {
  selected: string;
  onSelect: (status: string) => void;
}

const statusOptions = [
  {
    key: 'betting',
    label: 'Predict',
    icon: 'gavel',
    description: 'Betting open',
    color: '#10b981', // Green
  },
  {
    key: 'active',
    label: 'Observing',
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
        {statusOptions.map((option, index) => {
          const isSelected = selected === option.key;
          return (
            <MotiView
              key={option.key}
              from={{
                opacity: 0,
                scale: 0.9,
                translateY: 10,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                translateY: 0,
              }}
              transition={{
                type: 'timing',
                duration: 350,
                delay: index * 50,
              }}
            >
              <TouchableOpacity
                onPress={() => onSelect(option.key)}
                activeOpacity={0.8}
                className='flex-1 min-h-[70px]'
              >
                <MotiView
                  animate={{
                    borderColor: isSelected ? option.color : 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    borderWidth: isSelected ? 1 : 1,
                  }}
                  transition={{
                    type: 'timing',
                    duration: 300,
                  }}
                  style={[
                    styles.filterCard,
                  ]}
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
                    <MotiView
                      from={{
                        opacity: 0,
                        scale: 0,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      transition={{
                        type: 'spring',
                        damping: 15,
                        stiffness: 150,
                      }}
                      style={[styles.selectedIndicator, { backgroundColor: option.color }]}
                    />
                  )}
                </MotiView>
              </TouchableOpacity>
            </MotiView>
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
    paddingBottom: 64
  },
  filterCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    position: 'relative',
    minHeight: 70,
  },
  cardContent: {
    flex: 1,
    paddingRight: 16,
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
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderBottomWidth: 8,
    borderTopWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'currentColor',
    borderTopColor: 'transparent',
  },
}); 