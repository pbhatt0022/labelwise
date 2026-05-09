import { describe, expect, it } from "vitest";

import {
  analyzeIngredients,
  applyCustomAvoids,
  createCustomAvoid,
  getActiveConcernTags,
  getConcernIdsForLegacySelections,
  normalizeForMatch,
  resolveIngredientMatches,
} from "@/lib/analysis";
import type { UserProfile } from "@/lib/types";

const profile: UserProfile = {
  allergies: ["Soy"],
  health: ["Diabetes", "Cholesterol"],
  diet: ["Vegan"],
  sensitivities: ["MSG", "Preservatives", "Coloring", "Emulsifiers"],
  selectedConcernIds: ["soy_allergy", "diabetes_watch", "cholesterol_watch", "vegan", "avoid_msg", "avoid_preservatives", "avoid_coloring", "avoid_emulsifiers"],
  customAvoids: [],
};

const vegetarianProfile: UserProfile = {
  allergies: [],
  health: [],
  diet: ["Vegetarian"],
  sensitivities: [],
  selectedConcernIds: ["vegetarian"],
  customAvoids: [],
};

const lowSodiumProfile: UserProfile = {
  allergies: [],
  health: [],
  diet: ["Low Sodium"],
  sensitivities: [],
  selectedConcernIds: ["low_sodium_watch"],
  customAvoids: [],
};

const ketoProfile: UserProfile = {
  allergies: [],
  health: [],
  diet: ["Keto"],
  sensitivities: [],
  selectedConcernIds: ["keto_watch"],
  customAvoids: [],
};

const glutenProfile: UserProfile = {
  allergies: ["Gluten"],
  health: [],
  diet: [],
  sensitivities: [],
  selectedConcernIds: ["gluten_allergy"],
  customAvoids: [],
};

const milkProfile: UserProfile = {
  allergies: ["Milk"],
  health: [],
  diet: [],
  sensitivities: [],
  selectedConcernIds: ["milk_allergy"],
  customAvoids: [],
};

describe("analysis utilities", () => {
  it("normalizes technical ingredient text for matching", () => {
    expect(normalizeForMatch("INS 433 (Polysorbate-80)")).toBe("ins 433 polysorbate 80");
  });

  it("maps legacy profile selections into scalable concern ids", () => {
    expect(
      getConcernIdsForLegacySelections({
        allergies: ["Soy"],
        health: ["Diabetes"],
        diet: ["Vegan"],
        sensitivities: ["MSG"],
      }),
    ).toEqual(expect.arrayContaining(["soy_allergy", "diabetes_watch", "vegan", "avoid_msg"]));
  });

  it("returns active concern ids from the saved profile", () => {
    expect(getActiveConcernTags(profile)).toEqual(
      expect.arrayContaining(["soy_allergy", "diabetes_watch", "cholesterol_watch", "vegan", "avoid_msg", "avoid_preservatives"]),
    );
  });

  it("maps new sensitivity selections into concern ids", () => {
    expect(
      getConcernIdsForLegacySelections({
        allergies: [],
        health: [],
        diet: [],
        sensitivities: ["Coloring", "Emulsifiers", "Industrial Fats", "Refined Fillers"],
      }),
    ).toEqual(expect.arrayContaining(["avoid_coloring", "avoid_emulsifiers", "avoid_industrial_fats", "avoid_refined_fillers"]));
  });

  it("resolves soy sauce and milk-style aliases from real ingredient text", () => {
    const resolved = resolveIngredientMatches(["soy sauce", "skimmed milk powder", "INS 433"]);

    expect(resolved.map((item) => item.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Soy Sauce", "Milk Powder", "Polysorbate 80"]),
    );
  });

  it("resolves newly added additive aliases and technical ingredients", () => {
    const resolved = resolveIngredientMatches(["steviol glycosides", "potassium bromate", "bvo", "brilliant blue"]);

    expect(resolved.map((item) => item.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Stevia", "Potassium Bromate", "Brominated Vegetable Oil", "Brilliant Blue"]),
    );
  });

  it("resolves additional Indian packaged-food ingredients and hidden names", () => {
    const resolved = resolveIngredientMatches(["groundnut", "invert sugar syrup", "ins 281", "caramel colour", "palm kernel oil"]);

    expect(resolved.map((item) => item.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Groundnut", "Invert Syrup", "Sodium Propionate", "Caramel Color", "Palm Kernel Oil"]),
    );
  });

  it("applies concern rules for allergy, health, and sensitivity cases", () => {
    const result = analyzeIngredients(
      "Soy sauce, maltodextrin, vegetable oil, yeast extract, sodium benzoate",
      profile,
    );

    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Soy Sauce", "Maltodextrin", "Vegetable Oil", "Yeast Extract", "Sodium Benzoate"]),
    );
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Soy Sauce")?.matchStrength).toBe("exact");
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Vegetable Oil")?.matchStrength).toBe("cautionary");
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Maltodextrin")?.tone).toBe("advisory");
  });

  it("flags newly added preservatives and sweeteners for existing concern profiles", () => {
    const result = analyzeIngredients("steviol glycosides, potassium bromate, guar gum, brilliant blue", profile);

    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Stevia", "Potassium Bromate", "Brilliant Blue"]),
    );
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Potassium Bromate")?.concernDisplayName).toBe("Avoid preservatives");
  });

  it("flags coloring and emulsifier sensitivities from visible additives", () => {
    const result = analyzeIngredients("tartrazine, polysorbate 80, carboxymethylcellulose, soy lecithin", profile);

    expect(result.flags.map((flag) => flag.concernDisplayName)).toEqual(
      expect.arrayContaining(["Avoid coloring", "Avoid emulsifiers"]),
    );
    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Tartrazine", "Polysorbate 80", "Carboxymethylcellulose", "Soy Lecithin"]),
    );
  });

  it("flags additional glycemic fillers and industrial fats for current watch settings", () => {
    const result = analyzeIngredients("invert sugar syrup, palm kernel oil, ins 281, caramel colour", profile);

    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Invert Syrup", "Palm Kernel Oil", "Sodium Propionate", "Caramel Color"]),
    );
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Invert Syrup")?.concernDisplayName).toBe("Blood sugar watch");
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Palm Kernel Oil")?.concernDisplayName).toBe("Cholesterol watch");
  });

  it("flags egg-derived ingredients for vegetarian preferences", () => {
    const result = analyzeIngredients("cocoa, sugar, egg whites, vanilla", vegetarianProfile);

    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(expect.arrayContaining(["Egg"]));
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Egg")?.concernDisplayName).toBe("Vegetarian");
  });

  it("flags common animal-derived diet ingredients more reliably", () => {
    const veganResult = analyzeIngredients("dates, honey, oats, shellac", profile);
    const vegetarianResult = analyzeIngredients("cheese culture, rennet, carmine", vegetarianProfile);

    expect(veganResult.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Honey", "Shellac"]),
    );
    expect(vegetarianResult.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Rennet", "Carmine"]),
    );
  });

  it("flags more common low-sodium watch ingredients", () => {
    const result = analyzeIngredients("soy sauce, monosodium glutamate, sodium benzoate", lowSodiumProfile);

    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Soy Sauce", "Monosodium Glutamate", "Sodium Benzoate"]),
    );
    expect(result.flags.some((flag) => flag.concernDisplayName === "Low sodium")).toBe(true);
  });

  it("flags more common keto watch ingredients and fillers", () => {
    const result = analyzeIngredients("sugar, tapioca starch, rice flour, oats", ketoProfile);

    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Sugar", "Tapioca Starch", "Rice Flour", "Oat Flour"]),
    );
    expect(result.flags.some((flag) => flag.concernDisplayName === "Keto")).toBe(true);
  });

  it("flags more gluten-related grains and review items", () => {
    const result = analyzeIngredients("spelt flour, rye, oats, food starch", glutenProfile);

    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Spelt", "Rye", "Oats", "Starch"]),
    );
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Oats")?.matchStrength).toBe("cautionary");
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Starch")?.matchStrength).toBe("cautionary");
  });

  it("flags more dairy-style ingredients for milk-related profiles", () => {
    const result = analyzeIngredients("cream, butter, whey, lactose", milkProfile);

    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Cream", "Butter", "Whey Protein Concentrate", "Lactose"]),
    );
  });

  it("surfaces vegan and vegetarian review ingredients more carefully", () => {
    const veganResult = analyzeIngredients("natural flavors, mono- and diglycerides, vitamin d3, enzymes", profile);
    const vegetarianResult = analyzeIngredients("fish sauce, lard, mono- and diglycerides", vegetarianProfile);

    expect(veganResult.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Natural Flavors", "Mono- and Diglycerides", "Vitamin D3", "Enzymes"]),
    );
    expect(veganResult.flags.find((flag) => flag.canonicalIngredientName === "Natural Flavors")?.matchStrength).toBe("cautionary");
    expect(vegetarianResult.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Anchovy", "Animal Fat", "Mono- and Diglycerides"]),
    );
  });

  it("surfaces multiple matches from the same concern group instead of collapsing them to one", () => {
    const result = analyzeIngredients("sodium benzoate, sodium propionate, caramel colour, brilliant blue", profile);

    const flaggedNames = result.flags.map((flag) => flag.canonicalIngredientName);

    expect(flaggedNames).toEqual(
      expect.arrayContaining(["Sodium Benzoate", "Sodium Propionate", "Caramel Color", "Brilliant Blue"]),
    );
    expect(result.flags.filter((flag) => flag.concernId === "avoid_preservatives").length).toBeGreaterThan(1);
  });

  it("lets custom avoids match literal user-entered ingredients", () => {
    const customAvoid = createCustomAvoid("carrageenan");
    const flags = applyCustomAvoids(["water", "carrageenan", "salt"], [customAvoid]);

    expect(flags).toHaveLength(1);
    expect(flags[0].flagSource).toBe("custom_avoid");
    expect(flags[0].canonicalIngredientName).toBe("carrageenan");
  });
});
