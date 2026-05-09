import type {
  MatchedFlag,
  NutritionFacts,
  NutritionFinding,
  RiskLevel,
  StructuredExplanation,
  UserProfile,
} from "@/lib/types";

export const nutritionFieldDefinitions: Array<{
  key: keyof NutritionFacts;
  label: string;
  inputMode: "text" | "decimal" | "numeric";
  unit?: string;
}> = [
  { key: "servingSize", label: "Serving size", inputMode: "text" },
  { key: "caloriesPerServing", label: "Calories per serving", inputMode: "numeric", unit: "kcal" },
  { key: "sugarG", label: "Sugar", inputMode: "decimal", unit: "g" },
  { key: "addedSugarG", label: "Added sugar", inputMode: "decimal", unit: "g" },
  { key: "proteinG", label: "Protein", inputMode: "decimal", unit: "g" },
  { key: "totalFatG", label: "Total fat", inputMode: "decimal", unit: "g" },
  { key: "saturatedFatG", label: "Saturated fat", inputMode: "decimal", unit: "g" },
  { key: "sodiumMg", label: "Sodium", inputMode: "numeric", unit: "mg" },
  { key: "fiberG", label: "Fiber", inputMode: "decimal", unit: "g" },
  { key: "carbohydratesG", label: "Carbohydrates", inputMode: "decimal", unit: "g" },
];

type NumericNutritionFieldKey = Exclude<keyof NutritionFacts, "servingSize">;
type NutritionUnit = "g" | "mg" | "kcal" | "kj";

interface NutritionOcrFieldConfig {
  key: NumericNutritionFieldKey;
  aliases: string[];
  preferredUnit: Exclude<NutritionUnit, "kj">;
}

interface NumericCandidate {
  value: number;
  unit?: NutritionUnit;
}

type NutritionColumnOrder = "per_serving_first" | "per_serving_middle" | "per_serving_last" | "unknown";

export interface NutritionOcrParseResult {
  facts?: NutritionFacts;
  matchedFields: Array<keyof NutritionFacts>;
  warnings: string[];
}

const nutritionServingSizeAliases = ["serving size", "serve size", "per serving size"];

const nutritionOcrFieldConfigs: NutritionOcrFieldConfig[] = [
  {
    key: "caloriesPerServing",
    aliases: ["calories", "energy"],
    preferredUnit: "kcal",
  },
  {
    key: "addedSugarG",
    aliases: ["added sugars", "added sugar"],
    preferredUnit: "g",
  },
  {
    key: "sugarG",
    aliases: ["total sugars", "total sugar", "sugars", "sugar"],
    preferredUnit: "g",
  },
  {
    key: "proteinG",
    aliases: ["protein"],
    preferredUnit: "g",
  },
  {
    key: "totalFatG",
    aliases: ["total fat", "fat"],
    preferredUnit: "g",
  },
  {
    key: "saturatedFatG",
    aliases: ["saturated fat", "sat fat", "sat. fat"],
    preferredUnit: "g",
  },
  {
    key: "sodiumMg",
    aliases: ["sodium"],
    preferredUnit: "mg",
  },
  {
    key: "fiberG",
    aliases: ["dietary fibre", "dietary fiber", "fibre", "fiber"],
    preferredUnit: "g",
  },
  {
    key: "carbohydratesG",
    aliases: ["total carbohydrates", "total carbohydrate", "carbohydrates", "carbohydrate", "carbs"],
    preferredUnit: "g",
  },
];

const allNutritionLabelAliases = Array.from(
  new Set([...nutritionServingSizeAliases, ...nutritionOcrFieldConfigs.flatMap((config) => config.aliases)]),
).sort((left, right) => right.length - left.length);

const nutrientLabels = {
  sugarG: { label: "Sugar", unit: "g" },
  addedSugarG: { label: "Added sugar", unit: "g" },
  proteinG: { label: "Protein", unit: "g" },
  totalFatG: { label: "Total fat", unit: "g" },
  saturatedFatG: { label: "Saturated fat", unit: "g" },
  sodiumMg: { label: "Sodium", unit: "mg" },
  fiberG: { label: "Fiber", unit: "g" },
  carbohydratesG: { label: "Carbohydrates", unit: "g" },
  caloriesPerServing: { label: "Calories", unit: "kcal" },
} as const;

const roundToSingleDecimal = (value: number) => Math.round(value * 10) / 10;

function sanitizeNumericValue(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Number.isInteger(value) ? value : roundToSingleDecimal(value);
}

function normalizeOcrLine(line: string) {
  return line
    .toLowerCase()
    .replace(/[|]/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createAliasPattern(alias: string) {
  return new RegExp(escapeRegex(alias).replace(/\s+/g, "\\s+"), "i");
}

function buildNutritionLineCandidates(text: string) {
  const baseLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const mergedLines = baseLines.flatMap((line, index) => {
    const nextLine = baseLines[index + 1];
    if (!nextLine) return [];

    const normalizedLine = normalizeOcrLine(line);
    const normalizedNextLine = normalizeOcrLine(nextLine);
    const mentionsLabel = allNutritionLabelAliases.some((alias) => normalizedLine.includes(alias));
    const nextLineHasNumber = /\d/.test(normalizedNextLine);

    if (mentionsLabel && !/\d/.test(normalizedLine) && nextLineHasNumber) {
      return [`${line} ${nextLine}`];
    }

    return [];
  });

  return Array.from(new Set([...baseLines, ...mergedLines]));
}

function buildSingleLineNutritionCandidate(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectNutritionColumnOrder(text: string): NutritionColumnOrder {
  const normalizedText = normalizeOcrLine(text);
  const servingIndex = normalizedText.indexOf("amount per serving");
  const servingOnlyIndex = normalizedText.indexOf("per serving");
  const per100Index = normalizedText.indexOf("per 100g");
  const rdaIndex = normalizedText.indexOf("% rda");

  if (per100Index >= 0 && servingOnlyIndex >= 0 && rdaIndex >= 0) {
    if (per100Index < servingOnlyIndex && servingOnlyIndex < rdaIndex) {
      return "per_serving_middle";
    }
  }

  if (servingIndex >= 0 && per100Index >= 0) {
    return servingIndex < per100Index ? "per_serving_first" : "per_serving_last";
  }

  if (servingOnlyIndex >= 0 && per100Index >= 0) {
    return servingOnlyIndex < per100Index ? "per_serving_first" : "per_serving_last";
  }

  return "unknown";
}

function normalizeDetectedUnit(unit?: string): NutritionUnit | undefined {
  if (!unit) return undefined;
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === "mq") return "mg";
  if (normalizedUnit === "kj" || normalizedUnit === "mg" || normalizedUnit === "g" || normalizedUnit === "kcal") {
    return normalizedUnit;
  }
  return undefined;
}

function extractNumericCandidates(segment: string): NumericCandidate[] {
  const normalizedSegment = segment.replace(/(?<=\d),(?=\d)/g, "");
  const candidatePattern = /(\d+(?:\.\d+)?)\s*(kcal|kj|mg|mq|g)?/gi;
  const candidates: NumericCandidate[] = [];

  let match = candidatePattern.exec(normalizedSegment);
  while (match) {
    const rawValue = Number(match[1]);
    const trailingText = normalizedSegment.slice(candidatePattern.lastIndex).trimStart();

    if (Number.isFinite(rawValue) && !trailingText.startsWith("%")) {
      candidates.push({
        value: rawValue,
        unit: normalizeDetectedUnit(match[2]),
      });
    }

    match = candidatePattern.exec(normalizedSegment);
  }

  return candidates;
}

function truncateBeforeNextNutritionLabel(segment: string, currentAlias: string) {
  const nextAliasIndex = allNutritionLabelAliases
    .filter((alias) => alias !== currentAlias)
    .reduce<number | undefined>((earliestIndex, alias) => {
      const match = createAliasPattern(alias).exec(segment);
      if (!match || typeof match.index !== "number") return earliestIndex;
      const index = match.index;
      if (typeof earliestIndex === "number") return Math.min(earliestIndex, index);
      return index;
    }, undefined);

  return typeof nextAliasIndex === "number" ? segment.slice(0, nextAliasIndex) : segment;
}

function convertCandidateValue(candidate: NumericCandidate, preferredUnit: Exclude<NutritionUnit, "kj">) {
  if (preferredUnit === "kcal") {
    if (candidate.unit === "kcal" || typeof candidate.unit === "undefined") return candidate.value;
    if (candidate.unit === "kj") return candidate.value * 0.239005736;
    return undefined;
  }

  if (preferredUnit === "mg") {
    if (candidate.unit === "mg" || typeof candidate.unit === "undefined") return candidate.value;
    if (candidate.unit === "g") return candidate.value * 1000;
    return undefined;
  }

  if (candidate.unit === "g" || typeof candidate.unit === "undefined") return candidate.value;
  if (candidate.unit === "mg") return candidate.value / 1000;
  return undefined;
}

function selectBestNumericCandidate(
  candidates: NumericCandidate[],
  preferredUnit: Exclude<NutritionUnit, "kj">,
  columnOrder: NutritionColumnOrder,
) {
  if (candidates.length === 0) return undefined;

  const getCandidateSequence = (sourceCandidates: NumericCandidate[]) => {
    if (columnOrder === "per_serving_first") return [...sourceCandidates];
    if (columnOrder === "per_serving_last") return [...sourceCandidates].reverse();
    if (columnOrder === "per_serving_middle") {
      if (sourceCandidates.length >= 2) {
        return [sourceCandidates[1], sourceCandidates[0], ...sourceCandidates.slice(2)];
      }
      return [...sourceCandidates];
    }
    return [...sourceCandidates].reverse();
  };

  const orderedCandidates = getCandidateSequence(candidates);

  if (preferredUnit === "kcal") {
    const kcalCandidate = orderedCandidates.find((candidate) => candidate.unit === "kcal");
    if (kcalCandidate) return sanitizeNumericValue(convertCandidateValue(kcalCandidate, preferredUnit));

    const unitlessCandidate = orderedCandidates.find((candidate) => typeof candidate.unit === "undefined");
    if (unitlessCandidate) return sanitizeNumericValue(convertCandidateValue(unitlessCandidate, preferredUnit));

    const kjCandidate = orderedCandidates.find((candidate) => candidate.unit === "kj");
    if (kjCandidate) return sanitizeNumericValue(convertCandidateValue(kjCandidate, preferredUnit));

    return undefined;
  }

  const convertibleCandidate = orderedCandidates.find((candidate) => typeof convertCandidateValue(candidate, preferredUnit) === "number");

  if (!convertibleCandidate) return undefined;
  return sanitizeNumericValue(convertCandidateValue(convertibleCandidate, preferredUnit));
}

function shouldIgnoreFieldLine(fieldKey: NumericNutritionFieldKey, alias: string, normalizedLine: string) {
  if (fieldKey === "sugarG") {
    return normalizedLine.includes("added sugar") && !normalizedLine.includes("total sugar");
  }

  if (fieldKey === "totalFatG" && alias === "fat") {
    return normalizedLine.includes("saturated fat") || normalizedLine.includes("trans fat");
  }

  return false;
}

function extractFieldValueFromLine(line: string, config: NutritionOcrFieldConfig, columnOrder: NutritionColumnOrder) {
  const normalizedLine = normalizeOcrLine(line);

  for (const alias of config.aliases) {
    const aliasMatch = createAliasPattern(alias).exec(line);
    if (!aliasMatch || typeof aliasMatch.index !== "number" || shouldIgnoreFieldLine(config.key, alias, normalizedLine)) continue;

    const segment = truncateBeforeNextNutritionLabel(line.slice(aliasMatch.index + aliasMatch[0].length), alias);
    const candidates = extractNumericCandidates(segment);
    const selectedValue = selectBestNumericCandidate(candidates, config.preferredUnit, columnOrder);

    if (typeof selectedValue === "number") {
      return selectedValue;
    }
  }

  return undefined;
}

function extractFieldValueFromText(text: string, config: NutritionOcrFieldConfig, columnOrder: NutritionColumnOrder) {
  const normalizedText = buildSingleLineNutritionCandidate(text);
  if (!normalizedText) return undefined;

  for (const alias of config.aliases) {
    const aliasPattern = new RegExp(createAliasPattern(alias).source, "ig");
    let aliasMatch = aliasPattern.exec(normalizedText);

    while (aliasMatch) {
      if (!shouldIgnoreFieldLine(config.key, alias, normalizeOcrLine(aliasMatch[0]))) {
        const remainingText = normalizedText.slice(aliasMatch.index + aliasMatch[0].length);
        const truncatedSegment = truncateBeforeNextNutritionLabel(remainingText, alias).slice(0, 120);
        const candidates = extractNumericCandidates(truncatedSegment);
        const selectedValue = selectBestNumericCandidate(candidates, config.preferredUnit, columnOrder);

        if (typeof selectedValue === "number") {
          return selectedValue;
        }
      }

      aliasMatch = aliasPattern.exec(normalizedText);
    }
  }

  return undefined;
}

function extractServingSizeFromLine(line: string) {
  for (const alias of nutritionServingSizeAliases) {
    const aliasMatch = createAliasPattern(alias).exec(line);
    if (!aliasMatch || typeof aliasMatch.index !== "number") continue;

    const segment = truncateBeforeNextNutritionLabel(line.slice(aliasMatch.index + aliasMatch[0].length), alias)
      .replace(/^[\s:.-]+/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (segment) {
      return segment;
    }
  }

  return undefined;
}

export function parseNutritionFactsFromText(text: string, existingFacts?: NutritionFacts): NutritionOcrParseResult {
  const baseFacts = normalizeNutritionFacts(existingFacts) ?? {};
  const rawText = text.trim();

  if (!rawText) {
    return {
      facts: normalizeNutritionFacts(baseFacts),
      matchedFields: [],
      warnings: ["No readable nutrition text was detected in this image."],
    };
  }

  const lineCandidates = buildNutritionLineCandidates(rawText);
  const singleLineCandidate = buildSingleLineNutritionCandidate(rawText);
  const columnOrder = detectNutritionColumnOrder(rawText);
  const parsedFacts: NutritionFacts = { ...baseFacts };
  const matchedFields: Array<keyof NutritionFacts> = [];

  const servingSize = [...lineCandidates, singleLineCandidate].map(extractServingSizeFromLine).find(Boolean);
  if (servingSize) {
    parsedFacts.servingSize = servingSize;
    matchedFields.push("servingSize");
  }

  nutritionOcrFieldConfigs.forEach((config) => {
    const value =
      lineCandidates.map((line) => extractFieldValueFromLine(line, config, columnOrder)).find((candidate) => typeof candidate === "number") ??
      extractFieldValueFromText(rawText, config, columnOrder);
    if (typeof value !== "number") return;

    parsedFacts[config.key] = value;
    matchedFields.push(config.key);
  });

  const warnings: string[] = [];
  if (matchedFields.length === 0) {
    warnings.push("We could not confidently prefill nutrition values from this image. You can still enter them manually.");
  } else if (matchedFields.length < 3) {
    warnings.push("Only a few nutrition fields were recognized. Please review the prefilled values and complete the rest manually.");
  }

  return {
    facts: normalizeNutritionFacts(parsedFacts),
    matchedFields,
    warnings,
  };
}

export function normalizeNutritionFacts(facts?: NutritionFacts): NutritionFacts | undefined {
  if (!facts) return undefined;

  const normalized: NutritionFacts = {
    servingSize: facts.servingSize?.trim() || undefined,
    caloriesPerServing: sanitizeNumericValue(facts.caloriesPerServing),
    sugarG: sanitizeNumericValue(facts.sugarG),
    addedSugarG: sanitizeNumericValue(facts.addedSugarG),
    proteinG: sanitizeNumericValue(facts.proteinG),
    totalFatG: sanitizeNumericValue(facts.totalFatG),
    saturatedFatG: sanitizeNumericValue(facts.saturatedFatG),
    sodiumMg: sanitizeNumericValue(facts.sodiumMg),
    fiberG: sanitizeNumericValue(facts.fiberG),
    carbohydratesG: sanitizeNumericValue(facts.carbohydratesG),
  };

  return hasMeaningfulNutritionFacts(normalized) ? normalized : undefined;
}

export function hasMeaningfulNutritionFacts(facts?: NutritionFacts): boolean {
  if (!facts) return false;
  return Object.entries(facts).some(([key, value]) => (key === "servingSize" ? Boolean(value) : typeof value === "number"));
}

export function getProfileNutritionPreferences(profile: UserProfile) {
  return {
    dailySugarPreferenceG: sanitizeNumericValue(profile.dailySugarPreferenceG),
    dailySodiumPreferenceMg: sanitizeNumericValue(profile.dailySodiumPreferenceMg),
    dailySaturatedFatPreferenceG: sanitizeNumericValue(profile.dailySaturatedFatPreferenceG),
  };
}

function createPreferenceFinding(params: {
  id: string;
  nutrientKey: "sugarG" | "sodiumMg" | "saturatedFatG";
  value: number;
  preferenceValue: number;
}): NutritionFinding {
  const { id, nutrientKey, value, preferenceValue } = params;
  const { label, unit } = nutrientLabels[nutrientKey];
  const exceedsPreference = value > preferenceValue;

  return {
    id,
    nutrientKey,
    label,
    tone: exceedsPreference ? "worth_reviewing" : "matched_preference",
    value,
    unit,
    preferenceValue,
    summary: exceedsPreference ? `${label} exceeds your saved preference` : `${label} matched your saved preference`,
    detail: exceedsPreference
      ? `One serving has ${formatNutrientValue(value, unit)} ${label.toLowerCase()}. That is above your saved preference of ${formatNutrientValue(preferenceValue, unit)}. This does not make the product off-limits, but it may be worth reviewing if you choose it often.`
      : `One serving has ${formatNutrientValue(value, unit)} ${label.toLowerCase()}, which fits within your saved preference of ${formatNutrientValue(preferenceValue, unit)}.`,
  };
}

function createContextFinding(params: {
  id: string;
  nutrientKey: keyof typeof nutrientLabels;
  value: number;
  summary: string;
  detail: string;
}): NutritionFinding {
  const { nutrientKey, value, summary, detail, id } = params;
  const { label, unit } = nutrientLabels[nutrientKey];

  return {
    id,
    nutrientKey,
    label,
    tone: "good_to_know",
    value,
    unit,
    summary,
    detail,
  };
}

export function analyzeNutritionFacts(nutritionFacts: NutritionFacts | undefined, profile: UserProfile): NutritionFinding[] {
  const normalizedFacts = normalizeNutritionFacts(nutritionFacts);
  if (!normalizedFacts) return [];

  const preferences = getProfileNutritionPreferences(profile);
  const findings: NutritionFinding[] = [];

  if (typeof normalizedFacts.sugarG === "number") {
    if (typeof preferences.dailySugarPreferenceG === "number") {
      findings.push(
        createPreferenceFinding({
          id: "sugar-preference",
          nutrientKey: "sugarG",
          value: normalizedFacts.sugarG,
          preferenceValue: preferences.dailySugarPreferenceG,
        }),
      );
    } else {
      findings.push(
        createContextFinding({
          id: "sugar-context",
          nutrientKey: "sugarG",
          value: normalizedFacts.sugarG,
          summary: "Sugar adds important per-serving context",
          detail: `One serving lists ${formatNutrientValue(normalizedFacts.sugarG, "g")} sugar. LabelWise uses this as educational context so the rest of the nutrition panel stays easy to compare.`,
        }),
      );
    }
  }

  if (typeof normalizedFacts.sodiumMg === "number" && typeof preferences.dailySodiumPreferenceMg === "number") {
    findings.push(
      createPreferenceFinding({
        id: "sodium-preference",
        nutrientKey: "sodiumMg",
        value: normalizedFacts.sodiumMg,
        preferenceValue: preferences.dailySodiumPreferenceMg,
      }),
    );
  }

  if (typeof normalizedFacts.saturatedFatG === "number" && typeof preferences.dailySaturatedFatPreferenceG === "number") {
    findings.push(
      createPreferenceFinding({
        id: "saturated-fat-preference",
        nutrientKey: "saturatedFatG",
        value: normalizedFacts.saturatedFatG,
        preferenceValue: preferences.dailySaturatedFatPreferenceG,
      }),
    );
  }

  if (typeof normalizedFacts.proteinG === "number") {
    findings.push(
      createContextFinding({
        id: "protein-context",
        nutrientKey: "proteinG",
        value: normalizedFacts.proteinG,
        summary: "Protein is one part of the full label picture",
        detail: `This serving provides ${formatNutrientValue(normalizedFacts.proteinG, "g")} protein. That can be useful context, especially when the front of pack highlights protein.`,
      }),
    );
  }

  if (typeof normalizedFacts.addedSugarG === "number") {
    findings.push(
      createContextFinding({
        id: "added-sugar-context",
        nutrientKey: "addedSugarG",
        value: normalizedFacts.addedSugarG,
        summary: "Added sugar can be useful to compare with total sugar",
        detail: `This serving lists ${formatNutrientValue(normalizedFacts.addedSugarG, "g")} added sugar. LabelWise shows it as context rather than a pass-or-fail score.`,
      }),
    );
  }

  return findings;
}

export function buildStructuredExplanation(params: {
  flags: MatchedFlag[];
  nutritionFindings: NutritionFinding[];
  nutritionFacts?: NutritionFacts;
}): StructuredExplanation | undefined {
  const { flags, nutritionFindings, nutritionFacts } = params;
  const hasNutrition = hasMeaningfulNutritionFacts(nutritionFacts);

  if (flags.length === 0 && nutritionFindings.length === 0 && !hasNutrition) return undefined;

  const preferenceMatches = nutritionFindings.filter((finding) => finding.tone === "matched_preference").length;
  const reviewItems = nutritionFindings.filter((finding) => finding.tone === "worth_reviewing").length;

  let headline = "This scan gives you a facts-first label summary.";
  if (reviewItems > 0 || flags.length > 0) {
    headline = "This label has a few details that may be worth a closer look.";
  } else if (preferenceMatches > 0) {
    headline = "Some of this label matched the preferences you saved.";
  }

  const summaryParts = [
    flags.length > 0 ? `${flags.length} ingredient ${flags.length === 1 ? "match" : "matches"} linked to your profile` : undefined,
    hasNutrition ? "per-serving nutrition context included" : undefined,
  ].filter(Boolean);

  const bullets = [
    flags.length > 0 ? "Ingredient findings stay grounded in your saved allergies, sensitivities, diet preferences, and custom avoids." : undefined,
    nutritionFindings[0]?.detail,
  ]
    .filter(Boolean)
    .slice(0, 3) as string[];

  return {
    mode: "template",
    headline,
    summary: summaryParts.length > 0 ? `LabelWise combined ${summaryParts.join(", ")}.` : "LabelWise organized the visible facts from this label into a calmer, easier-to-read summary.",
    bullets,
  };
}

export function formatNutrientValue(value: number, unit: string) {
  return `${Number.isInteger(value) ? value : roundToSingleDecimal(value)}${unit}`;
}

export function getRiskDisplayLabel(level: RiskLevel) {
  if (level === "low") return "Good to know";
  if (level === "moderate") return "Worth reviewing";
  return "Consider another product";
}
