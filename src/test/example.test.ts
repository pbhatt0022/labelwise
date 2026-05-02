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
  sensitivities: ["MSG", "Preservatives"],
  selectedConcernIds: ["soy_allergy", "diabetes_watch", "cholesterol_watch", "vegan", "avoid_msg", "avoid_preservatives"],
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

  it("flags additional glycemic fillers and industrial fats for current watch settings", () => {
    const result = analyzeIngredients("invert sugar syrup, palm kernel oil, ins 281, caramel colour", profile);

    expect(result.flags.map((flag) => flag.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Invert Syrup", "Palm Kernel Oil", "Sodium Propionate", "Caramel Color"]),
    );
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Invert Syrup")?.concernDisplayName).toBe("Blood sugar watch");
    expect(result.flags.find((flag) => flag.canonicalIngredientName === "Palm Kernel Oil")?.concernDisplayName).toBe("Cholesterol watch");
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
