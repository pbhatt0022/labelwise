import type { DietCrossCheck, MatchedFlag, NutritionFacts, ScanRecord, StructuredExplanation, UserProfile } from "@/lib/types";

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
export const defaultGeminiModel = import.meta.env.VITE_GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
const geminiRequestTimeoutMs = 12000;

export const isGeminiConfigured = Boolean(geminiApiKey);

interface GeminiStructuredExplanation {
  headline?: string;
  summary?: string;
  bullets?: string[];
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface GeminiDietCrossCheckResponseItem {
  diet?: string;
  tone?: "good_to_know" | "worth_reviewing";
  headline?: string;
  summary?: string;
  evidence?: string[];
}

const structuredExplanationSchema = {
  type: "object",
  properties: {
    headline: {
      type: "string",
      description: "A short, calm headline summarizing what stands out for this user.",
    },
    summary: {
      type: "string",
      description: "A concise 1-2 sentence explanation grounded only in the supplied label findings.",
    },
    bullets: {
      type: "array",
      description: "Up to 2 short bullet points with practical, educational takeaways that do not repeat the summary.",
      items: {
        type: "string",
      },
      minItems: 0,
      maxItems: 2,
    },
  },
  required: ["headline", "summary", "bullets"],
  propertyOrdering: ["headline", "summary", "bullets"],
} as const;

const dietCrossCheckSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      diet: { type: "string" },
      tone: { type: "string", enum: ["good_to_know", "worth_reviewing"] },
      headline: { type: "string" },
      summary: { type: "string" },
      evidence: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["diet", "tone", "headline", "summary", "evidence"],
    propertyOrdering: ["diet", "tone", "headline", "summary", "evidence"],
  },
} as const;

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeRepeatedBullets(summary: string, bullets: string[]) {
  const summaryComparable = normalizeComparableText(summary);
  const seen = new Set<string>();

  return bullets.filter((bullet) => {
    const comparable = normalizeComparableText(bullet);
    if (!comparable) return false;
    if (summaryComparable.includes(comparable) || comparable.includes(summaryComparable)) return false;
    if (seen.has(comparable)) return false;
    seen.add(comparable);
    return true;
  });
}

function formatProfile(profile: UserProfile) {
  const segments = [
    profile.allergies.length > 0 ? `Allergies: ${profile.allergies.join(", ")}` : undefined,
    profile.sensitivities.length > 0 ? `Sensitivities: ${profile.sensitivities.join(", ")}` : undefined,
    profile.diet.length > 0 ? `Diet preferences: ${profile.diet.join(", ")}` : undefined,
    profile.health.length > 0 ? `Health watches: ${profile.health.join(", ")}` : undefined,
    profile.customAvoids.length > 0 ? `Custom avoids: ${profile.customAvoids.map((item) => item.label).join(", ")}` : undefined,
    typeof profile.dailySugarPreferenceG === "number" ? `Saved sugar preference: ${profile.dailySugarPreferenceG}g/day` : undefined,
    typeof profile.dailySodiumPreferenceMg === "number" ? `Saved sodium preference: ${profile.dailySodiumPreferenceMg}mg/day` : undefined,
    typeof profile.dailySaturatedFatPreferenceG === "number" ? `Saved saturated fat preference: ${profile.dailySaturatedFatPreferenceG}g/day` : undefined,
  ].filter(Boolean);

  return segments.length > 0 ? segments.join("\n") : "No saved profile preferences were provided for this scan.";
}

function formatFlags(flags: MatchedFlag[]) {
  if (flags.length === 0) return "No ingredient flags were found for this user's saved profile.";

  return flags
    .map(
      (flag, index) =>
        `${index + 1}. Ingredient: ${flag.ingredient} | Category: ${flag.category} | Risk: ${flag.risk} | Match: ${flag.matchStrength} | Why it matters: ${flag.explanation} | Profile reason: ${flag.profileReasons.join(", ")}${flag.suggestion ? ` | Suggested next step: ${flag.suggestion}` : ""}`,
    )
    .join("\n");
}

function formatNutritionFacts(nutritionFacts?: NutritionFacts) {
  if (!nutritionFacts) return "No structured nutrition facts were provided.";

  const rows = [
    nutritionFacts.servingSize ? `Serving size: ${nutritionFacts.servingSize}` : undefined,
    typeof nutritionFacts.caloriesPerServing === "number" ? `Calories: ${nutritionFacts.caloriesPerServing} kcal` : undefined,
    typeof nutritionFacts.carbohydratesG === "number" ? `Carbohydrates: ${nutritionFacts.carbohydratesG}g` : undefined,
    typeof nutritionFacts.proteinG === "number" ? `Protein: ${nutritionFacts.proteinG}g` : undefined,
    typeof nutritionFacts.totalFatG === "number" ? `Total fat: ${nutritionFacts.totalFatG}g` : undefined,
    typeof nutritionFacts.sugarG === "number" ? `Sugar: ${nutritionFacts.sugarG}g` : undefined,
    typeof nutritionFacts.addedSugarG === "number" ? `Added sugar: ${nutritionFacts.addedSugarG}g` : undefined,
    typeof nutritionFacts.saturatedFatG === "number" ? `Saturated fat: ${nutritionFacts.saturatedFatG}g` : undefined,
    typeof nutritionFacts.sodiumMg === "number" ? `Sodium: ${nutritionFacts.sodiumMg}mg` : undefined,
    typeof nutritionFacts.fiberG === "number" ? `Fiber: ${nutritionFacts.fiberG}g` : undefined,
  ].filter(Boolean);

  return rows.length > 0 ? rows.join("\n") : "No structured nutrition facts were provided.";
}

function buildGeminiPrompt(scan: ScanRecord) {
  return [
    "You are LabelWise's AI explanation layer.",
    "Your job is to explain the already-detected label findings in calm, clear, student-friendly language.",
    "Only use the facts given below. Do not invent ingredients, nutrition values, medical claims, or legal judgments.",
    "Do not say a food is good, bad, safe, unsafe, clean, dirty, forbidden, or dangerous.",
    "Do not give medical advice, diagnosis, treatment advice, or weight-loss advice.",
    "Use a reflective, non-shaming tone. Phrases like 'good to know', 'worth reviewing', 'matched your saved preference', and 'may be relevant' are encouraged.",
    "Keep the output concise and useful for a hackathon demo.",
    "Write a headline of 4-8 words.",
    "Write a summary of 1-2 sentences only.",
    "If you include bullets, include 1-2 bullets max.",
    "Do not repeat the same fact in both the summary and bullets.",
    "Prefer mentioning the most important 1-2 personalized takeaways instead of listing everything.",
    "Avoid overstating certainty. If something depends on the user's preferences, say it may be relevant or worth reviewing.",
    "Use category labels carefully. For sweeteners like sorbitol, prefer neutral phrases such as 'sweetener ingredient' unless the structured findings explicitly call it artificial.",
    "",
    `Product: ${scan.productName}${scan.brandName ? ` by ${scan.brandName}` : ""}`,
    "",
    "User profile:",
    formatProfile(scan.profileSnapshot),
    "",
    "Ingredient list:",
    scan.ingredientText || "No ingredient text provided.",
    "",
    "Rule-based ingredient findings:",
    formatFlags(scan.analysis.flags),
    "",
    "Structured nutrition facts:",
    formatNutritionFacts(scan.nutritionFacts ?? scan.analysis.nutritionFacts),
    "",
    "Write the explanation so it sounds personalized to this user, but remain grounded only in the supplied evidence.",
  ].join("\n");
}

function buildGeminiDietPrompt(scan: ScanRecord) {
  return [
    "You are LabelWise's AI diet cross-check layer.",
    "Your job is to review the ingredient list for possible diet-related concerns that the rule engine may have missed.",
    "Only use the ingredient list and the user's saved diet preferences below.",
    "Do not invent ingredients. Do not make medical claims. Do not judge foods as good or bad.",
    "Return ONLY JSON matching the requested schema.",
    "Include findings only for these diet preferences if they are present: Vegan, Vegetarian, Low Sodium, Keto, Gluten-free, Dairy-free, Nut-free.",
    "For Vegan, look for obvious hard-avoid ingredients such as milk, whey, casein, lactose, egg, honey, gelatin, fish oil, shellac, carmine, animal fat, anchovy, fish sauce, and other explicit animal-derived ingredients.",
    "For Vegan, also surface source-ambiguity review items such as natural flavors, mono- and diglycerides, vitamin D3, and enzymes when they appear on the label.",
    "For Vegetarian, look for meat, fish, poultry, gelatin, fish oil, animal fat, anchovy, fish sauce, animal rennet, carmine, shellac, egg white, egg yolk, albumen, and similar non-vegetarian ingredients.",
    "For Vegetarian, also surface source-ambiguity review items such as mono- and diglycerides and enzymes when they appear on the label.",
    "For Low Sodium, look for sodium-heavy or sodium-named ingredients such as soy sauce, monosodium glutamate, sodium benzoate, sodium propionate, sodium nitrite, sodium nitrate, sodium bicarbonate, disodium phosphate, and similar sodium-based additives.",
    "For Keto, look for obvious sugar sources, syrups, starches, flour-heavy fillers, maltodextrin, dextrose, fructose, rice, rice flour, tapioca starch, potato starch, corn starch, oats, refined flour, and similar carb-heavy ingredients.",
    "For Keto, also surface sugar alcohols or sweetener-heavy ingredients as review items rather than hard verdicts.",
    "For Gluten-free, look for wheat, barley, rye, malt, semolina, durum, spelt, and also review items like oats or generic starch wording when the source is unclear.",
    "For Dairy-free, look for milk, whey, casein, lactose, cream, butter, ghee, milk solids, and caseinates.",
    "For Nut-free, look for peanuts, groundnuts, almonds, cashews, walnuts, hazelnuts, pistachios, nut butters, or similar visible nut ingredients.",
    "Only return a finding when the ingredient text itself supports it.",
    "Keep each summary calm, educational, and concise.",
    "If there are no additional likely diet concerns beyond the existing rule-based flags, return an empty array [].",
    "",
    "User diet preferences:",
    scan.profileSnapshot.diet.length > 0 ? scan.profileSnapshot.diet.join(", ") : "None",
    "",
    "Ingredient list:",
    scan.ingredientText || "No ingredient text provided.",
    "",
    "Existing rule-based findings:",
    formatFlags(scan.analysis.flags),
  ].join("\n");
}

function extractGeminiText(response: GeminiGenerateContentResponse) {
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
}

function normalizeStructuredExplanation(value: GeminiStructuredExplanation | undefined): StructuredExplanation | undefined {
  if (!value) return undefined;

  const headline = value.headline?.trim();
  const summary = value.summary?.trim();
  const bullets = removeRepeatedBullets(
    summary ?? "",
    (value.bullets ?? [])
    .map((bullet) => bullet.trim())
    .filter(Boolean),
  ).slice(0, 2);

  if (!headline || !summary) return undefined;

  return {
    mode: "llm",
    provider: "gemini",
    headline,
    summary,
    bullets,
  };
}

function normalizeDietCrossChecks(value: GeminiDietCrossCheckResponseItem[] | undefined): DietCrossCheck[] {
  if (!value) return [];

  const allowedDiets = new Set(["Vegan", "Vegetarian", "Low Sodium", "Keto", "Gluten-free", "Dairy-free", "Nut-free"]);
  return value
    .map((item) => {
      if (!item.diet || !allowedDiets.has(item.diet)) return undefined;
      if (!item.headline?.trim() || !item.summary?.trim()) return undefined;

      return {
        diet: item.diet as DietCrossCheck["diet"],
        tone: item.tone === "worth_reviewing" ? "worth_reviewing" : "good_to_know",
        headline: item.headline.trim(),
        summary: item.summary.trim(),
        evidence: (item.evidence ?? []).map((entry) => entry.trim()).filter(Boolean).slice(0, 4),
        provider: "gemini" as const,
      };
    })
    .filter(Boolean) as DietCrossCheck[];
}

function getGeminiErrorMessage(response: GeminiGenerateContentResponse, status: number) {
  return response.error?.message?.trim() || `Gemini request failed with status ${status}.`;
}

export async function generateGeminiExplanation(scan: ScanRecord): Promise<StructuredExplanation | undefined> {
  if (!geminiApiKey) return undefined;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), geminiRequestTimeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(defaultGeminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildGeminiPrompt(scan),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topP: 0.8,
            maxOutputTokens: 320,
            responseMimeType: "application/json",
            responseSchema: structuredExplanationSchema,
          },
        }),
        signal: controller.signal,
      },
    );

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    if (!response.ok) {
      throw new Error(getGeminiErrorMessage(payload, response.status));
    }

    const text = extractGeminiText(payload);
    if (!text) return undefined;

    return normalizeStructuredExplanation(JSON.parse(text) as GeminiStructuredExplanation);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function generateGeminiDietCrossChecks(scan: ScanRecord): Promise<DietCrossCheck[] | undefined> {
  if (!geminiApiKey || scan.profileSnapshot.diet.length === 0) return undefined;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), geminiRequestTimeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(defaultGeminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildGeminiDietPrompt(scan),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 320,
            responseMimeType: "application/json",
            responseSchema: dietCrossCheckSchema,
          },
        }),
        signal: controller.signal,
      },
    );

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    if (!response.ok) {
      throw new Error(getGeminiErrorMessage(payload, response.status));
    }

    const text = extractGeminiText(payload);
    if (!text) return undefined;

    return normalizeDietCrossChecks(JSON.parse(text) as GeminiDietCrossCheckResponseItem[]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getGeminiConfigurationSummary() {
  return {
    configured: isGeminiConfigured,
    model: defaultGeminiModel,
  };
}
