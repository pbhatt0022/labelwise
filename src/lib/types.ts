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

export type AllergyOption = "Milk" | "Gluten" | "Nuts" | "Soy" | "Eggs" | "Shellfish";
export type HealthOption = "Diabetes" | "High BP" | "Cholesterol";
export type DietOption = "Vegan" | "Vegetarian" | "Low Sodium" | "Keto";
export type SensitivityOption = "MSG" | "Artificial Sweeteners" | "Preservatives";

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
}

export interface ScanDraft {
  productName: string;
  brandName: string;
  ingredientText: string;
  imageName?: string;
  imagePreviewUrl?: string;
  ocrStatus?: OcrStatus;
  ocrText?: string;
  ocrConfidence?: number;
  ocrError?: string;
  ocrSourceImageName?: string;
}

export interface ScanRecord {
  id: string;
  userId: string;
  productName: string;
  brandName?: string;
  ingredientText: string;
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
