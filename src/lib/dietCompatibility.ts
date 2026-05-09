import { dietRules, supportedDietCompatibilityPreferences, type DietRuleDefinition } from "@/data/dietRules";
import { normalizeForMatch } from "@/lib/analysis";
import type {
  DietCompatibilityMatch,
  DietCompatibilityPreference,
  DietCompatibilityResult,
  DietCompatibilityStatus,
  MatchMode,
  UserCustomAvoid,
  UserProfile,
} from "@/lib/types";

type RuleBackedPreference = DietCompatibilityPreference | "Custom avoids";

function buildTokens(ingredientText: string) {
  return ingredientText
    .split(/[\n,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMatchedAlias(tokens: string[], rule: DietRuleDefinition) {
  const normalizedAliases = rule.aliases.map((alias) => ({ alias, normalized: normalizeForMatch(alias) }));

  for (const token of tokens) {
    const normalizedToken = normalizeForMatch(token);
    const matched = normalizedAliases.find(({ normalized }) => {
      const pattern = new RegExp(`(^| )${escapeRegex(normalized)}($| )`);
      return pattern.test(normalizedToken);
    });
    if (matched) {
      return {
        matchedTerm: matched.alias,
        matchedToken: token,
      };
    }
  }

  return undefined;
}

function getStatusForPreference(matches: DietCompatibilityMatch[]): DietCompatibilityStatus {
  if (matches.some((match) => match.status === "not_compatible")) return "not_compatible";
  if (matches.some((match) => match.status === "needs_review")) return "needs_review";
  return "compatible";
}

function buildSummary(
  preference: RuleBackedPreference,
  status: DietCompatibilityStatus,
  matchedConcerns: DietCompatibilityMatch[],
  reviewItems: DietCompatibilityMatch[],
) {
  if (status === "unknown") {
    return "LabelWise could not determine compatibility from the visible ingredient text alone.";
  }

  if (status === "not_compatible") {
    const names = matchedConcerns.map((item) => item.canonicalIngredientName).slice(0, 3).join(", ");
    return `${names} matched curated rules for ${preference.toLowerCase()}.`;
  }

  if (status === "needs_review") {
    const names = reviewItems.map((item) => item.canonicalIngredientName).slice(0, 3).join(", ");
    return `${names} may need a closer look because ingredient origins or sources can vary by manufacturer.`;
  }

  return preference === "Custom avoids"
    ? "No custom avoid terms were found in the visible ingredient list."
    : "No obvious issue was found in the visible ingredient list for this preference.";
}

function dedupeMatches(matches: DietCompatibilityMatch[]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.preference}:${match.canonicalIngredientName}:${match.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCustomAvoidMatches(tokens: string[], customAvoids: UserCustomAvoid[]): DietCompatibilityMatch[] {
  return customAvoids
    .map((avoid) => {
      const match = tokens.find((token) => {
        const normalizedToken = normalizeForMatch(token);
        return avoid.matchMode === ("exact" as MatchMode)
          ? normalizedToken === avoid.normalizedTerm
          : normalizedToken.includes(avoid.normalizedTerm);
      });

      if (!match) return undefined;

      return {
        preference: "Custom avoids" as const,
        status: "not_compatible" as const,
        canonicalIngredientName: avoid.label,
        matchedTerm: match,
        reason: "This ingredient matched a custom avoid from your saved profile.",
        sourceCategory: "Custom avoid",
        sourceType: "custom_avoid" as const,
      };
    })
    .filter(Boolean) as DietCompatibilityMatch[];
}

export function analyzeDietCompatibility(ingredientText: string, profile: UserProfile): DietCompatibilityResult[] {
  const trimmedText = ingredientText.trim();
  const tokens = buildTokens(trimmedText);

  const selectedPreferences = supportedDietCompatibilityPreferences.filter((preference) => profile.diet.includes(preference));
  const includeCustomAvoids = profile.customAvoids.length > 0;

  if (selectedPreferences.length === 0 && !includeCustomAvoids) return [];

  if (tokens.length === 0) {
    const unknownResults = selectedPreferences.map((preference) => ({
      preference,
      status: "unknown" as const,
      matchedConcerns: [],
      reviewItems: [],
      summary: "LabelWise could not determine compatibility because no ingredient text was available.",
    }));

    return includeCustomAvoids
      ? [
          ...unknownResults,
          {
            preference: "Custom avoids" as const,
            status: "unknown" as const,
            matchedConcerns: [],
            reviewItems: [],
            summary: "LabelWise could not determine custom avoid matches because no ingredient text was available.",
          },
        ]
      : unknownResults;
  }

  const preferenceMatches = new Map<RuleBackedPreference, DietCompatibilityMatch[]>();

  selectedPreferences.forEach((preference) => preferenceMatches.set(preference, []));
  if (includeCustomAvoids) preferenceMatches.set("Custom avoids", []);

  dietRules.forEach((rule) => {
    const aliasMatch = findMatchedAlias(tokens, rule);
    if (!aliasMatch) return;

    selectedPreferences.forEach((preference) => {
      const effect = rule.compatibility[preference];
      if (!effect) return;

      const matches = preferenceMatches.get(preference);
      if (!matches) return;

      matches.push({
        preference,
        status: effect.status,
        canonicalIngredientName: rule.canonicalIngredientName,
        matchedTerm: aliasMatch.matchedTerm,
        reason: effect.reason,
        sourceCategory: rule.sourceCategory,
        sourceType: "curated_rule",
      });
    });
  });

  if (includeCustomAvoids) {
    preferenceMatches.set("Custom avoids", buildCustomAvoidMatches(tokens, profile.customAvoids));
  }

  return Array.from(preferenceMatches.entries()).map(([preference, matches]) => {
    const dedupedMatches = dedupeMatches(matches);
    const matchedConcerns = dedupedMatches.filter((match) => match.status === "not_compatible");
    const reviewItems = dedupedMatches.filter((match) => match.status === "needs_review");
    const status = getStatusForPreference(dedupedMatches);

    return {
      preference,
      status,
      matchedConcerns,
      reviewItems,
      summary: buildSummary(preference, status, matchedConcerns, reviewItems),
    };
  });
}
