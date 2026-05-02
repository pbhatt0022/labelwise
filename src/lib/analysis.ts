import { concernDefinitions, concernRules, ingredientEntities, ingredientGroups } from "@/data/ingredientKnowledge";
import type {
  AnalysisResult,
  AllergyOption,
  BehaviorGoal,
  ConcernDefinition,
  ConcernRule,
  DietOption,
  FlagSource,
  HealthOption,
  IngredientEntity,
  MatchStrength,
  MatchedFlag,
  ResolvedIngredientMatch,
  RiskLevel,
  SensitivityOption,
  UserCustomAvoid,
  UserProfile,
} from "@/lib/types";

const riskWeight: Record<RiskLevel, number> = { low: 1, moderate: 2, high: 3 };
const matchWeight: Record<MatchStrength, number> = { cautionary: 1, likely: 2, exact: 3 };

const concernIdMap = {
  allergies: {
    Milk: "milk_allergy",
    Gluten: "gluten_allergy",
    Nuts: "nut_allergy",
    Soy: "soy_allergy",
    Eggs: "egg_allergy",
    Shellfish: "shellfish_allergy",
  },
  health: {
    Diabetes: "diabetes_watch",
    "High BP": "high_bp_watch",
    Cholesterol: "cholesterol_watch",
  },
  diet: {
    Vegan: "vegan",
    Vegetarian: "vegetarian",
    "Low Sodium": "low_sodium_watch",
    Keto: "keto_watch",
  },
  sensitivities: {
    MSG: "avoid_msg",
    "Artificial Sweeteners": "avoid_artificial_sweeteners",
    Preservatives: "avoid_preservatives",
  },
} as const;

const concernDefinitionMap = new Map(concernDefinitions.map((definition) => [definition.id, definition]));
const ingredientEntityMap = new Map(ingredientEntities.map((entity) => [entity.id, entity]));
const ingredientGroupMap = new Map(ingredientGroups.map((group) => [group.id, group]));

function getPlainLanguageMeaning(resolved: ResolvedIngredientMatch): string {
  if (resolved.category === "Allergen") return `${resolved.canonicalIngredientName} is an ingredient name that can matter quickly for people with allergies or sensitivities.`;
  if (resolved.category === "Preservative") return `${resolved.canonicalIngredientName} is used to help foods last longer on the shelf.`;
  if (resolved.category === "Sweetener") return `${resolved.canonicalIngredientName} is a sweetening ingredient that may not look like regular sugar on the label.`;
  if (resolved.category === "Flavor Enhancer") return `${resolved.canonicalIngredientName} is used to make flavor feel stronger or more intense.`;
  if (resolved.category === "Emulsifier") return `${resolved.canonicalIngredientName} helps packaged foods keep their texture and stay evenly mixed.`;
  if (resolved.category === "Fat") return `${resolved.canonicalIngredientName} is an oil or fat-related ingredient often used in processed foods.`;
  return `${resolved.canonicalIngredientName} is a packaged-food ingredient that can be hard to interpret at a glance.`;
}

function getLiteracyTip(resolved: ResolvedIngredientMatch): string {
  if (resolved.matchedAlias.toLowerCase().includes("ins")) return "INS codes often hide additive names, so translating them can make the label much easier to understand.";
  if (resolved.matchStrength === "cautionary") return "Broad terms like this can hide the exact source, so they are worth double-checking before you rely on them.";
  if (resolved.category === "Sweetener") return 'Front-of-pack claims like "sugar-free" can still sit alongside sweeteners or fast-digesting fillers in the ingredient list.';
  if (resolved.category === "Fat") return 'Generic names like "vegetable oil" do not always tell you which fat is actually being used.';
  return "The ingredient list often gives a clearer health picture than the front-of-pack message or branding.";
}

function getBehaviorGoal(rule: ConcernRule, concern: ConcernDefinition): BehaviorGoal {
  if (concern.type === "allergy") return "avoid";
  if (concern.type === "health" || rule.matchStrength === "cautionary") return "double_check";
  if (concern.type === "diet") return "compare_alternatives";
  return "save_safe";
}

function getNudgeMessage(goal: BehaviorGoal): string {
  if (goal === "avoid") return "If this is a firm no for you, save a better option so the next shopping decision takes less effort.";
  if (goal === "double_check") return "This is a good moment to pause and compare this product with a simpler alternative before buying.";
  if (goal === "compare_alternatives") return "Try comparing this label with another version that has fewer or clearer ingredients.";
  return "If this works for your preferences, save it to a folder like Safe Foods so you can find it quickly later.";
}

function createProfileReason(definition: ConcernDefinition): string {
  if (definition.type === "allergy") return `you selected ${definition.displayName}`;
  if (definition.type === "diet") return `you chose ${definition.displayName}`;
  if (definition.type === "sensitivity") return `you asked to avoid ${definition.displayName.toLowerCase()}`;
  return `you asked to watch ${definition.displayName.toLowerCase()}`;
}

export function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[()]/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeIngredientText(value: string): string {
  return normalizeForMatch(value);
}

export function extractCandidateTokens(ingredientText: string): string[] {
  return ingredientText.split(/[\n,;]+/).map((part) => part.trim()).filter(Boolean);
}

export function splitIngredients(ingredientText: string): string[] {
  return extractCandidateTokens(ingredientText);
}

function getConcernIdsFromProfile(profile: UserProfile): string[] {
  const mapped = [
    ...profile.allergies.map((item) => concernIdMap.allergies[item]),
    ...profile.health.map((item) => concernIdMap.health[item]),
    ...profile.diet.map((item) => concernIdMap.diet[item]),
    ...profile.sensitivities.map((item) => concernIdMap.sensitivities[item]),
  ];

  return Array.from(new Set([...mapped, ...profile.selectedConcernIds]));
}

export function getActiveConcernTags(profile: UserProfile): string[] {
  return getConcernIdsFromProfile(profile);
}

function getRuleMatchStrength(entity: IngredientEntity, matchedAlias: string): MatchStrength {
  if (entity.id === "lecithin-generic" || entity.id === "vegetable-oil-generic") return "cautionary";
  const normalizedAlias = normalizeForMatch(matchedAlias);
  if (entity.codes.some((code) => normalizeForMatch(code) === normalizedAlias)) return "likely";
  return "exact";
}

export function resolveIngredientMatches(tokens: string[], entities: IngredientEntity[] = ingredientEntities): ResolvedIngredientMatch[] {
  const resolved: ResolvedIngredientMatch[] = [];

  tokens.forEach((token) => {
    const normalizedToken = normalizeForMatch(token);
    entities.forEach((entity) => {
      const aliases = [entity.displayName, ...entity.aliases, ...entity.codes];
      const matchedAlias = aliases.find((alias) => normalizedToken.includes(normalizeForMatch(alias)));
      if (!matchedAlias) return;

      resolved.push({
        ingredientId: entity.id,
        matchedText: token,
        matchedAlias,
        canonicalIngredientName: entity.displayName,
        groupIds: entity.groupIds,
        matchStrength: getRuleMatchStrength(entity, matchedAlias),
        category: entity.category,
        risk: entity.defaultSeverity,
      });
    });
  });

  const deduped = new Map<string, ResolvedIngredientMatch>();
  resolved.forEach((match) => {
    const current = deduped.get(match.ingredientId);
    if (!current || matchWeight[match.matchStrength] > matchWeight[current.matchStrength]) {
      deduped.set(match.ingredientId, match);
    }
  });

  return Array.from(deduped.values());
}

function createMatchedFlag(rule: ConcernRule, concern: ConcernDefinition, resolved: ResolvedIngredientMatch, flagSource: FlagSource, reason: string): MatchedFlag {
  const behaviorGoal = getBehaviorGoal(rule, concern);
  return {
    ruleId: rule.id,
    canonicalName: resolved.canonicalIngredientName,
    ingredient: resolved.canonicalIngredientName,
    matchedAlias: resolved.matchedAlias,
    matchedText: resolved.matchedText,
    category: rule.category ?? resolved.category,
    risk: rule.severityOverride ?? resolved.risk,
    explanation: rule.displayExplanation,
    whyItMatters: rule.reason,
    suggestion: rule.suggestion,
    profileReasons: [reason],
    concernTags: [rule.concernId],
    cautionary: rule.matchStrength === "cautionary" || resolved.matchStrength === "cautionary",
    matchStrength: rule.matchStrength,
    tone: concern.tone,
    flagSource,
    concernId: concern.id,
    concernDisplayName: concern.displayName,
    canonicalIngredientId: resolved.ingredientId,
    canonicalIngredientName: resolved.canonicalIngredientName,
    reason: rule.reason,
    cautionMessage: rule.cautionMessage,
    plainLanguageMeaning: getPlainLanguageMeaning(resolved),
    literacyTip: getLiteracyTip(resolved),
    behaviorGoal,
    nudgeMessage: getNudgeMessage(behaviorGoal),
  };
}

export function applyConcernRules(resolvedMatches: ResolvedIngredientMatch[], profile: UserProfile): MatchedFlag[] {
  const concernIds = getConcernIdsFromProfile(profile);
  const flags: MatchedFlag[] = [];

  concernRules.forEach((rule) => {
    if (!concernIds.includes(rule.concernId)) return;
    const concern = concernDefinitionMap.get(rule.concernId);
    if (!concern) return;

    const matches = resolvedMatches.filter((resolved) =>
      rule.targetType === "ingredient" ? resolved.ingredientId === rule.targetId : resolved.groupIds.includes(rule.targetId),
    );
    if (matches.length === 0) return;

    matches.forEach((match) => {
      if (
        rule.targetType === "group" &&
        concernRules.some(
          (candidate) =>
            candidate.concernId === rule.concernId &&
            candidate.targetType === "ingredient" &&
            candidate.targetId === match.ingredientId,
        )
      ) {
        return;
      }

      flags.push(createMatchedFlag(rule, concern, match, "built_in_concern", createProfileReason(concern)));
    });
  });

  return flags;
}

function createCustomAvoidFlag(avoid: UserCustomAvoid, token: string): MatchedFlag {
  return {
    ruleId: avoid.id,
    canonicalName: avoid.label,
    ingredient: avoid.label,
    matchedAlias: avoid.rawTerm,
    matchedText: token,
    category: "Custom Avoid",
    risk: "moderate",
    explanation: "This ingredient matched a custom avoid you added to your profile.",
    whyItMatters: "Custom avoids let you flag ingredients that are personally important to you, even if they are not in the built-in concern list.",
    profileReasons: [`you added ${avoid.label} as a custom ingredient to flag`],
    concernTags: ["custom_avoid"],
    cautionary: false,
    matchStrength: avoid.matchMode === "exact" ? "exact" : "likely",
    tone: "medium",
    flagSource: "custom_avoid",
    concernId: avoid.id,
    concernDisplayName: avoid.label,
    canonicalIngredientId: avoid.id,
    canonicalIngredientName: avoid.label,
    reason: "custom avoid",
    cautionMessage: avoid.notes,
    plainLanguageMeaning: `${avoid.label} matched a custom ingredient or term that you asked the app to watch for.`,
    literacyTip: "Custom avoids help you personalize the scanner beyond the built-in allergy, diet, and health categories.",
    behaviorGoal: "avoid",
    nudgeMessage: "If this ingredient is personally important to avoid, keep it saved so future scans stay quick and consistent.",
  };
}

export function applyCustomAvoids(tokens: string[], customAvoids: UserCustomAvoid[]): MatchedFlag[] {
  const flags: MatchedFlag[] = [];

  customAvoids.forEach((avoid) => {
    const token = tokens.find((candidate) => {
      const normalizedCandidate = normalizeForMatch(candidate);
      return avoid.matchMode === "exact"
        ? normalizedCandidate === avoid.normalizedTerm
        : normalizedCandidate.includes(avoid.normalizedTerm);
    });
    if (token) flags.push(createCustomAvoidFlag(avoid, token));
  });

  return flags;
}

function dedupeFlags(flags: MatchedFlag[]): MatchedFlag[] {
  const seen = new Map<string, MatchedFlag>();
  flags.forEach((flag) => {
    const key = `${flag.flagSource}:${flag.ruleId}:${flag.canonicalIngredientId}`;
    const existing = seen.get(key);
    if (!existing || riskWeight[flag.risk] > riskWeight[existing.risk] || matchWeight[flag.matchStrength] > matchWeight[existing.matchStrength]) {
      seen.set(key, flag);
    }
  });

  return Array.from(seen.values()).sort((left, right) => {
    if (riskWeight[right.risk] !== riskWeight[left.risk]) return riskWeight[right.risk] - riskWeight[left.risk];
    return matchWeight[right.matchStrength] - matchWeight[left.matchStrength];
  });
}

function getOverallRisk(flags: MatchedFlag[]): RiskLevel {
  if (flags.some((flag) => flag.risk === "high")) return "high";
  if (flags.some((flag) => flag.risk === "moderate")) return "moderate";
  return "low";
}

export function analyzeIngredients(ingredientText: string, profile: UserProfile): AnalysisResult {
  const normalizedIngredients = extractCandidateTokens(ingredientText);
  const resolved = resolveIngredientMatches(normalizedIngredients);
  const builtInFlags = applyConcernRules(resolved, profile);
  const customAvoidFlags = applyCustomAvoids(normalizedIngredients, profile.customAvoids);
  const flags = dedupeFlags([...builtInFlags, ...customAvoidFlags]);

  return {
    normalizedIngredients,
    flags,
    overallRisk: getOverallRisk(flags),
    matchedConcernTags: Array.from(new Set(flags.map((flag) => flag.concernId))),
  };
}

export function createCustomAvoid(term: string): UserCustomAvoid {
  const trimmed = term.trim();
  const normalized = normalizeForMatch(trimmed);
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `custom-${Date.now()}-${normalized}`,
    label: trimmed,
    rawTerm: trimmed,
    normalizedTerm: normalized,
    matchMode: normalized.includes(" ") ? "contains" : "exact",
  };
}

export function getDefaultProfile(): UserProfile {
  return {
    allergies: [],
    health: [],
    diet: [],
    sensitivities: [],
    selectedConcernIds: [],
    customAvoids: [],
  };
}

export function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    allergies: profile.allergies ?? [],
    health: profile.health ?? [],
    diet: profile.diet ?? [],
    sensitivities: profile.sensitivities ?? [],
    selectedConcernIds: Array.from(new Set(profile.selectedConcernIds ?? getConcernIdsFromProfile(profile))),
    customAvoids: profile.customAvoids ?? [],
  };
}

export function hasProfileSelections(profile: UserProfile): boolean {
  return getConcernIdsFromProfile(profile).length > 0 || profile.customAvoids.length > 0;
}

export function getConcernIdsForLegacySelections(values: {
  allergies: AllergyOption[];
  health: HealthOption[];
  diet: DietOption[];
  sensitivities: SensitivityOption[];
}): string[] {
  return Array.from(
    new Set([
      ...values.allergies.map((item) => concernIdMap.allergies[item]),
      ...values.health.map((item) => concernIdMap.health[item]),
      ...values.diet.map((item) => concernIdMap.diet[item]),
      ...values.sensitivities.map((item) => concernIdMap.sensitivities[item]),
    ]),
  );
}

export function getConcernDefinition(concernId: string): ConcernDefinition | undefined {
  return concernDefinitionMap.get(concernId);
}

export function getIngredientEntity(ingredientId: string): IngredientEntity | undefined {
  return ingredientEntityMap.get(ingredientId);
}

export function getIngredientGroup(groupId: string) {
  return ingredientGroupMap.get(groupId);
}
