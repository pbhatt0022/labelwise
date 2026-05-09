import { analyzeIngredients } from "@/lib/analysis";
import { analyzeDietCompatibility } from "@/lib/dietCompatibility";
import { analyzeNutritionFacts, buildStructuredExplanation, normalizeNutritionFacts } from "@/lib/nutrition";
import type { AnalysisResult, NutritionFacts, UserProfile } from "@/lib/types";

export function analyzeLabel(params: {
  ingredientText: string;
  profile: UserProfile;
  nutritionFacts?: NutritionFacts;
}): AnalysisResult {
  const { ingredientText, profile, nutritionFacts } = params;
  const ingredientAnalysis = analyzeIngredients(ingredientText, profile);
  const dietCompatibility = analyzeDietCompatibility(ingredientText, profile);
  const normalizedNutritionFacts = normalizeNutritionFacts(nutritionFacts);
  const nutritionFindings = analyzeNutritionFacts(normalizedNutritionFacts, profile);
  const explanation = buildStructuredExplanation({
    flags: ingredientAnalysis.flags,
    nutritionFindings,
    nutritionFacts: normalizedNutritionFacts,
  });

  return {
    ...ingredientAnalysis,
    dietCompatibility: dietCompatibility.length > 0 ? dietCompatibility : undefined,
    nutritionFacts: normalizedNutritionFacts,
    nutritionFindings: nutritionFindings.length > 0 ? nutritionFindings : undefined,
    explanation,
  };
}
