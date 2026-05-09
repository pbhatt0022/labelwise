import { describe, expect, it } from "vitest";

import { normalizeProfile } from "@/lib/analysis";
import { analyzeLabel } from "@/lib/labelAnalysis";
import { analyzeNutritionFacts, parseNutritionFactsFromText } from "@/lib/nutrition";
import type { NutritionFacts, UserProfile } from "@/lib/types";

const baseProfile: UserProfile = {
  allergies: ["Soy"],
  health: ["Diabetes"],
  diet: [],
  sensitivities: [],
  selectedConcernIds: ["soy_allergy", "diabetes_watch"],
  customAvoids: [],
  dailySugarPreferenceG: 10,
  dailySodiumPreferenceMg: 400,
  dailySaturatedFatPreferenceG: 4,
};

describe("nutrition analysis", () => {
  it("marks values within the user's saved preferences", () => {
    const findings = analyzeNutritionFacts(
      {
        servingSize: "30g",
        sugarG: 8,
        sodiumMg: 300,
        saturatedFatG: 2,
      },
      baseProfile,
    );

    expect(findings.find((finding) => finding.nutrientKey === "sugarG")?.tone).toBe("matched_preference");
    expect(findings.find((finding) => finding.nutrientKey === "sodiumMg")?.tone).toBe("matched_preference");
    expect(findings.find((finding) => finding.nutrientKey === "saturatedFatG")?.tone).toBe("matched_preference");
  });

  it("marks values above the user's saved preferences", () => {
    const findings = analyzeNutritionFacts(
      {
        servingSize: "30g",
        sugarG: 12,
        sodiumMg: 520,
        saturatedFatG: 5,
      },
      baseProfile,
    );

    expect(findings.find((finding) => finding.nutrientKey === "sugarG")?.tone).toBe("worth_reviewing");
    expect(findings.find((finding) => finding.nutrientKey === "sodiumMg")?.tone).toBe("worth_reviewing");
    expect(findings.find((finding) => finding.nutrientKey === "saturatedFatG")?.tone).toBe("worth_reviewing");
  });

  it("falls back to factual context when no preference is set", () => {
    const findings = analyzeNutritionFacts(
      {
        servingSize: "40g",
        sugarG: 7,
        proteinG: 6,
      },
      {
        ...baseProfile,
        dailySugarPreferenceG: undefined,
        dailySodiumPreferenceMg: undefined,
        dailySaturatedFatPreferenceG: undefined,
      },
    );

    expect(findings.find((finding) => finding.nutrientKey === "sugarG")?.tone).toBe("good_to_know");
    expect(findings.find((finding) => finding.nutrientKey === "proteinG")?.summary).toContain("Protein is one part");
  });

  it("returns no findings when nutrition fields are missing", () => {
    expect(analyzeNutritionFacts(undefined, baseProfile)).toEqual([]);
    expect(analyzeNutritionFacts({ servingSize: "1 cup" }, baseProfile)).toEqual([]);
  });
});

describe("nutrition OCR parsing", () => {
  it("prefills nutrition facts from a dedicated label image OCR result", () => {
    const result = parseNutritionFactsFromText(`
      Serving size: 30 g
      Energy 120 kcal
      Total sugars 12 g
      Added sugars 10 g
      Protein 5 g
      Sodium 180 mg
    `);

    expect(result.facts).toMatchObject({
      servingSize: "30 g",
      caloriesPerServing: 120,
      sugarG: 12,
      addedSugarG: 10,
      proteinG: 5,
      sodiumMg: 180,
    });
    expect(result.matchedFields).toContain("servingSize");
    expect(result.warnings).toEqual([]);
  });

  it("chooses the likely per-serving values from multi-column table OCR text", () => {
    const result = parseNutritionFactsFromText(`
      Serving size 30g
      Energy 400 kcal 120 kcal
      Protein 10 g 3 g
      Total fat 12 g 3.6 g Saturated fat 4 g 1.2 g
      Sodium 500 mg 150 mg
    `);

    expect(result.facts).toMatchObject({
      caloriesPerServing: 120,
      proteinG: 3,
      totalFatG: 3.6,
      saturatedFatG: 1.2,
      sodiumMg: 150,
    });
  });

  it("handles split OCR rows and converts grams to milligrams when needed", () => {
    const result = parseNutritionFactsFromText(`
      Serving size
      35 g
      Sodium
      0.4 g
      Dietary fibre
      5 g
    `);

    expect(result.facts).toMatchObject({
      servingSize: "35 g",
      sodiumMg: 400,
      fiberG: 5,
    });
    expect(result.warnings).toEqual([]);
  });

  it("prefers the first numeric column when the table labels amount per serving before per 100g", () => {
    const result = parseNutritionFactsFromText(`
      NUTRITION INFORMATION
      Serving Size: 1 Bag (32g)
      Servings Per Container: 1
      Amount Per Serving Per 100g
      Energy (kJ) 543kJ / 130 Cal 1697kJ / 406 Cal
      Total Fat 3.5g 11g
      Saturated Fat 0g 0g
      Sodium 340mg 1062mg
      Total Carbohydrate 4g 12.5g
      Dietary Fibre 1g 3g
      Sugars 0g 0g
      Protein 21g 66g
    `);

    expect(result.facts).toMatchObject({
      servingSize: "1 Bag (32g)",
      caloriesPerServing: 130,
      totalFatG: 3.5,
      saturatedFatG: 0,
      sodiumMg: 340,
      carbohydratesG: 4,
      fiberG: 1,
      sugarG: 0,
      proteinG: 21,
    });
  });

  it("prefers the middle numeric column when the table shows per 100g, per serving, then %RDA", () => {
    const result = parseNutritionFactsFromText(`
      Nutritional information (Approx.)
      Per 100g Per serving (20g) % RDA (Per serving)
      Energy (kCal) 573.40 114.68 5.73
      Protein (g) 7.60 1.52
      Carbohydrates(g) 39.00 7.80
      Total Sugars (g) 31.00 6.20
      Added Sugars (g) 19.80 3.96 7.92
      Total Fat (g) 43.00 8.60 12.84
      Saturated fat (g) 32.10 6.42
      Sodium (mg) 21.00 4.20
      Serving size - 20g
    `);

    expect(result.facts).toMatchObject({
      servingSize: "20g",
      caloriesPerServing: 114.7,
      proteinG: 1.5,
      carbohydratesG: 7.8,
      sugarG: 6.2,
      addedSugarG: 4,
      totalFatG: 8.6,
      saturatedFatG: 6.4,
      sodiumMg: 4.2,
    });
  });

  it("parses a mixed label block when ingredients and a per-100g / per-serving table appear together", () => {
    const result = parseNutritionFactsFromText(`
      Thoughtful
      Ingredients:
      Single Origin Dominican Dark Couverture(72%), Sugar, Cocoa Butter, Soy Lecithin & Vanilla bean.
      Allergen information: Contains Milk Solids and Treenuts
      Nutritional information (Approx.)
      Per 100g Per serving (20g) % RDA (Per serving)
      Energy (kCal) 573.40 114.68 5.73
      Protein (g) 7.60 1.52 -
      Carbohydrates(g) 39.00 7.80 -
      Total Sugars (g) 31.00 6.20 -
      Added Sugars (g) 19.80 3.96 7.92
      Total Fat (g) 43.00 8.60 12.84
      Saturated fat (g) 32.10 6.42 -
      Cholesterol (mg) 0.00 0.00 0.00
      Sodium (mg) 21.00 4.20 -
      Serving size - 20g
      Total serving per pack - 3.5
    `);

    expect(result.facts).toMatchObject({
      servingSize: "20g",
      caloriesPerServing: 114.7,
      proteinG: 1.5,
      carbohydratesG: 7.8,
      sugarG: 6.2,
      addedSugarG: 4,
      totalFatG: 8.6,
      saturatedFatG: 6.4,
      sodiumMg: 4.2,
    });
  });
});

describe("label analysis paths", () => {
  it("supports an ingredient-only analysis path", () => {
    const result = analyzeLabel({
      ingredientText: "Soy sauce, maltodextrin, vegetable oil",
      profile: baseProfile,
    });

    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.nutritionFacts).toBeUndefined();
  });

  it("supports ingredient analysis plus manual nutrition entry", () => {
    const result = analyzeLabel({
      ingredientText: "Soy sauce, maltodextrin, vegetable oil",
      profile: baseProfile,
      nutritionFacts: {
        servingSize: "30g",
        sugarG: 12,
        sodiumMg: 500,
      },
    });

    expect(result.nutritionFacts?.servingSize).toBe("30g");
    expect(result.nutritionFindings?.some((finding) => finding.nutrientKey === "sugarG")).toBe(true);
    expect(result.explanation?.summary).toContain("per-serving nutrition context");
  });

  it("supports ingredient analysis plus nutrition context together", () => {
    const result = analyzeLabel({
      ingredientText: "Oats, whey protein isolate, sugar, palm oil, salt",
      profile: baseProfile,
      nutritionFacts: {
        servingSize: "40g",
        sugarG: 12,
        proteinG: 11,
        sodiumMg: 210,
        saturatedFatG: 2,
      },
    });

    expect(result.explanation?.headline).toBeTruthy();
    expect(result.nutritionFindings?.length).toBeGreaterThan(0);
  });
});

describe("profile normalization", () => {
  it("loads legacy profiles without nutrition preferences", () => {
    const normalized = normalizeProfile({
      allergies: [],
      health: [],
      diet: [],
      sensitivities: [],
      selectedConcernIds: [],
      customAvoids: [],
    } as UserProfile);

    expect(normalized.dailySugarPreferenceG).toBeUndefined();
    expect(normalized.dailySodiumPreferenceMg).toBeUndefined();
    expect(normalized.dailySaturatedFatPreferenceG).toBeUndefined();
  });
});
