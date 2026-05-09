import type { ScanDraft } from "@/lib/types";

export const demoScanExamples: Array<{
  id: string;
  title: string;
  subtitle: string;
  draft: Pick<ScanDraft, "productName" | "brandName" | "ingredientText" | "nutritionFacts">;
}> = [
  {
    id: "protein-crunch-cereal",
    title: "High protein cereal",
    subtitle: "Shows how a protein-forward cereal can still carry sugar and sodium context.",
    draft: {
      productName: "Choco Crunch Protein Granola",
      brandName: "Kellogg's",
      ingredientText: "Whole grain oats, sugar, whey protein isolate, cocoa solids, palm oil, natural flavors, iodised salt.",
      nutritionFacts: {
        servingSize: "40g",
        caloriesPerServing: 180,
        sugarG: 12,
        addedSugarG: 10,
        proteinG: 11,
        totalFatG: 5,
        saturatedFatG: 2,
        sodiumMg: 210,
        fiberG: 4,
        carbohydratesG: 24,
      },
    },
  },
  {
    id: "no-added-sugar-bites",
    title: "No added sugar bites",
    subtitle: "Shows how ingredient and nutrition context can still matter in a lower-sugar-style snack.",
    draft: {
      productName: "Oat & Date Cocoa Bites",
      brandName: "Eat Natural",
      ingredientText: "Oats, dates paste, maltodextrin, cocoa powder, sorbitol, palm oil, natural flavors, salt.",
      nutritionFacts: {
        servingSize: "30g",
        caloriesPerServing: 130,
        sugarG: 8,
        addedSugarG: 0,
        proteinG: 3,
        totalFatG: 6,
        saturatedFatG: 2.5,
        sodiumMg: 120,
        fiberG: 2,
        carbohydratesG: 21,
      },
    },
  },
  {
    id: "vegan-review-bar",
    title: "Vegan review example",
    subtitle: "Shows how whey and milk powder trigger a facts-first vegan compatibility check.",
    draft: {
      productName: "Dark Chocolate Almond Protein Bar",
      brandName: "RiteBite Max Protein",
      ingredientText: "Dates, cocoa solids, whey protein isolate, milk powder, almond pieces, natural flavors.",
    },
  },
  {
    id: "keto-review-crackers",
    title: "Low-carb review example",
    subtitle: "Shows sugar, maltodextrin, and refined flour in a keto-style compatibility check.",
    draft: {
      productName: "Multigrain Herb Crackers",
      brandName: "Britannia NutriChoice",
      ingredientText: "Refined wheat flour, maltodextrin, sugar, tapioca starch, seasoning, palm oil.",
    },
  },
];
