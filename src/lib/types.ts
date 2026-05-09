export type RiskLevel = "low" | "moderate" | "high";
export type MatchStrength = "exact" | "likely" | "cautionary";
export type ConcernType = "allergy" | "diet" | "sensitivity" | "health";
export type ConcernTone = "strong" | "medium" | "advisory";
export type MatchMode = "contains" | "exact";
export type RuleTargetType = "ingredient" | "group";
export type FlagSource = "built_in_concern" | "custom_avoid";
export type OcrStatus = "idle" | "extracting" | "success" | "error";
export type BehaviorGoal = "avoid" | "double_check" | "compare_alternatives" | "save_safe";
export type ReflectionChoice = "yes" | "maybe" | "no";
export type NutritionFindingTone = "matched_preference" | "worth_reviewing" | "good_to_know";
export type DietCrossCheckTone = "good_to_know" | "worth_reviewing";
export type DietCompatibilityStatus = "compatible" | "not_compatible" | "needs_review" | "unknown";

export type AllergyOption = "Milk" | "Gluten" | "Nuts" | "Soy" | "Eggs" | "Shellfish";
export type HealthOption = "Diabetes" | "High BP" | "Cholesterol";
export type DietOption = "Vegan" | "Vegetarian" | "Low Sodium" | "Keto" | "Gluten-free" | "Dairy-free" | "Nut-free";
export type SensitivityOption =
  | "MSG"
  | "Artificial Sweeteners"
  | "Preservatives"
  | "Coloring"
  | "Emulsifiers"
  | "Industrial Fats"
  | "Refined Fillers";
export type DietCompatibilityPreference = Extract<DietOption, "Vegan" | "Vegetarian" | "Keto" | "Gluten-free" | "Dairy-free" | "Nut-free">;

export interface UserCustomAvoid {
  id: string;
  label: string;
  rawTerm: string;
  normalizedTerm: string;
  matchMode: MatchMode;
  notes?: string;
}

export interface UserProfile {
  allergies: AllergyOption[];
  health: HealthOption[];
  diet: DietOption[];
  sensitivities: SensitivityOption[];
  selectedConcernIds: string[];
  customAvoids: UserCustomAvoid[];
  dailySugarPreferenceG?: number;
  dailySodiumPreferenceMg?: number;
  dailySaturatedFatPreferenceG?: number;
}

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  authProvider?: "local" | "supabase";
}

export interface ScanFolder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  sortIndex?: number;
}

export interface ReflectionEntry {
  id: string;
  userId: string;
  scanId: string;
  purchaseIntent?: ReflectionChoice;
  clarity?: ReflectionChoice;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientEntity {
  id: string;
  displayName: string;
  category: string;
  aliases: string[];
  codes: string[];
  groupIds: string[];
  defaultSeverity: RiskLevel;
  notes?: string;
}

export interface IngredientGroup {
  id: string;
  displayName: string;
  description: string;
}

export interface ConcernDefinition {
  id: string;
  displayName: string;
  type: ConcernType;
  tone: ConcernTone;
  description: string;
}

export interface ConcernRule {
  id: string;
  concernId: string;
  targetType: RuleTargetType;
  targetId: string;
  matchStrength: MatchStrength;
  reason: string;
  displayExplanation: string;
  category?: string;
  severityOverride?: RiskLevel;
  suggestion?: string;
  cautionMessage?: string;
}

export interface ResolvedIngredientMatch {
  ingredientId: string;
  matchedText: string;
  matchedAlias: string;
  canonicalIngredientName: string;
  groupIds: string[];
  matchStrength: MatchStrength;
  category: string;
  risk: RiskLevel;
}

export interface MatchedFlag {
  ruleId: string;
  canonicalName: string;
  ingredient: string;
  matchedAlias: string;
  matchedText: string;
  category: string;
  risk: RiskLevel;
  explanation: string;
  whyItMatters: string;
  suggestion?: string;
  profileReasons: string[];
  concernTags: string[];
  cautionary?: boolean;
  matchStrength: MatchStrength;
  tone: ConcernTone;
  flagSource: FlagSource;
  concernId: string;
  concernDisplayName: string;
  canonicalIngredientId: string;
  canonicalIngredientName: string;
  reason: string;
  cautionMessage?: string;
  plainLanguageMeaning?: string;
  literacyTip?: string;
  behaviorGoal?: BehaviorGoal;
  nudgeMessage?: string;
}

export interface AnalysisResult {
  normalizedIngredients: string[];
  flags: MatchedFlag[];
  overallRisk: RiskLevel;
  matchedConcernTags: string[];
  nutritionFacts?: NutritionFacts;
  nutritionFindings?: NutritionFinding[];
  dietCrossChecks?: DietCrossCheck[];
  dietCompatibility?: DietCompatibilityResult[];
  explanation?: StructuredExplanation;
}

export interface NutritionFacts {
  servingSize?: string;
  caloriesPerServing?: number;
  sugarG?: number;
  addedSugarG?: number;
  proteinG?: number;
  totalFatG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
  fiberG?: number;
  carbohydratesG?: number;
}

export interface NutritionFinding {
  id: string;
  nutrientKey: keyof Omit<NutritionFacts, "servingSize">;
  label: string;
  tone: NutritionFindingTone;
  value: number;
  unit: string;
  preferenceValue?: number;
  summary: string;
  detail: string;
}

export interface DietCrossCheck {
  diet: DietOption;
  tone: DietCrossCheckTone;
  headline: string;
  summary: string;
  evidence: string[];
  provider?: "gemini";
}

export interface DietCompatibilityMatch {
  preference: DietCompatibilityPreference | "Custom avoids";
  status: Exclude<DietCompatibilityStatus, "compatible" | "unknown">;
  canonicalIngredientName: string;
  matchedTerm: string;
  reason: string;
  sourceCategory: string;
  sourceType: "curated_rule" | "custom_avoid";
}

export interface DietCompatibilityResult {
  preference: DietCompatibilityPreference | "Custom avoids";
  status: DietCompatibilityStatus;
  matchedConcerns: DietCompatibilityMatch[];
  reviewItems: DietCompatibilityMatch[];
  summary: string;
}

export interface StructuredExplanation {
  mode: "template" | "llm";
  provider?: "gemini";
  headline: string;
  summary: string;
  bullets: string[];
}

export interface ScanDraft {
  productName: string;
  brandName: string;
  ingredientText: string;
  includeNutritionDetails?: boolean;
  nutritionFacts?: NutritionFacts;
  imageName?: string;
  imagePreviewUrl?: string;
  ocrStatus?: OcrStatus;
  ocrText?: string;
  ocrConfidence?: number;
  ocrError?: string;
  ocrSourceImageName?: string;
  nutritionImageName?: string;
  nutritionImagePreviewUrl?: string;
  nutritionOcrStatus?: OcrStatus;
  nutritionOcrText?: string;
  nutritionOcrConfidence?: number;
  nutritionOcrError?: string;
  nutritionOcrSourceImageName?: string;
}

export interface ScanRecord {
  id: string;
  userId: string;
  productName: string;
  brandName?: string;
  ingredientText: string;
  nutritionFacts?: NutritionFacts;
  imageName?: string;
  createdAt: string;
  ocrText?: string;
  ocrConfidence?: number;
  ocrSource?: "camera" | "upload";
  ocrStatusAtSave?: OcrStatus;
  analysis: AnalysisResult;
  profileSnapshot: UserProfile;
  folderId?: string;
  isFavorite: boolean;
  userNote?: string;
}
