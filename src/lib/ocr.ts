import { createWorker } from "tesseract.js";

import type { NutritionFacts } from "@/lib/types";

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const geminiTextModel = import.meta.env.VITE_GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
// gemini-2.5-flash (non-lite) is the default vision model — it reads small dense text on food
// labels far more faithfully than the lite variant. Override with VITE_GEMINI_VISION_MODEL.
const geminiVisionModel = import.meta.env.VITE_GEMINI_VISION_MODEL?.trim() || "gemini-2.5-flash";

export interface OcrResult {
  text: string;
  confidence?: number;
  durationMs?: number;
  warnings?: string[];
  provider?: "gemini-vision" | "aws-textract" | "tesseract";
  nutritionFacts?: NutritionFacts;
}

export type OcrContentKind = "generic" | "ingredients" | "nutrition";

export interface OcrExtractOptions {
  kind?: OcrContentKind;
}

export interface OcrAdapter {
  extractText(input: Blob | File, options?: OcrExtractOptions): Promise<OcrResult>;
}

interface RemoteOcrResponse {
  text?: string;
  confidence?: number;
  provider?: string;
  error?: string;
}

interface GeminiNutritionExtraction {
  servingSize?: string | null;
  caloriesPerServing?: number | null;
  sugarG?: number | null;
  addedSugarG?: number | null;
  proteinG?: number | null;
  totalFatG?: number | null;
  saturatedFatG?: number | null;
  sodiumMg?: number | null;
  fiberG?: number | null;
  carbohydratesG?: number | null;
  sourceColumnUsed?: string | null;
  uncertainFields?: string[] | null;
  notes?: string | null;
}

type OcrPreprocessVariant = "binary" | "soft";

interface OcrPassPlan {
  name: string;
  variant: OcrPreprocessVariant;
  pageSegMode: string;
}

interface CropRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

const ingredientVocabulary = new Set([
  "acid",
  "acidity",
  "agent",
  "agents",
  "almond",
  "anti",
  "artificial",
  "barley",
  "bean",
  "blend",
  "bran",
  "calcium",
  "canola",
  "carbonate",
  "caseinate",
  "cocoa",
  "coconut",
  "colour",
  "colors",
  "colouring",
  "colors",
  "concentrate",
  "container",
  "contains",
  "corn",
  "dairy",
  "dates",
  "extract",
  "fiber",
  "fibre",
  "flavour",
  "flavours",
  "flavor",
  "flavors",
  "following",
  "fructose",
  "garlic",
  "glucose",
  "gum",
  "high",
  "husk",
  "ingredients",
  "invert",
  "isolate",
  "kernel",
  "lecithin",
  "less",
  "liquid",
  "maida",
  "maltodextrin",
  "milk",
  "mustard",
  "natural",
  "oats",
  "oil",
  "oleic",
  "onion",
  "palm",
  "paprika",
  "paste",
  "pea",
  "permitted",
  "potato",
  "powder",
  "preservative",
  "preservatives",
  "protein",
  "psyllium",
  "rice",
  "salt",
  "seed",
  "soy",
  "spice",
  "spices",
  "starch",
  "sugar",
  "sunflower",
  "sweetener",
  "than",
  "tomato",
  "vanaspati",
  "vegetable",
  "wheat",
  "whey",
  "yeast",
]);

const targetedIngredientRepairs: Array<[RegExp, string]> = [
  [/\bilk Protein Isolate\b/gi, "Milk Protein Isolate"],
  [/\bWhey\s+P(?:ier|er|eir|per)\s+Q?i(?:l|1)\b/gi, "Whey Protein Isolate"],
  [/\bWhey\s+P(?:ier|er|eir|per)\b/gi, "Whey Protein"],
  [/\bOnion Powderral Flavours\b/gi, "Onion Powder, Natural Flavours"],
  [/\bPsylliuato Powder\b/gi, "Psyllium, Tomato Powder"],
  [/\bPsylliulato Powder\b/gi, "Psyllium, Tomato Powder"],
  [/\bral Flavours\b/gi, "Natural Flavours"],
  [/\bPaprika extract\b/gi, "Paprika Extract"],
];

const textractEndpoint = import.meta.env.VITE_TEXTRACT_ENDPOINT?.trim();

function toTitleCase(word: string) {
  if (!word) return word;
  if (word === word.toUpperCase()) return word;
  if (word[0] === word[0].toUpperCase()) {
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }
  return word.toLowerCase();
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

  for (let row = 0; row <= a.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= b.length; column += 1) matrix[0][column] = column;

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function correctIngredientWord(word: string) {
  if (!/^[A-Za-z]{4,}$/.test(word)) return word;

  const normalized = word.toLowerCase();
  if (ingredientVocabulary.has(normalized)) return word;

  let bestMatch: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  ingredientVocabulary.forEach((candidate) => {
    const distance = levenshteinDistance(normalized, candidate);
    const allowedDistance = normalized.length >= 7 ? 2 : 1;

    if (distance <= allowedDistance && distance < bestDistance) {
      bestMatch = candidate;
      bestDistance = distance;
      return;
    }

    if (distance === bestDistance) {
      bestMatch = undefined;
    }
  });

  return bestMatch ? toTitleCase(bestMatch) : word;
}

function normalizeLineBreakArtifacts(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/([A-Za-z])-\n([A-Za-z])/g, "$1$2")
    .replace(/([A-Za-z])\n([a-z])/g, "$1$2")
    .replace(/([,:;])\n/g, "$1 ")
    .replace(/\n{2,}/g, "\n");
}

function normalizeWhitespace(text: string) {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*/g, ", ")
    .replace(/\s+\./g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function dedupeCommaSeparatedSegments(text: string) {
  const segments = text
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length <= 1) return text;

  const seenCounts = new Map<string, number>();
  const deduped: string[] = [];

  for (const segment of segments) {
    const comparable = segment.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!comparable) continue;

    const seenCount = seenCounts.get(comparable) ?? 0;
    if (seenCount >= 2) continue;

    seenCounts.set(comparable, seenCount + 1);
    deduped.push(segment);
  }

  return deduped.join(", ");
}

function extractCommaSeparatedSegments(text: string) {
  return text
    .split(",")
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean);
}

function extractNutritionLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

export function mergeIngredientCandidateTexts(texts: string[]) {
  const mergedSegments: string[] = [];
  const seenCounts = new Map<string, number>();

  for (const text of texts) {
    for (const segment of extractCommaSeparatedSegments(text)) {
      const comparable = segment.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!comparable) continue;

      const seenCount = seenCounts.get(comparable) ?? 0;
      if (seenCount >= 2) continue;

      seenCounts.set(comparable, seenCount + 1);
      mergedSegments.push(segment);
    }
  }

  return dedupeCommaSeparatedSegments(mergedSegments.join(", "));
}

function normalizeNutritionComparable(line: string) {
  return line.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function scoreNutritionLine(line: string) {
  const normalized = line.toLowerCase();
  const unitHits = (normalized.match(/\b(?:mg|g|kcal|cal|kj)\b/g) ?? []).length;
  const digitHits = (normalized.match(/\d/g) ?? []).length;
  const labelHits = (normalized.match(/\b(?:energy|calories|protein|carbohydrates?|sugars?|added sugars?|fat|saturated fat|sodium|fibre|fiber|cholesterol|serving)\b/g) ?? []).length;
  return line.length + unitHits * 12 + labelHits * 16 + Math.min(digitHits, 10) * 2;
}

function mergeNutritionCandidateTexts(texts: string[]) {
  const lineMap = new Map<string, { line: string; score: number }>();

  for (const text of texts) {
    for (const line of extractNutritionLines(text)) {
      const comparable = normalizeNutritionComparable(line);
      if (!comparable) continue;

      const nextScore = scoreNutritionLine(line);
      const existing = lineMap.get(comparable);
      if (!existing || nextScore > existing.score) {
        lineMap.set(comparable, { line, score: nextScore });
      }
    }
  }

  return Array.from(lineMap.values())
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.line)
    .join("\n");
}

export function cleanIngredientOcrText(text: string) {
  const normalized = targetedIngredientRepairs.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    normalizeLineBreakArtifacts(text)
    .replace(/\n+/g, " ")
    .replace(/\bIngredlents\b/gi, "Ingredients")
    .replace(/\blngredients\b/g, "Ingredients")
    .replace(/\blilk\b/g, "Milk"),
  );

  return dedupeCommaSeparatedSegments(
    normalizeWhitespace(
      normalized.replace(/\b[A-Za-z]{4,}\b/g, (word) => correctIngredientWord(word)),
    ),
  );
}

export function cleanNutritionOcrText(text: string) {
  return normalizeWhitespace(
    normalizeLineBreakArtifacts(text)
      .replace(/([A-Za-z][A-Za-z ]{2,})\n(\d+(?:\.\d+)?\s?(?:mg|g|kcal|cal|kj))/gi, "$1 $2")
      .replace(/(Per 100g)\n(\d+(?:\.\d+)?\s?(?:mg|g|kcal|cal|kj))/gi, "$1 $2")
      .replace(/(\d)\n(?=\d)/g, "$1 ")
      .replace(/\bPer\s+100\s*g\b/gi, "Per 100g")
      .replace(/\bAmount\s+Per\s+Serving\b/gi, "Amount Per Serving"),
  );
}

function cleanOcrTextByKind(text: string, kind: OcrContentKind) {
  if (kind === "ingredients") return cleanIngredientOcrText(text);
  if (kind === "nutrition") return cleanNutritionOcrText(text);
  return normalizeWhitespace(normalizeLineBreakArtifacts(text).replace(/\n+/g, " "));
}

function hasSuspiciousIngredientFragments(text: string) {
  const startsMidWord = /^[a-z]{2,}\s[A-Z]/.test(text);
  const mergedFragments = /(Powderral|Psylliuato|Whey Per Oil|[A-Za-z]{14,})/.test(text);
  return startsMidWord || mergedFragments;
}

async function blobToBase64(input: Blob | File) {
  const buffer = await input.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

const geminiOcrPrompts: Record<OcrContentKind, string> = {
  ingredients: [
    "You are a food label transcription assistant.",
    "Your ONLY task is to find and copy the ingredient list from this food label, word-for-word exactly as printed.",
    "The ingredients section may appear anywhere on the label — it could be a wide block at the bottom, a right-hand column beside the nutrition table, or anywhere else.",
    "Rules you must follow:",
    "1. Read every line of the ingredients section in LEFT-TO-RIGHT, TOP-TO-BOTTOM order within that section — never jump across unrelated columns.",
    "2. Transcribe every word, bracket, parenthesis, and comma EXACTLY as it appears — do not correct, paraphrase, reorganize, or summarize anything.",
    "3. Include the COMPLETE list from the first ingredient to the last, including all nested brackets and sub-ingredient groups.",
    "4. Do NOT include: Nutrition Facts / Nutrition Information table values, serving size, daily value percentages, calorie counts, allergen statements (e.g. 'Contains milk and soy'), vegetarian symbols, or facility warnings.",
    "5. If a word is hard to read, write your best guess — do not skip it.",
    "6. Start your response immediately with the first ingredient (do not write 'INGREDIENTS:' or any heading).",
    "7. If there is no ingredient list visible at all, respond with exactly: NOT_FOUND",
    "Example output: Single Origin Dominican Dark Couverture (72%), Sugar, Cocoa Butter, Soy Lecithin, Vanilla Bean.",
  ].join(" "),
  nutrition: [
    "You are a food label extraction assistant.",
    "Read the visible nutrition table and return ONLY valid JSON.",
    "Extract the per-serving values, not the per-100g column and not the %RDA column.",
    "If the label shows multiple columns, choose the one labeled per serving, amount per serving, or serving size.",
    "Use this exact JSON shape:",
    '{"servingSize":"","caloriesPerServing":null,"sugarG":null,"addedSugarG":null,"proteinG":null,"totalFatG":null,"saturatedFatG":null,"sodiumMg":null,"fiberG":null,"carbohydratesG":null,"sourceColumnUsed":"per_serving","uncertainFields":[],"notes":""}',
    "Rules:",
    "1. Return numbers only for numeric fields. No units inside numeric values.",
    "2. Keep sodium in mg.",
    "3. Keep sugar, added sugar, protein, fat, saturated fat, fiber, and carbohydrates in g.",
    "4. If a value is missing or unreadable, use null.",
    "5. Do not include markdown fences, prose, or extra keys.",
    "6. Prefer the per-serving column even if per-100g appears first.",
    "7. Ignore %RDA values completely.",
    "8. Put uncertain field names in uncertainFields if the image is blurry or two values look plausible.",
    'Example input pattern: "Per 100g | Per serving (20g) | %RDA" with row "Added Sugars (g) 19.80 3.96 7.92"',
    'Example output: {"servingSize":"20g","caloriesPerServing":114.68,"sugarG":6.2,"addedSugarG":3.96,"proteinG":1.52,"totalFatG":8.6,"saturatedFatG":6.42,"sodiumMg":4.2,"fiberG":null,"carbohydratesG":7.8,"sourceColumnUsed":"per_serving","uncertainFields":[],"notes":"Used the middle per-serving column and ignored %RDA."}',
  ].join(" "),
  generic:
    "Transcribe all visible text from this food product label exactly as printed, word for word. Return as plain text.",
};

const nutritionFactKeys: Array<keyof NutritionFacts> = [
  "servingSize",
  "caloriesPerServing",
  "sugarG",
  "addedSugarG",
  "proteinG",
  "totalFatG",
  "saturatedFatG",
  "sodiumMg",
  "fiberG",
  "carbohydratesG",
];

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function normalizeGeminiNutritionFacts(payload: GeminiNutritionExtraction): NutritionFacts | undefined {
  const normalized: NutritionFacts = {};

  for (const key of nutritionFactKeys) {
    const value = payload[key];

    if (key === "servingSize") {
      if (typeof value === "string" && value.trim()) {
        normalized.servingSize = value.trim();
      }
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      normalized[key] = Math.round(value * 10) / 10;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function buildNutritionTextFromFacts(facts: NutritionFacts) {
  const rows: string[] = [];

  if (facts.servingSize) rows.push(`Serving size ${facts.servingSize}`);
  if (typeof facts.caloriesPerServing === "number") rows.push(`Calories ${facts.caloriesPerServing} kcal`);
  if (typeof facts.sugarG === "number") rows.push(`Sugar ${facts.sugarG} g`);
  if (typeof facts.addedSugarG === "number") rows.push(`Added sugar ${facts.addedSugarG} g`);
  if (typeof facts.proteinG === "number") rows.push(`Protein ${facts.proteinG} g`);
  if (typeof facts.totalFatG === "number") rows.push(`Total fat ${facts.totalFatG} g`);
  if (typeof facts.saturatedFatG === "number") rows.push(`Saturated fat ${facts.saturatedFatG} g`);
  if (typeof facts.sodiumMg === "number") rows.push(`Sodium ${facts.sodiumMg} mg`);
  if (typeof facts.fiberG === "number") rows.push(`Dietary fibre ${facts.fiberG} g`);
  if (typeof facts.carbohydratesG === "number") rows.push(`Carbohydrates ${facts.carbohydratesG} g`);

  return rows.join("\n");
}

function normalizeGeminiUncertainFields(payload: GeminiNutritionExtraction) {
  return Array.isArray(payload.uncertainFields)
    ? payload.uncertainFields.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
}

async function prepareImageForGemini(
  input: Blob | File,
  opts: { maxPx?: number; contrast?: number } = {},
): Promise<{ base64: string; mimeType: string }> {
  const { maxPx = 2400, contrast = 1.2 } = opts;
  const url = URL.createObjectURL(input);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not load image."));
      el.src = url;
    });

    const longerSide = Math.max(image.width, image.height);
    const minPx = Math.round(maxPx * 0.67); // keep min at ~67% of max
    const scale = longerSide < minPx ? minPx / longerSide : longerSide > maxPx ? maxPx / longerSide : 1;
    const w = Math.round(image.width * scale);
    const h = Math.round(image.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { base64: await blobToBase64(input), mimeType: input.type || "image/jpeg" };

    ctx.drawImage(image, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const boosted = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
      d[i] = d[i + 1] = d[i + 2] = boosted;
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed."))), "image/jpeg", 0.95),
    );
    return { base64: await blobToBase64(blob), mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function tryGeminiVisionOcr(input: Blob | File, kind: OcrContentKind): Promise<OcrResult | undefined> {
  if (!geminiApiKey) return undefined;

  // Ingredient text on food labels is dense and small — push resolution and contrast higher
  // so Gemini has more pixels per character to work with.
  const prepOpts =
    kind === "ingredients"
      ? { maxPx: 3200, contrast: 1.35 }
      : kind === "nutrition"
        ? { maxPx: 3200, contrast: 1.3 }
        : { maxPx: 2400, contrast: 1.2 };
  const { base64, mimeType } = await prepareImageForGemini(input, prepOpts);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiVisionModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: geminiOcrPrompts[kind] },
                { inlineData: { mimeType, data: base64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: kind === "nutrition" ? 768 : 2048,
            ...(kind === "nutrition" ? { responseMimeType: "application/json" } : {}),
          },
        }),
        signal: controller.signal,
      },
    );

    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };

    if (!response.ok) {
      throw new Error(payload.error?.message?.trim() || `Gemini Vision OCR failed with status ${response.status}.`);
    }

    const raw = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";

    if (!raw || raw === "NOT_FOUND") return undefined;

    if (kind === "nutrition") {
      const jsonText = extractJsonObject(raw);
      let parsedPayload: GeminiNutritionExtraction;

      try {
        parsedPayload = JSON.parse(jsonText) as GeminiNutritionExtraction;
      } catch {
        throw new Error("Gemini returned nutrition data in an unreadable format.");
      }

      const nutritionFacts = normalizeGeminiNutritionFacts(parsedPayload);
      if (!nutritionFacts) return undefined;
      const uncertainFields = normalizeGeminiUncertainFields(parsedPayload);
      const warnings = uncertainFields.length > 0
        ? [`Gemini marked these nutrition fields as worth double-checking: ${uncertainFields.join(", ")}.`]
        : [];

      return {
        text: buildNutritionTextFromFacts(nutritionFacts),
        warnings,
        provider: "gemini-vision" as const,
        nutritionFacts,
      };
    }

    // Gemini output doesn't need Tesseract-style repair — only normalize whitespace.
    // Applying cleanIngredientOcrText would incorrectly deduplicate legitimate repeated
    // sub-ingredients (e.g. "Soy Protein Isolate" inside two different sub-groups).
    const text = raw.replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ").trim();
    if (!text) return undefined;

    return { text, warnings: [], provider: "gemini-vision" as const };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function tryTextractOcr(input: Blob | File, kind: OcrContentKind): Promise<OcrResult | undefined> {
  if (!textractEndpoint) return undefined;

  const response = await fetch(textractEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageBase64: await blobToBase64(input),
      mimeType: input.type || "image/jpeg",
      kind,
    }),
  });

  const payload = (await response.json()) as RemoteOcrResponse;
  if (!response.ok) {
    throw new Error(payload.error?.trim() || "Textract OCR failed.");
  }

  const cleanedText = cleanOcrTextByKind(payload.text?.trim() ?? "", kind);
  const warnings: string[] = [];

  if (kind === "ingredients" && hasSuspiciousIngredientFragments(cleanedText)) {
    warnings.push("Some ingredient fragments still look clipped or merged. Review the draft before analysis.");
  }

  return {
    text: cleanedText,
    confidence: payload.confidence,
    warnings,
    provider: "aws-textract" as const,
  };
}

function getOcrPassPlans(kind: OcrContentKind): OcrPassPlan[] {
  if (kind === "ingredients") {
    return [
      { name: "ingredient-binary-block", variant: "binary", pageSegMode: "6" },
      { name: "ingredient-soft-block", variant: "soft", pageSegMode: "6" },
      { name: "ingredient-soft-sparse", variant: "soft", pageSegMode: "11" },
    ];
  }

  if (kind === "nutrition") {
    return [
      { name: "nutrition-binary-block", variant: "binary", pageSegMode: "6" },
      { name: "nutrition-soft-block", variant: "soft", pageSegMode: "6" },
    ];
  }

  return [{ name: "generic-binary-block", variant: "binary", pageSegMode: "6" }];
}

function countVocabularyHits(text: string) {
  return text
    .split(/[^A-Za-z]+/)
    .filter((word) => word.length >= 3)
    .reduce((count, word) => count + (ingredientVocabulary.has(word.toLowerCase()) ? 1 : 0), 0);
}

function scoreOcrCandidate(text: string, confidence: number | undefined, kind: OcrContentKind) {
  const baseConfidence = confidence ?? 0;
  const lengthScore = Math.min(text.length, 220) / 6;

  if (kind === "ingredients") {
    const commaCount = (text.match(/,/g) ?? []).length;
    const vocabularyHits = countVocabularyHits(text);
    const suspiciousPenalty = hasSuspiciousIngredientFragments(text) ? 18 : 0;
    return baseConfidence + lengthScore + commaCount * 3 + vocabularyHits * 1.6 - suspiciousPenalty;
  }

  if (kind === "nutrition") {
    const unitHits = (text.match(/\b(?:mg|g|kcal|cal|kj)\b/gi) ?? []).length;
    const labelHits = (text.match(/\b(?:sodium|sugar|protein|fat|carbohydrate|fiber|fibre|serving|calories|energy)\b/gi) ?? []).length;
    return baseConfidence + lengthScore + unitHits * 2 + labelHits * 2;
  }

  return baseConfidence + lengthScore;
}

function getIngredientSliceRegions(): CropRegion[] {
  return [
    { left: 0, top: 0, width: 1, height: 0.4 },
    { left: 0, top: 0.24, width: 1, height: 0.4 },
    { left: 0, top: 0.5, width: 1, height: 0.4 },
  ];
}

function getNutritionSliceRegions(): CropRegion[] {
  return [
    { left: 0, top: 0.28, width: 1, height: 0.72 },
    { left: 0.06, top: 0.34, width: 0.9, height: 0.6 },
    { left: 0, top: 0.42, width: 1, height: 0.5 },
  ];
}

async function prepareImageForOcr(file: File, kind: OcrContentKind, variant: OcrPreprocessVariant, cropRegion?: CropRegion): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not load the selected image."));
      element.src = imageUrl;
    });

    const maxDimension = 2200;
    const minDimension = kind === "ingredients" ? 1400 : 1200;
    const largestSide = Math.max(image.width, image.height);
    const scaleDown = Math.min(1, maxDimension / largestSide);
    const scaleUp = largestSide < minDimension ? Math.min(2, minDimension / largestSide) : 1;
    const scale = scaleDown * scaleUp;
    const sourceLeft = cropRegion ? Math.round(image.width * cropRegion.left) : 0;
    const sourceTop = cropRegion ? Math.round(image.height * cropRegion.top) : 0;
    const sourceWidth = cropRegion ? Math.max(1, Math.round(image.width * cropRegion.width)) : image.width;
    const sourceHeight = cropRegion ? Math.max(1, Math.round(image.height * cropRegion.height)) : image.height;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, sourceLeft, sourceTop, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const contrast = variant === "binary" ? (kind === "ingredients" ? 1.42 : 1.32) : 1.12;
    const threshold = kind === "nutrition" ? 182 : 176;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
      const adjusted = Math.max(0, Math.min(255, (luminance - 128) * contrast + 128));
      const finalValue = variant === "binary" ? (adjusted > threshold ? 255 : 0) : adjusted;
      pixels[index] = finalValue;
      pixels[index + 1] = finalValue;
      pixels[index + 2] = finalValue;
    }

    context.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    return blob ?? file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export class TesseractOcrAdapter implements OcrAdapter {
  async extractText(input: Blob | File, options?: OcrExtractOptions): Promise<OcrResult> {
    const kind = options?.kind ?? "generic";
    const sourceFile = input instanceof File ? input : new File([input], "ocr-region.jpg", { type: input.type || "image/jpeg" });
    const startTime = performance.now();

    const prefixWarnings: string[] = [];

    // For ingredients, try Gemini Vision first — it understands visual layout (e.g. a right-column
    // ingredient box beside a Nutrition Facts table) and doesn't read across columns the way
    // Textract's DetectDocumentText does. For nutrition and generic, Textract leads because it
    // excels at structured table extraction.
    if ((kind === "ingredients" || kind === "nutrition") && geminiApiKey) {
      try {
        const geminiResult = await tryGeminiVisionOcr(sourceFile, kind);
        if (geminiResult) {
          return {
            ...geminiResult,
            durationMs: Math.round(performance.now() - startTime),
            warnings: [...prefixWarnings, ...(geminiResult.warnings ?? [])],
          };
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        console.warn("Gemini Vision extraction failed, falling back to OCR providers.", error);
        prefixWarnings.push(`Gemini Vision extraction failed (${reason}) — used OCR fallback instead.`);
      }
    }

    if (textractEndpoint) {
      try {
        const remoteResult = await tryTextractOcr(sourceFile, kind);
        if (remoteResult) {
          return {
            ...remoteResult,
            durationMs: Math.round(performance.now() - startTime),
            warnings: [...prefixWarnings, ...(remoteResult.warnings ?? [])],
          };
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        console.warn("Textract OCR unavailable, falling back to Gemini Vision.", error);
        prefixWarnings.push(`Textract OCR failed (${reason}) — tried Gemini Vision instead.`);
      }
    }

    // For generic scans only, Gemini remains a later fallback after Textract.
    if (kind === "generic" && geminiApiKey) {
      try {
        const geminiResult = await tryGeminiVisionOcr(sourceFile, kind);
        if (geminiResult) {
          return {
            ...geminiResult,
            durationMs: Math.round(performance.now() - startTime),
            warnings: [...prefixWarnings, ...(geminiResult.warnings ?? [])],
          };
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        console.warn("Gemini Vision OCR failed:", reason);
        prefixWarnings.push(`Gemini Vision OCR failed (${reason}) — used local OCR instead.`);
      }
    }

    const worker = await createWorker("eng");

    try {
      const passPlans = getOcrPassPlans(kind);
      const candidates: Array<{
        name: string;
        rawText: string;
        cleanedText: string;
        confidence?: number;
        score: number;
      }> = [];

      for (const passPlan of passPlans) {
        const image = await prepareImageForOcr(sourceFile, kind, passPlan.variant);
        await worker.setParameters({
          tessedit_pageseg_mode: passPlan.pageSegMode,
          preserve_interword_spaces: "1",
        });
        const result = await worker.recognize(image);
        const rawText = result.data.text.trim();
        const cleanedText = cleanOcrTextByKind(rawText, kind);

        candidates.push({
          name: passPlan.name,
          rawText,
          cleanedText,
          confidence: result.data.confidence,
          score: scoreOcrCandidate(cleanedText, result.data.confidence, kind),
        });
      }

      if (kind === "ingredients") {
        const sliceRegions = getIngredientSliceRegions();

        for (const variant of ["soft", "binary"] as const) {
          const sliceRawTexts: string[] = [];
          const sliceConfidences: number[] = [];

          for (const sliceRegion of sliceRegions) {
            const image = await prepareImageForOcr(sourceFile, kind, variant, sliceRegion);
            await worker.setParameters({
              tessedit_pageseg_mode: "6",
              preserve_interword_spaces: "1",
            });
            const result = await worker.recognize(image);
            const rawSliceText = result.data.text.trim();

            if (rawSliceText) {
              sliceRawTexts.push(rawSliceText);
            }

            if (typeof result.data.confidence === "number") {
              sliceConfidences.push(result.data.confidence);
            }
          }

          if (sliceRawTexts.length > 0) {
            const rawText = sliceRawTexts.join("\n");
            const cleanedText = cleanOcrTextByKind(rawText, kind);
            const averageConfidence =
              sliceConfidences.length > 0
                ? sliceConfidences.reduce((total, value) => total + value, 0) / sliceConfidences.length
                : undefined;

            candidates.push({
              name: `ingredient-slices-${variant}`,
              rawText,
              cleanedText,
              confidence: averageConfidence,
              score: scoreOcrCandidate(cleanedText, averageConfidence, kind) + 6,
            });
          }
        }

        const sortedIngredientCandidates = [...candidates].sort((left, right) => right.score - left.score);
        const mergedIngredientText = mergeIngredientCandidateTexts(
          sortedIngredientCandidates.slice(0, 4).map((candidate) => candidate.cleanedText),
        );

        if (mergedIngredientText) {
          const mergedConfidenceCandidates = sortedIngredientCandidates
            .slice(0, 4)
            .map((candidate) => candidate.confidence)
            .filter((value): value is number => typeof value === "number");
          const mergedConfidence =
            mergedConfidenceCandidates.length > 0
              ? mergedConfidenceCandidates.reduce((total, value) => total + value, 0) / mergedConfidenceCandidates.length
              : undefined;

          candidates.push({
            name: "ingredient-merged-candidates",
            rawText: sortedIngredientCandidates.slice(0, 4).map((candidate) => candidate.rawText).join("\n"),
            cleanedText: mergedIngredientText,
            confidence: mergedConfidence,
            score: scoreOcrCandidate(mergedIngredientText, mergedConfidence, kind) + 10,
          });
        }
      }

      if (kind === "nutrition") {
        const sliceRegions = getNutritionSliceRegions();

        for (const variant of ["soft", "binary"] as const) {
          const sliceRawTexts: string[] = [];
          const sliceConfidences: number[] = [];

          for (const sliceRegion of sliceRegions) {
            const image = await prepareImageForOcr(sourceFile, kind, variant, sliceRegion);
            await worker.setParameters({
              tessedit_pageseg_mode: "6",
              preserve_interword_spaces: "1",
            });
            const result = await worker.recognize(image);
            const rawSliceText = result.data.text.trim();

            if (rawSliceText) {
              sliceRawTexts.push(rawSliceText);
            }

            if (typeof result.data.confidence === "number") {
              sliceConfidences.push(result.data.confidence);
            }
          }

          if (sliceRawTexts.length > 0) {
            const rawText = sliceRawTexts.join("\n");
            const cleanedText = cleanOcrTextByKind(rawText, kind);
            const averageConfidence =
              sliceConfidences.length > 0
                ? sliceConfidences.reduce((total, value) => total + value, 0) / sliceConfidences.length
                : undefined;

            candidates.push({
              name: `nutrition-slices-${variant}`,
              rawText,
              cleanedText,
              confidence: averageConfidence,
              score: scoreOcrCandidate(cleanedText, averageConfidence, kind) + 8,
            });
          }
        }

        const sortedNutritionCandidates = [...candidates].sort((left, right) => right.score - left.score);
        const mergedNutritionText = mergeNutritionCandidateTexts(
          sortedNutritionCandidates.slice(0, 4).map((candidate) => candidate.cleanedText),
        );

        if (mergedNutritionText) {
          const mergedConfidenceCandidates = sortedNutritionCandidates
            .slice(0, 4)
            .map((candidate) => candidate.confidence)
            .filter((value): value is number => typeof value === "number");
          const mergedConfidence =
            mergedConfidenceCandidates.length > 0
              ? mergedConfidenceCandidates.reduce((total, value) => total + value, 0) / mergedConfidenceCandidates.length
              : undefined;

          candidates.push({
            name: "nutrition-merged-candidates",
            rawText: sortedNutritionCandidates.slice(0, 4).map((candidate) => candidate.rawText).join("\n"),
            cleanedText: mergedNutritionText,
            confidence: mergedConfidence,
            score: scoreOcrCandidate(mergedNutritionText, mergedConfidence, kind) + 12,
          });
        }
      }

      const bestCandidate = candidates.sort((left, right) => right.score - left.score)[0];
      const rawText = bestCandidate?.rawText ?? "";
      const text = bestCandidate?.cleanedText ?? "";
      const confidence = bestCandidate?.confidence;
      const warnings: string[] = [];

      if (!text) {
        warnings.push("No readable text was detected in this image.");
      }

      if (typeof confidence === "number" && confidence < 55) {
        warnings.push("OCR confidence is low, so double-check the extracted text before analyzing.");
      }

      if (rawText && text && rawText !== text) {
        warnings.push("LabelWise cleaned broken OCR line splits before filling the draft. Please review the text.");
      }

      if (kind === "ingredients" && hasSuspiciousIngredientFragments(text)) {
        warnings.push("Some ingredient fragments still look clipped or merged. A tighter crop around just the ingredients block may improve the result.");
      }

      if (candidates.length > 1 && bestCandidate && bestCandidate.name !== candidates[0]?.name) {
        warnings.push("LabelWise compared multiple OCR passes and used the clearest draft for this label.");
      }

      return {
        text,
        confidence,
        durationMs: Math.round(performance.now() - startTime),
        warnings: [...prefixWarnings, ...warnings],
        provider: "tesseract",
      };
    } finally {
      await worker.terminate();
    }
  }
}
