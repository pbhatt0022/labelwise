import type { DietCompatibilityPreference } from "@/lib/types";

export interface DietRuleEffect {
  status: "not_compatible" | "needs_review";
  reason: string;
}

export interface DietRuleDefinition {
  id: string;
  canonicalIngredientName: string;
  aliases: string[];
  sourceCategory: string;
  compatibility: Partial<Record<DietCompatibilityPreference, DietRuleEffect>>;
}

export const supportedDietCompatibilityPreferences: DietCompatibilityPreference[] = [
  "Vegan",
  "Vegetarian",
  "Keto",
  "Gluten-free",
  "Dairy-free",
  "Nut-free",
];

export const dietRules: DietRuleDefinition[] = [
  {
    id: "milk",
    canonicalIngredientName: "Milk",
    aliases: [
      "milk", "milk solids", "dairy solids", "milk powder", "skimmed milk powder", "whole milk powder",
      "milk protein isolate", "milk protein concentrate", "lactalbumin", "lactoglobulin",
      "condensed milk", "evaporated milk", "skimmed milk", "skim milk",
      "yogurt", "yoghurt", "curd", "buttermilk",
    ],
    sourceCategory: "Dairy",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Milk-derived ingredients do not fit a vegan preference." },
      "Dairy-free": { status: "not_compatible", reason: "Milk-derived ingredients do not fit a dairy-free preference." },
    },
  },
  {
    id: "cheese",
    canonicalIngredientName: "Cheese",
    aliases: [
      "cheese", "cheddar", "mozzarella", "parmesan", "ricotta", "brie", "gouda", "emmental",
      "cream cheese", "processed cheese", "cheese powder", "paneer",
    ],
    sourceCategory: "Dairy",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Cheese and paneer are dairy-derived." },
      "Dairy-free": { status: "not_compatible", reason: "Cheese and paneer are dairy-derived." },
    },
  },
  {
    id: "whey",
    canonicalIngredientName: "Whey",
    aliases: ["whey", "whey protein", "whey protein concentrate", "whey protein isolate"],
    sourceCategory: "Dairy",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Whey is dairy-derived." },
      "Dairy-free": { status: "not_compatible", reason: "Whey is dairy-derived." },
    },
  },
  {
    id: "casein",
    canonicalIngredientName: "Casein",
    aliases: ["casein", "caseinate", "calcium caseinate", "sodium caseinate"],
    sourceCategory: "Dairy",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Casein is milk-derived." },
      "Dairy-free": { status: "not_compatible", reason: "Casein is milk-derived." },
    },
  },
  {
    id: "lactose",
    canonicalIngredientName: "Lactose",
    aliases: ["lactose"],
    sourceCategory: "Dairy",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Lactose is milk-derived." },
      "Dairy-free": { status: "not_compatible", reason: "Lactose is milk-derived." },
    },
  },
  {
    id: "cream-butter",
    canonicalIngredientName: "Cream or Butter",
    aliases: ["cream", "fresh cream", "milk cream", "double cream", "sour cream", "whipping cream", "clotted cream", "crème fraîche", "butter", "butter oil", "butterfat", "ghee", "milk fat"],
    sourceCategory: "Dairy",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Cream, butter, and ghee are dairy-derived." },
      "Dairy-free": { status: "not_compatible", reason: "Cream, butter, and ghee are dairy-derived." },
    },
  },
  {
    id: "egg",
    canonicalIngredientName: "Egg",
    aliases: ["egg", "egg white", "egg whites", "egg yolk", "egg yolks", "dried egg white", "egg powder"],
    sourceCategory: "Egg",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Egg ingredients do not fit a vegan preference." },
      Vegetarian: { status: "not_compatible", reason: "This app currently treats vegetarian as egg-free for label checks." },
    },
  },
  {
    id: "albumen",
    canonicalIngredientName: "Albumen",
    aliases: ["albumen", "ovalbumin"],
    sourceCategory: "Egg",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Albumen is egg-derived." },
      Vegetarian: { status: "not_compatible", reason: "Albumen is egg-derived." },
    },
  },
  {
    id: "gelatin",
    canonicalIngredientName: "Gelatin",
    aliases: ["gelatin", "gelatine"],
    sourceCategory: "Animal-derived",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Gelatin is animal-derived." },
      Vegetarian: { status: "not_compatible", reason: "Gelatin is animal-derived." },
    },
  },
  {
    id: "rennet",
    canonicalIngredientName: "Rennet",
    aliases: ["rennet", "animal rennet"],
    sourceCategory: "Animal-derived",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Rennet may be animal-derived." },
      Vegetarian: { status: "not_compatible", reason: "Animal rennet may not fit a vegetarian preference." },
    },
  },
  {
    id: "fish-oil",
    canonicalIngredientName: "Fish Oil",
    aliases: ["fish oil", "cod liver oil", "salmon oil", "anchovy oil"],
    sourceCategory: "Fish-derived",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Fish oil is animal-derived." },
      Vegetarian: { status: "not_compatible", reason: "Fish oil may not fit a vegetarian preference." },
    },
  },
  {
    id: "fish-seafood",
    canonicalIngredientName: "Fish or Seafood",
    aliases: [
      "fish", "fish sauce", "fish extract", "fish protein", "fish powder", "fish meal",
      "anchovy", "anchovy paste",
      "salmon", "tuna", "sardine", "mackerel", "herring", "cod", "tilapia", "halibut", "trout", "bass",
      "shrimp", "prawn", "crab", "lobster", "scallop", "squid", "clam", "mussel", "oyster",
      "seafood", "crustacean",
    ],
    sourceCategory: "Fish/Seafood-derived",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Fish and seafood ingredients do not fit a vegan preference." },
      Vegetarian: { status: "not_compatible", reason: "Fish and seafood ingredients may not fit a vegetarian preference." },
    },
  },
  {
    id: "animal-fat",
    canonicalIngredientName: "Animal Fat",
    aliases: ["animal fat", "lard", "suet", "tallow", "beef fat", "chicken fat", "pork fat", "duck fat", "lamb fat"],
    sourceCategory: "Animal-derived",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Animal fats do not fit a vegan preference." },
      Vegetarian: { status: "not_compatible", reason: "Animal fats may not fit a vegetarian preference." },
    },
  },
  {
    id: "beef-extract",
    canonicalIngredientName: "Beef Extract",
    aliases: ["beef extract", "chicken extract", "meat extract", "broth powder"],
    sourceCategory: "Animal-derived",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Meat extracts do not fit a vegan preference." },
      Vegetarian: { status: "not_compatible", reason: "Meat extracts may not fit a vegetarian preference." },
    },
  },
  {
    id: "meat-poultry",
    canonicalIngredientName: "Meat / Poultry",
    aliases: [
      "chicken", "beef", "pork", "lamb", "turkey", "duck", "mutton", "veal", "goat", "venison", "bison",
      "poultry", "meat",
      "powdered chicken", "chicken powder", "dried chicken", "dehydrated chicken",
      "powdered beef", "beef powder", "dried beef",
      "chicken broth", "beef broth", "pork broth", "lamb broth",
      "chicken stock", "beef stock", "pork stock",
      "rendered chicken", "rendered beef", "rendered pork",
    ],
    sourceCategory: "Animal-derived",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Meat and poultry ingredients do not fit a vegan preference." },
      Vegetarian: { status: "not_compatible", reason: "Meat and poultry ingredients do not fit a vegetarian preference." },
    },
  },
  {
    id: "honey",
    canonicalIngredientName: "Honey",
    aliases: ["honey"],
    sourceCategory: "Animal-derived",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Honey does not fit a vegan preference." },
    },
  },
  {
    id: "shellac",
    canonicalIngredientName: "Shellac",
    aliases: ["shellac", "confectioner's glaze", "confectioners glaze", "ins 904"],
    sourceCategory: "Animal-derived additive",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Shellac is typically insect-derived." },
      Vegetarian: { status: "not_compatible", reason: "Shellac is typically insect-derived." },
    },
  },
  {
    id: "carmine",
    canonicalIngredientName: "Carmine",
    aliases: ["carmine", "cochineal", "cochineal extract", "ins 120"],
    sourceCategory: "Animal-derived additive",
    compatibility: {
      Vegan: { status: "not_compatible", reason: "Carmine is insect-derived." },
      Vegetarian: { status: "not_compatible", reason: "Carmine is insect-derived." },
    },
  },
  {
    id: "mono-diglycerides",
    canonicalIngredientName: "Mono- and Diglycerides",
    aliases: ["mono and diglycerides", "mono- and diglycerides", "monoglycerides", "diglycerides", "ins 471"],
    sourceCategory: "Ambiguous source emulsifier",
    compatibility: {
      Vegan: { status: "needs_review", reason: "Mono- and diglycerides can come from plant or animal sources." },
      Vegetarian: { status: "needs_review", reason: "Mono- and diglycerides can come from different sources." },
    },
  },
  {
    id: "vitamin-d3",
    canonicalIngredientName: "Vitamin D3",
    aliases: ["vitamin d3", "cholecalciferol"],
    sourceCategory: "Ambiguous source fortificant",
    compatibility: {
      Vegan: { status: "needs_review", reason: "Vitamin D3 source can vary by manufacturer." },
    },
  },
  {
    id: "enzymes",
    canonicalIngredientName: "Enzymes",
    aliases: ["enzyme", "enzymes"],
    sourceCategory: "Ambiguous source processing aid",
    compatibility: {
      Vegan: { status: "needs_review", reason: "Enzyme source is often not clear from the visible label." },
      Vegetarian: { status: "needs_review", reason: "Enzyme source is often not clear from the visible label." },
    },
  },
  {
    id: "natural-flavors",
    canonicalIngredientName: "Natural Flavors",
    aliases: ["natural flavor", "natural flavors", "natural flavour", "natural flavours"],
    sourceCategory: "Ambiguous source flavoring",
    compatibility: {
      Vegan: { status: "needs_review", reason: "Natural flavor source is not always clear from the label." },
    },
  },
  {
    id: "wheat",
    canonicalIngredientName: "Wheat",
    aliases: [
      "wheat", "wheat flour", "whole wheat flour", "refined wheat flour", "enriched wheat flour",
      "wheat starch", "wheat bran", "wheat germ", "wheat protein", "wheat berries",
      "maida", "atta", "bulgur", "kamut", "farro", "einkorn", "triticum",
    ],
    sourceCategory: "Gluten grain",
    compatibility: {
      "Gluten-free": { status: "not_compatible", reason: "Wheat is a gluten-containing grain." },
      Keto: { status: "not_compatible", reason: "Refined or wheat-based flour may not fit a low-carb or keto-style preference." },
    },
  },
  {
    id: "enriched-flour",
    canonicalIngredientName: "Enriched Flour",
    aliases: ["enriched flour", "flour"],
    sourceCategory: "Likely wheat-derived",
    compatibility: {
      "Gluten-free": { status: "needs_review", reason: "Enriched flour and unlabeled flour are almost always wheat-derived and typically contain gluten." },
      Keto: { status: "not_compatible", reason: "Enriched or plain flour is typically wheat-based and high in carbs." },
    },
  },
  {
    id: "barley-malt",
    canonicalIngredientName: "Barley or Malt",
    aliases: ["barley", "barley malt", "malt", "malt extract"],
    sourceCategory: "Gluten grain",
    compatibility: {
      "Gluten-free": { status: "not_compatible", reason: "Barley and malt are gluten-containing." },
    },
  },
  {
    id: "rye-spelt-durum",
    canonicalIngredientName: "Rye, Spelt, or Durum",
    aliases: ["rye", "rye flour", "spelt", "durum", "durum wheat", "semolina", "suji", "rava"],
    sourceCategory: "Gluten grain",
    compatibility: {
      "Gluten-free": { status: "not_compatible", reason: "These grains are not gluten-free." },
      Keto: { status: "not_compatible", reason: "These grain-based flours may not fit a low-carb or keto-style preference." },
    },
  },
  {
    id: "oats",
    canonicalIngredientName: "Oats",
    aliases: ["oats", "rolled oats", "oat flour", "oat bran"],
    sourceCategory: "Review grain",
    compatibility: {
      "Gluten-free": { status: "needs_review", reason: "Oats may need certification or cross-contact review." },
      Keto: { status: "not_compatible", reason: "Oat-heavy ingredients may not fit a low-carb or keto-style preference." },
    },
  },
  {
    id: "starch-generic",
    canonicalIngredientName: "Generic Starch",
    aliases: ["food starch", "modified starch", "modified food starch", "stabilized starch"],
    sourceCategory: "Ambiguous starch",
    compatibility: {
      "Gluten-free": { status: "needs_review", reason: "Generic starch wording does not always reveal the source." },
      Keto: { status: "needs_review", reason: "Generic starch wording may hide carb-heavy fillers." },
    },
  },
  {
    id: "sugar",
    canonicalIngredientName: "Sugar",
    aliases: ["sugar", "cane sugar", "brown sugar", "sucrose", "raw sugar", "icing sugar", "powdered sugar", "confectioners sugar"],
    sourceCategory: "Sugar",
    compatibility: {
      Keto: { status: "not_compatible", reason: "Sugars usually do not fit a low-carb or keto-style preference." },
    },
  },
  {
    id: "natural-sweeteners",
    canonicalIngredientName: "Natural High-Sugar Sweeteners",
    aliases: [
      "honey", "maple syrup", "agave", "agave syrup", "agave nectar",
      "dates", "date paste", "date syrup", "date sugar",
      "coconut sugar", "palm sugar", "jaggery", "molasses", "treacle",
      "fruit juice concentrate", "grape juice concentrate", "apple juice concentrate",
    ],
    sourceCategory: "Natural sugar",
    compatibility: {
      Keto: { status: "not_compatible", reason: "Natural sweeteners like honey, maple syrup, dates, and jaggery are high in sugar and may not fit a keto-style preference." },
    },
  },
  {
    id: "syrups",
    canonicalIngredientName: "Syrups",
    aliases: ["glucose syrup", "liquid glucose", "corn syrup", "corn syrup solids", "high fructose corn syrup", "hfcs", "invert sugar syrup", "invert syrup", "dextrose", "fructose"],
    sourceCategory: "Sugar syrup",
    compatibility: {
      Keto: { status: "not_compatible", reason: "Sugar syrups and fast sugars usually do not fit a low-carb or keto-style preference." },
    },
  },
  {
    id: "starchy-fillers",
    canonicalIngredientName: "Starchy Fillers",
    aliases: ["maltodextrin", "corn starch", "cornflour", "tapioca starch", "tapioca flour", "potato starch", "rice flour", "rice starch", "rice", "puffed rice"],
    sourceCategory: "Refined carb",
    compatibility: {
      Keto: { status: "not_compatible", reason: "Refined starches and rice-based fillers may not fit a low-carb or keto-style preference." },
    },
  },
  {
    id: "sugar-alcohols",
    canonicalIngredientName: "Sugar Alcohols",
    aliases: ["sorbitol", "xylitol", "erythritol", "maltitol", "isomalt"],
    sourceCategory: "Sweetener review",
    compatibility: {
      Keto: { status: "needs_review", reason: "Sugar alcohols may still be worth reviewing depending on your approach." },
    },
  },
  {
    id: "nuts-peanuts",
    canonicalIngredientName: "Nuts or Peanuts",
    aliases: [
      "peanut", "groundnut", "almond", "cashew", "walnut", "hazelnut", "pistachio",
      "pecan", "macadamia", "brazil nut", "pine nut", "pine nuts",
      "nut butter", "peanut butter", "almond paste", "cashew paste",
      "almond flour", "almond meal", "almond milk", "cashew milk", "nut oil",
    ],
    sourceCategory: "Nut",
    compatibility: {
      "Nut-free": { status: "not_compatible", reason: "Visible nut or peanut ingredients do not fit a nut-free preference." },
    },
  },
];
