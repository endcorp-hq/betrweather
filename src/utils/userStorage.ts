import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  wallet: string;
  totalBets: number;
  betsWon: number;
  betsLost: number;
  totalBetAmountUSDC: number;
  totalBetAmountSol: number;
  totalBetAmountBonk: number;
  totalWonAmountUSDC: number;
  totalWonAmountSol: number;
  totalWonAmountBonk: number;
  streak: number;
  winRate: string;
}

export async function storeUserData(user: User): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
}

export async function getUserData(): Promise<User | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
  return data ? JSON.parse(data) : null;
}

export async function clearUserData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
}
