import { describe, expect, it } from "vitest";

import { analyzeDietCompatibility } from "@/lib/dietCompatibility";
import type { UserProfile } from "@/lib/types";

const baseProfile: UserProfile = {
  allergies: [],
  health: [],
  diet: [],
  sensitivities: [],
  selectedConcernIds: [],
  customAvoids: [],
};

describe("diet compatibility engine", () => {
  it("flags vegan and dairy-free incompatibilities from visible dairy ingredients", () => {
    const result = analyzeDietCompatibility("cocoa solids, whey protein isolate, milk powder, sugar", {
      ...baseProfile,
      diet: ["Vegan", "Dairy-free"],
    });

    expect(result.find((item) => item.preference === "Vegan")?.status).toBe("not_compatible");
    expect(result.find((item) => item.preference === "Dairy-free")?.matchedConcerns.map((match) => match.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Whey", "Milk"]),
    );
  });

  it("flags vegetarian incompatibilities for gelatin and rennet", () => {
    const result = analyzeDietCompatibility("milk solids, gelatin, rennet, cocoa", {
      ...baseProfile,
      diet: ["Vegetarian"],
    });

    const vegetarian = result.find((item) => item.preference === "Vegetarian");
    expect(vegetarian?.status).toBe("not_compatible");
    expect(vegetarian?.matchedConcerns.map((match) => match.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Gelatin", "Rennet"]),
    );
  });

  it("flags keto-style incompatibilities for sugar and refined carb fillers", () => {
    const result = analyzeDietCompatibility("sugar, maltodextrin, refined wheat flour, rice flour", {
      ...baseProfile,
      diet: ["Keto"],
    });

    const keto = result.find((item) => item.preference === "Keto");
    expect(keto?.status).toBe("not_compatible");
    expect(keto?.matchedConcerns.map((match) => match.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Sugar", "Starchy Fillers", "Wheat"]),
    );
  });

  it("flags gluten-free incompatibilities and review items", () => {
    const result = analyzeDietCompatibility("barley malt, oats, food starch", {
      ...baseProfile,
      diet: ["Gluten-free"],
    });

    const glutenFree = result.find((item) => item.preference === "Gluten-free");
    expect(glutenFree?.status).toBe("not_compatible");
    expect(glutenFree?.matchedConcerns.map((match) => match.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Barley or Malt"]),
    );
    expect(glutenFree?.reviewItems.map((match) => match.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Oats", "Generic Starch"]),
    );
  });

  it("flags nut-free incompatibilities and custom avoids", () => {
    const result = analyzeDietCompatibility("roasted makhana, peanut butter, cocoa", {
      ...baseProfile,
      diet: ["Nut-free"],
      customAvoids: [
        {
          id: "avoid-cocoa",
          label: "cocoa",
          rawTerm: "cocoa",
          normalizedTerm: "cocoa",
          matchMode: "exact",
        },
      ],
    });

    expect(result.find((item) => item.preference === "Nut-free")?.status).toBe("not_compatible");
    expect(result.find((item) => item.preference === "Custom avoids")?.matchedConcerns[0]?.canonicalIngredientName).toBe("cocoa");
  });

  it("marks ambiguous vegan ingredients as needs review", () => {
    const result = analyzeDietCompatibility("natural flavors, enzymes, vitamin d3", {
      ...baseProfile,
      diet: ["Vegan"],
    });

    const vegan = result.find((item) => item.preference === "Vegan");
    expect(vegan?.status).toBe("needs_review");
    expect(vegan?.reviewItems.map((match) => match.canonicalIngredientName)).toEqual(
      expect.arrayContaining(["Natural Flavors", "Enzymes", "Vitamin D3"]),
    );
  });
});
