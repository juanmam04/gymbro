export type PartnerConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'ended';
export type RelationshipType = 'partner' | 'friend' | 'gym_bro' | 'other';
export type GoalType = 'eat_better' | 'lose_fat' | 'maintain' | 'build_muscle';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'edited';
export type MealItemSource = 'ai' | 'manual' | 'edited';
export type MealReactionType = 'heart' | 'fire' | 'strong' | 'yummy';
export type DevicePlatform = 'ios' | 'android' | 'web';
export type BiologicalSex = 'female' | 'male' | 'unspecified';
export type ActivityLevel = 'little' | 'some' | 'quite' | 'lots';
export type NutritionDisplayMode = 'simple' | 'detailed';
export type SharedMealInviteStatus = 'pending' | 'accepted' | 'declined';
export type ChallengeMetric = 'log_meals_days' | 'protein_goal_days' | 'water_goal_days';
export type ChallengeScope = 'personal' | 'joint';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  biological_sex: BiologicalSex | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  nutrition_display_mode: NutritionDisplayMode;
  water_goal_ml: number;
  share_meals: boolean;
  share_calories: boolean;
  share_macros: boolean;
  share_goals: boolean;
  share_weight: boolean;
  notif_social: boolean;
  notif_reminders: boolean;
  notif_progress: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerInvite {
  id: string;
  inviter_id: string;
  code: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
}

export interface PartnerConnection {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: PartnerConnectionStatus;
  relationship_type: RelationshipType;
  invite_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionGoals {
  user_id: string;
  calories_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  goal_type: GoalType;
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  image_url: string | null;
  meal_type: MealType;
  eaten_at: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  scan_status: ScanStatus;
  notes: string | null;
  shared_with_partner: boolean;
  shared_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealItem {
  id: string;
  meal_id: string;
  food_name: string;
  quantity: number;
  unit: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number | null;
  source: MealItemSource;
  created_at: string;
}

export interface MealReaction {
  id: string;
  meal_id: string;
  user_id: string;
  reaction: MealReactionType;
  created_at: string;
}

export interface MealComment {
  id: string;
  meal_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: DevicePlatform;
  updated_at: string;
}

export interface SavedMeal {
  id: string;
  user_id: string;
  name: string;
  meal_type: MealType;
  image_url: string | null;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
  updated_at: string;
  saved_meal_items?: SavedMealItem[];
}

export interface SavedMealItem {
  id: string;
  saved_meal_id: string;
  food_name: string;
  quantity: number;
  unit: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

export interface SharedMealInvite {
  id: string;
  source_meal_id: string;
  sender_id: string;
  recipient_id: string;
  status: SharedMealInviteStatus;
  resulting_meal_id: string | null;
  created_at: string;
  responded_at: string | null;
  source_meal?: Meal;
  sender?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
}

export interface WaterEntry {
  id: string;
  user_id: string;
  amount_ml: number;
  consumed_at: string;
  created_at: string;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  measured_at: string;
  created_at: string;
}

export interface WeeklyChallenge {
  id: string;
  created_by: string;
  partner_id: string | null;
  scope: ChallengeScope;
  metric: ChallengeMetric;
  target_days: number;
  week_start: string;
  title: string;
  created_at: string;
}

export interface MealWithDetails extends Meal {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'share_calories' | 'share_macros'>;
  meal_items: MealItem[];
  meal_reactions: MealReaction[];
  meal_comments?: MealComment[];
  comments_count?: number;
}

export interface DailyNutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface PrivacyFlags {
  share_meals: boolean;
  share_calories: boolean;
  share_macros: boolean;
  share_goals: boolean;
  share_weight: boolean;
}
