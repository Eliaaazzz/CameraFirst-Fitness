export type EquipmentType = 'bodyweight' | 'dumbbells' | 'bands' | 'kettlebell' | 'machine' | 'other';

export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';

export interface WorkoutCard {
  id: string;
  title: string;
  youtubeId?: string;
  durationMinutes: number;
  level: WorkoutLevel;
  equipment: EquipmentType[];
  bodyPart?: string[];
  thumbnailUrl?: string;
  channelTitle?: string;
  viewCount?: number;
  lastValidatedAt?: string;
}

export interface RecipeCard {
  id: string;
  title: string;
  imageUrl?: string;
  timeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  calories?: number;
  nutritionSummary?: Record<string, number | string>;
  tags?: string[];
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  savedWorkoutIds: string[];
  savedRecipeIds: string[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  timestamp?: string;
}

export interface UploadWorkoutPayload {
  equipment?: string[];
  level?: WorkoutLevel;
  durationMinutes?: number;
}

export interface UploadRecipePayload {
  ingredients?: string[];
}
