import React from 'react';
import { View } from 'react-native';
export const profile = {
  display_name: 'Juan Manuel Martínez',
  nutrition_display_mode: 'detailed',
  water_goal_ml: 2500,
};
export const goals = {
  goal_type: 'build_muscle',
  calories_target: 2820,
  protein_target: 160,
  carbs_target: 347,
  fat_target: 88,
};
export const useAuth = () => ({
  user: { id: 'test-user' },
  profile,
  goals,
  partner: null,
  refreshBootstrap: async () => {},
  signOut: async () => {},
});
export const useSubscription = () => ({
  data: { plan: 'free', remaining: 3, limit: 3 },
  isLoading: false,
});
export const useFeedRealtime = () => {};
export const router = {
  push: (path) => {
    window.dispatchEvent(new CustomEvent('route', { detail: path }));
  },
};
export const SafeAreaView = View;
export const Ionicons = () => null;
export const Image = ({ source, ...props }) => <img src={source?.uri} {...props} />;
let water = 0;
export const fetchTodayWaterMl = async () => water;
export const addWaterEntry = async (_id, amount) => {
  water += amount;
  return { amount_ml: amount };
};
export const fetchFeed = async () => [];
export const fetchMealsSince = async () => [];
export const fetchPendingSharedInvites = async () => [];
export const fetchTodayTotals = async () => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
export const fetchWeekDailyTotals = async (_id, n = 7) =>
  Array.from({ length: n }, (_, i) => ({
    date: new Date(Date.now() - (n - i - 1) * 86400000).toISOString().slice(0, 10),
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  }));
export const removeReaction = async () => {};
export const upsertReaction = async () => {};
export const uploadAvatar = async () => '';
export const updateProfile = async () => {};
export const getNutritionGoals = async () => goals;
export const fetchWaterSince = async () => [];
export const waterByDayMap = () => new Map();
export const fetchLatestWeight = async () => null;
export const fetchWeightHistory = async () => [];
export const requestMediaLibraryPermissionsAsync = async () => ({ granted: false });
