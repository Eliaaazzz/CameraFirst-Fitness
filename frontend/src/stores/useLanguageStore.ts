/**
 * Zustand Language Store
 *
 * Centralized language state management for AuraFitness.
 * Supports English and Chinese translations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// Storage key
const LANGUAGE_KEY = 'aura_language';

export type Language = 'en' | 'zh';

// Translation keys
export interface Translations {
  // Common
  home: string;
  workouts: string;
  recipes: string;
  profile: string;
  search: string;
  cancel: string;
  save: string;
  edit: string;
  delete: string;
  loading: string;
  retry: string;
  error: string;

  // Dashboard
  goodDay: string;
  todaysNutrition: string;
  todaysMeals: string;
  mealsLogged: string;
  mealLogged: string;
  snapYourMeal: string;
  aiAnalyzeNutrition: string;
  uploadPhotoToStart: string;
  yourGoal: string;
  setYourGoals: string;
  getPersonalizedTargets: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  kcal: string;
  ofGoal: string;

  // Right Panel
  quickActions: string;
  mealHistory: string;
  weeklyInsights: string;
  logWeight: string;
  exportData: string;
  hydration: string;
  stayHydrated: string;
  cups: string;

  // Workouts
  workoutsTitle: string;
  workoutsSubtitle: string;
  recommendedForYou: string;
  searchWorkouts: string;
  searchResults: string;
  noWorkoutsFound: string;

  // Recipes
  recipesTitle: string;
  recipesSubtitle: string;
  searchRecipes: string;
  noRecipesFound: string;
  popularSearches: string;

  // Profile
  profileTitle: string;
  settings: string;
  logout: string;

  // Goals
  fatLoss: string;
  buildMuscle: string;
  glucoseControl: string;

  // Status
  overLimit: string;

  // Language
  language: string;
  english: string;
  chinese: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Common
    home: 'Home',
    workouts: 'Workouts',
    recipes: 'Recipes',
    profile: 'Profile',
    search: 'Search',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    loading: 'Loading...',
    retry: 'Retry',
    error: 'Error',

    // Dashboard
    goodDay: 'Good day,',
    todaysNutrition: "Today's Nutrition",
    todaysMeals: "Today's Meals",
    mealsLogged: 'meals logged',
    mealLogged: 'meal logged',
    snapYourMeal: 'Snap Your Meal',
    aiAnalyzeNutrition: 'AI will analyze nutrition instantly',
    uploadPhotoToStart: 'Upload a photo to get started',
    yourGoal: 'Your Goal',
    setYourGoals: 'Set Your Goals',
    getPersonalizedTargets: 'Get personalized targets',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    kcal: 'kcal',
    ofGoal: 'of goal',

    // Right Panel
    quickActions: 'QUICK ACTIONS',
    mealHistory: 'Meal History',
    weeklyInsights: 'Weekly Insights',
    logWeight: 'Log Weight',
    exportData: 'Export Weight Data',
    hydration: 'HYDRATION',
    stayHydrated: 'Stay hydrated',
    cups: 'cups',

    // Workouts
    workoutsTitle: 'Workouts',
    workoutsSubtitle: 'Recommended routines and your saved list.',
    recommendedForYou: 'Recommended for you',
    searchWorkouts: 'Search workouts...',
    searchResults: 'Search Results',
    noWorkoutsFound: 'No workouts found for',

    // Recipes
    recipesTitle: 'Recipes',
    recipesSubtitle: 'Healthy meals and your saved list.',
    searchRecipes: 'Search recipes...',
    noRecipesFound: 'No recipes found for',
    popularSearches: 'Popular searches',

    // Profile
    profileTitle: 'Profile',
    settings: 'Settings',
    logout: 'Log out',

    // Goals
    fatLoss: 'Fat Loss',
    buildMuscle: 'Build Muscle',
    glucoseControl: 'Nutrition Balance',

    // Status
    overLimit: 'Over limit',

    // Language
    language: 'Language',
    english: 'English',
    chinese: '中文',
  },
  zh: {
    // Common
    home: '首页',
    workouts: '训练',
    recipes: '食谱',
    profile: '我的',
    search: '搜索',
    cancel: '取消',
    save: '保存',
    edit: '编辑',
    delete: '删除',
    loading: '加载中...',
    retry: '重试',
    error: '错误',

    // Dashboard
    goodDay: '你好，',
    todaysNutrition: '今日营养',
    todaysMeals: '今日饮食',
    mealsLogged: '餐已记录',
    mealLogged: '餐已记录',
    snapYourMeal: '拍照记录',
    aiAnalyzeNutrition: 'AI将立即分析营养成分',
    uploadPhotoToStart: '上传照片开始记录',
    yourGoal: '我的目标',
    setYourGoals: '设定目标',
    getPersonalizedTargets: '获取个性化目标',
    calories: '卡路里',
    protein: '蛋白质',
    carbs: '碳水',
    fat: '脂肪',
    kcal: '千卡',
    ofGoal: '已完成',

    // Right Panel
    quickActions: '快捷操作',
    mealHistory: '饮食记录',
    weeklyInsights: '周报分析',
    logWeight: '记录体重',
    exportData: '导出体重数据',
    hydration: '饮水',
    stayHydrated: '保持水分',
    cups: '杯',

    // Workouts
    workoutsTitle: '训练',
    workoutsSubtitle: '推荐课程和已保存列表。',
    recommendedForYou: '为你推荐',
    searchWorkouts: '搜索训练...',
    searchResults: '搜索结果',
    noWorkoutsFound: '未找到相关训练',

    // Recipes
    recipesTitle: '食谱',
    recipesSubtitle: '健康食谱和已保存列表。',
    searchRecipes: '搜索食谱...',
    noRecipesFound: '未找到相关食谱',
    popularSearches: '热门搜索',

    // Profile
    profileTitle: '我的',
    settings: '设置',
    logout: '退出登录',

    // Goals
    fatLoss: '减脂',
    buildMuscle: '增肌',
    glucoseControl: '营养平衡',

    // Status
    overLimit: '已超标',

    // Language
    language: '语言',
    english: 'English',
    chinese: '中文',
  },
};

interface LanguageState {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
  loadLanguage: () => Promise<void>;
  toggleLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  t: translations.en,

  setLanguage: async (lang: Language) => {
    set({ language: lang, t: translations[lang] });
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    } catch (error) {
      console.warn('[LanguageStore] Failed to persist language:', error);
    }
  },

  loadLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (saved && (saved === 'en' || saved === 'zh')) {
        set({ language: saved, t: translations[saved] });
      }
    } catch (error) {
      console.warn('[LanguageStore] Failed to load language:', error);
    }
  },

  toggleLanguage: async () => {
    const current = get().language;
    const newLang = current === 'en' ? 'zh' : 'en';
    await get().setLanguage(newLang);
  },
}));

// Export for convenience
export const getTranslations = () => useLanguageStore.getState().t;
export const getLanguage = () => useLanguageStore.getState().language;
