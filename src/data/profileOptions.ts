import type { AllergyOption, DietOption, HealthOption, SensitivityOption } from "@/lib/types";

export const allergyOptions: { label: AllergyOption }[] = [
  { label: "Milk" },
  { label: "Gluten" },
  { label: "Nuts" },
  { label: "Soy" },
  { label: "Eggs" },
  { label: "Shellfish" },
];

export const healthOptions: { label: HealthOption }[] = [
  { label: "Diabetes" },
  { label: "High BP" },
  { label: "Cholesterol" },
];

export const dietOptions: { label: DietOption }[] = [
  { label: "Vegan" },
  { label: "Vegetarian" },
  { label: "Low Sodium" },
  { label: "Keto" },
  { label: "Gluten-free" },
  { label: "Dairy-free" },
  { label: "Nut-free" },
];

export const sensitivityOptions: { label: SensitivityOption }[] = [
  { label: "MSG" },
  { label: "Artificial Sweeteners" },
  { label: "Preservatives" },
  { label: "Coloring" },
  { label: "Emulsifiers" },
  { label: "Industrial Fats" },
  { label: "Refined Fillers" },
];

export const sensitivityNotes: Record<
  SensitivityOption,
  {
    title: string;
    summary: string;
    detail: string;
    citations: Array<{
      label: string;
      href: string;
      explanation: string;
    }>;
  }
> = {
  MSG: {
    title: "MSG and hidden flavor enhancers",
    summary: "Flags MSG and related flavor enhancers listed under technical names like INS 621.",
    detail:
      "Sources such as the systematic review on monosodium glutamate and gut-microbiota changes, along with broader public-health writing on extensive MSG use, explain why technical flavor-enhancer wording can be easy to miss on a fast label read. In LabelWise, this sensitivity helps surface monosodium glutamate and related wording so the label is easier to interpret at a glance.",
    citations: [
      {
        label: "Systematic review on MSG and gut-microbiota changes",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11317663/",
        explanation:
          "A review source included in your document that discusses monosodium glutamate, gut microbiota, and related metabolic questions.",
      },
      {
        label: "Extensive use of monosodium glutamate: A threat to public health?",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5938543/",
        explanation:
          "A background source from your document that explains why MSG keeps appearing in consumer health discussions and why it can matter for label literacy.",
      },
    ],
  },
  "Artificial Sweeteners": {
    title: "Non-sugar sweeteners",
    summary: "Flags sweeteners that appear even in products labeled 'no added sugar'.",
    detail:
      "Sources such as the WHO guidance on non-sugar sweeteners and Harvard's Nutrition Source explain why these ingredients are worth noticing: packaging may sound reassuring while the ingredient list uses names such as aspartame, sucralose, or acesulfame K. They also note that the longer-term evidence is more mixed than simple marketing language suggests.",
    citations: [
      {
        label: "WHO guidance on non-sugar sweeteners",
        href: "https://www.who.int/news/item/15-05-2023-who-advises-not-to-use-non-sugar-sweeteners-for-weight-control-in-newly-released-guideline",
        explanation:
          "This source is part of the document's reference list and explains why non-sugar sweeteners remain an important public-health and consumer-information topic.",
      },
      {
        label: "Harvard Nutrition Source on WHO sweetener guidance",
        href: "https://nutritionsource.hsph.harvard.edu/2023/06/06/who-guidelines-non-sugar-sweeteners/",
        explanation:
          "A plain-language explainer from the source list that adds context on why the evidence is more nuanced than a simple marketing claim.",
      },
    ],
  },
  Preservatives: {
    title: "Preservatives",
    summary: "Flags shelf-life additives, often listed as codes like E211 or sodium benzoate.",
    detail:
      "Sources such as the Food Standards Agency explainer on nitrates and nitrites and review work on sodium benzoate describe why preservative names are worth noticing: they are common in processed foods, often appear under technical names or additive codes, and sometimes need more context than packaging provides at a glance.",
    citations: [
      {
        label: "Food Standards Agency: nitrates and nitrites explained",
        href: "https://www.food.gov.uk/safety-hygiene/nitrates-and-nitrites-the-science-explained",
        explanation:
          "A reference from the document that explains common preservative terms and why they show up in processed-food labels.",
      },
      {
        label: "Sodium benzoate review (PMC)",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9003278/",
        explanation:
          "A review source from the document that illustrates why preservative context is more complex than a single-word label judgment.",
      },
    ],
  },
  Coloring: {
    title: "Synthetic coloring additives",
    summary: "Flags synthetic dyes and colorants that blend into fine print as code numbers.",
    detail:
      "Sources such as the review on artificial food colourant safety in India and the CSPI summary on synthetic food dyes explain why these additives are worth noticing: they can increase visual appeal while still being difficult to interpret quickly when labels rely on technical names or code numbers. They also describe why these ingredients receive extra scrutiny in child-focused health discussions.",
    citations: [
      {
        label: "Artificial food colourant safety in India",
        href: "https://www.foodandnutritionjournal.org/volume12number2/consumer-awareness-and-contemporary-policy-regulations-on-artificial-food-colourant-safety-in-india/",
        explanation:
          "A source from the document focused on consumer awareness and food-colourant safety in the Indian context.",
      },
      {
        label: "CSPI overview of synthetic food dyes and behavior",
        href: "https://www.cspi.org/sites/default/files/attachment/Dyes_Fact_sheet_California_3.8.2021.pdf",
        explanation:
          "A cited background source that summarizes why synthetic dyes often appear in conversations about child behavior and health.",
      },
    ],
  },
  Emulsifiers: {
    title: "Emulsifiers and texture-builders",
    summary: "Flags texture-building additives like Polysorbate 80, CMC, and INS-coded emulsifiers.",
    detail:
      "Sources such as the review on food additives and gut health, along with explainers on INS and E-number labeling, describe why emulsifiers and related texture-builders are worth noticing. They help products keep texture and shelf stability, but names like Polysorbate 80 or CMC can be easy to miss when they appear under code-style or technical wording.",
    citations: [
      {
        label: "Food Additives: Emerging Detrimental Roles on Gut Health",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12232514/",
        explanation:
          "A source from the document that explains why emulsifiers and related additives have become a closer label-reading topic.",
      },
      {
        label: "INS and E-number labeling explainer",
        href: "https://www.bitsathy.ac.in/e-numbers-and-ins-numbers-in-food-labelling/",
        explanation:
          "A cited explainer on how additive codes work, which helps show why emulsifiers can disappear into technical label language.",
      },
    ],
  },
  "Industrial Fats": {
    title: "Industrial fats",
    summary: "Flags vague fat terms like 'vegetable oil' that can hide the actual oil source.",
    detail:
      "Sources such as the WHO rapid overview on palm-oil evidence and the Dietary Guidelines material on saturated-fat sources describe why broad fat wording deserves a closer look. Terms like vegetable oil can hide the actual fat source, which makes comparison harder and can reduce a shopper's ability to make informed substitutions.",
    citations: [
      {
        label: "WHO rapid overview on palm oil and health outcomes",
        href: "https://iris.who.int/server/api/core/bitstreams/5ba96c78-4d70-4147-9177-a613b6e9d0a5/content",
        explanation:
          "A source from the document that gives broader health context for palm-oil comparisons and why the fat source itself matters.",
      },
      {
        label: "Dietary Guidelines: food sources of saturated fat",
        href: "https://www.dietaryguidelines.gov/sites/default/files/2024-12/Part%20D_Ch%204_Food%20Sources%20of%20Saturated%20Fat_FINAL_508.pdf",
        explanation:
          "A cited source that helps connect ingredient wording with the broader conversation around saturated-fat sources.",
      },
    ],
  },
  "Refined Fillers": {
    title: "Refined carbohydrate fillers",
    summary: "Flags fast-carb fillers like maltodextrin and syrup-style ingredients that look harmless.",
    detail:
      "Sources such as the NIH review on digestible maltodextrins and research on fructose-heavy sweeteners explain why refined fillers are worth noticing. Ingredients like maltodextrin and syrup-style carbohydrates may not look obviously sugary on the label, even though they can still act like fast carbohydrates and sit behind reassuring packaging language.",
    citations: [
      {
        label: "NIH review on digestible maltodextrins",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4940893/",
        explanation:
          "A source from the document that helps explain why maltodextrin and similar fillers deserve attention during label reading.",
      },
      {
        label: "Frontiers article on HFCS and type-2 diabetes",
        href: "https://www.frontiersin.org/journals/clinical-diabetes-and-healthcare/articles/10.3389/fcdhc.2026.1785203/full",
        explanation:
          "A cited source that adds broader context on why fast-carbohydrate ingredients still matter even when the package language sounds reassuring.",
      },
    ],
  },
};
