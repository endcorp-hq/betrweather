// import React, { useState } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
// import theme from '../theme';

// const WEATHER_MODELS = [
//   'WXMv3',
//   'NEMSGLOBAL',
//   'GEM15',
//   'MFFR',
// ];

// const PLACE_LABELS = ['1st Place', '2nd Place', '3rd Place'];

// export default function LeaderboardScreen() {
//   const [selections, setSelections] = useState<(string | null)[]>([null, null, null]);

//   const handleSelect = (placeIdx: number, model: string) => {
//     // Prevent duplicate selection
//     const newSelections = [...selections];
//     // Remove model from other places
//     for (let i = 0; i < newSelections.length; i++) {
//       if (newSelections[i] === model) newSelections[i] = null;
//     }
//     newSelections[placeIdx] = model;
//     setSelections(newSelections);
//   };

//   const handleSubmit = () => {
//     // Placeholder for submit logic
//     alert('Bet submitted! (not implemented)');
//   };

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.title}>Leaderboard Bets</Text>
//       <Text style={styles.subtitle}>Select which models you think will place 1st, 2nd, and 3rd this week.</Text>
//       {PLACE_LABELS.map((label, placeIdx) => (
//         <View key={label} style={styles.placeSection}>
//           <Text style={styles.placeLabel}>{label}</Text>
//           <View style={styles.modelRow}>
//             {WEATHER_MODELS.map((model) => (
//               <TouchableOpacity
//                 key={model}
//                 style={[
//                   styles.modelButton,
//                   selections[placeIdx] === model && styles.modelButtonSelected,
//                   selections.includes(model) && selections[placeIdx] !== model && styles.modelButtonDisabled,
//                 ]}
//                 onPress={() => handleSelect(placeIdx, model)}
//                 disabled={selections.includes(model) && selections[placeIdx] !== model}
//                 activeOpacity={0.85}
//               >
//                 <Text style={styles.modelButtonText}>{model}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>
//       ))}
//       <TouchableOpacity
//         style={[
//           styles.submitButton,
//           selections.every((s) => s) ? null : styles.submitButtonDisabled,
//         ]}
//         onPress={handleSubmit}
//         disabled={!selections.every((s) => s)}
//         activeOpacity={0.85}
//       >
//         <Text style={styles.submitButtonText}>Submit Bet</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 24,
//     alignItems: 'center',
//     backgroundColor: 'transparent',
//     flexGrow: 1,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: theme.colors.onSurface,
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   subtitle: {
//     fontSize: 16,
//     color: theme.colors.onSurfaceVariant,
//     marginBottom: 24,
//     textAlign: 'center',
//   },
//   placeSection: {
//     marginBottom: 24,
//     width: '100%',
//   },
//   placeLabel: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: theme.colors.primary,
//     marginBottom: 8,
//   },
//   modelRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   modelButton: {
//     paddingVertical: 12,
//     paddingHorizontal: 18,
//     borderRadius: 12,
//     backgroundColor: theme.colors.surfaceContainer,
//     marginHorizontal: 4,
//     marginBottom: 4,
//     borderWidth: 1,
//     borderColor: theme.colors.outlineVariant,
//   },
//   modelButtonSelected: {
//     backgroundColor: theme.colors.primary,
//     borderColor: theme.colors.primary,
//   },
//   modelButtonDisabled: {
//     opacity: 0.45,
//   },
//   modelButtonText: {
//     color: theme.colors.onSurface,
//     fontWeight: '500',
//     fontSize: 16,
//   },
//   submitButton: {
//     marginTop: 32,
//     backgroundColor: theme.colors.primary,
//     borderRadius: 16,
//     paddingVertical: 16,
//     paddingHorizontal: 48,
//   },
//   submitButtonDisabled: {
//     backgroundColor: theme.colors.surfaceContainer,
//     opacity: 0.5,
//   },
//   submitButtonText: {
//     color: theme.colors.onPrimary,
//     fontWeight: '700',
//     fontSize: 18,
//     textAlign: 'center',
//   },
// }); 