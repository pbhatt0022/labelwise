import { describe, expect, it } from "vitest";

import { cleanIngredientOcrText, cleanNutritionOcrText, mergeIngredientCandidateTexts, normalizeGeminiNutritionFacts } from "@/lib/ocr";

describe("OCR cleanup", () => {
  it("merges broken ingredient line splits into a cleaner draft", () => {
    const cleaned = cleanIngredientOcrText(`Milk Protein Isolate, Whey P
rotein Isolate, Corn Starch, Psylliu
m Husk, Natural Flavo
urs, Paprika Extra
ct, Sunflower Lecithin.`);

    expect(cleaned).toContain("Whey Protein Isolate");
    expect(cleaned).toContain("Psyllium Husk");
    expect(cleaned).toContain("Natural Flavours");
    expect(cleaned).toContain("Paprika Extract");
    expect(cleaned).toContain("Sunflower Lecithin.");
  });

  it("repairs obvious merged ingredient fragments from messy label OCR", () => {
    const cleaned = cleanIngredientOcrText(
      "ilk Protein Isolate, Whey Per Oil, Corn Starch, Psylliuato Powder, Onion Powderral Flavours, Paprika extract, Sunflower Lecithin.",
    );

    expect(cleaned).toContain("Milk Protein Isolate");
    expect(cleaned).toContain("Corn Starch");
    expect(cleaned).toContain("Psyllium, Tomato Powder");
    expect(cleaned).toContain("Onion Powder, Natural Flavours");
    expect(cleaned).toContain("Paprika Extract");
  });

  it("repairs condensed-font ingredient phrases from a clean crop", () => {
    const cleaned = cleanIngredientOcrText(
      "Milk Protein Isolate, Whey Pier Qil, Corn Starch, Psylliulato Powder, Onion Powder, Natural Flavours, Paprika extract, Sunflower Lecithin.",
    );

    expect(cleaned).toContain("Milk Protein Isolate");
    expect(cleaned).toContain("Whey Protein Isolate");
    expect(cleaned).toContain("Psyllium, Tomato Powder");
    expect(cleaned).toContain("Natural Flavours");
    expect(cleaned).toContain("Paprika Extract");
  });

  it("merges ingredient candidates from multiple OCR passes to keep extra segments", () => {
    const merged = mergeIngredientCandidateTexts([
      "Milk Protein Isolate, Whey Protein Concentrate, Sunflower Oil, Corn Starch",
      "Corn Starch, Psyllium Husk, Salt, Tomato Powder, Onion Powder",
      "Natural Flavours, Paprika Extract, Mustard Seed Oil, Yeast Extract, Sunflower Lecithin",
    ]);

    expect(merged).toContain("Milk Protein Isolate");
    expect(merged).toContain("Whey Protein Concentrate");
    expect(merged).toContain("Psyllium Husk");
    expect(merged).toContain("Salt");
    expect(merged).toContain("Mustard Seed Oil");
    expect(merged).toContain("Sunflower Lecithin");
  });

  it("normalizes nutrition OCR spacing before parsing", () => {
    const cleaned = cleanNutritionOcrText(`Amount   Per
Serving
Sodium
340mg
Per   100 g
1062mg`);

    expect(cleaned).toContain("Amount Per Serving");
    expect(cleaned).toContain("Sodium 340mg");
    expect(cleaned).toContain("Per 100g");
    expect(cleaned).toContain("1062mg");
  });

  it("normalizes Gemini nutrition extraction into editable facts", () => {
    const normalized = normalizeGeminiNutritionFacts({
      servingSize: "20g",
      caloriesPerServing: 114.68,
      sugarG: 6.2,
      addedSugarG: 3.96,
      proteinG: 1.52,
      totalFatG: 8.6,
      saturatedFatG: 6.42,
      sodiumMg: 4.2,
      carbohydratesG: 7.8,
      fiberG: null,
    });

    expect(normalized).toMatchObject({
      servingSize: "20g",
      caloriesPerServing: 114.7,
      sugarG: 6.2,
      addedSugarG: 4,
      proteinG: 1.5,
      totalFatG: 8.6,
      saturatedFatG: 6.4,
      sodiumMg: 4.2,
      carbohydratesG: 7.8,
    });
  });
});
