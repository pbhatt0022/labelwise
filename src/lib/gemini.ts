import type { ScanRecord } from "./types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() as string | undefined;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
const REQUEST_TIMEOUT_MS = 12000;

function buildPrompt(scan: ScanRecord): string {
  const { productName, brandName, analysis, profileSnapshot } = scan;
  const nutritionFacts = (scan as Record<string, unknown>).nutritionFacts as Record<string, unknown> | undefined
    ?? (analysis as Record<string, unknown>).nutritionFacts as Record<string, unknown> | undefined;

  // Profile context
  const profileLines: string[] = [];
  if (profileSnapshot.allergies.length) profileLines.push(`Allergies: ${profileSnapshot.allergies.join(", ")}`);
  if (profileSnapshot.health.length) profileLines.push(`Health conditions: ${profileSnapshot.health.join(", ")}`);
  if (profileSnapshot.diet.length) profileLines.push(`Diet: ${profileSnapshot.diet.join(", ")}`);
  if (profileSnapshot.sensitivities.length) profileLines.push(`Sensitivities: ${profileSnapshot.sensitivities.join(", ")}`);
  if (profileSnapshot.customAvoids.length)
    profileLines.push(`Avoiding: ${profileSnapshot.customAvoids.map((item) => item.label).join(", ")}`);

  // Flag context — only include the top 3 most relevant to keep the prompt concise
  const topFlags = analysis.flags.slice(0, 3);
  const flagLines =
    topFlags.length > 0
      ? topFlags
          .map((flag) => {
            const reason = flag.profileReasons[0] ?? flag.concernDisplayName ?? flag.category;
            return `- ${flag.ingredient} (${flag.risk} risk, ${flag.category}): ${flag.explanation} [relevant because: ${reason}]`;
          })
          .join("\n")
      : "None — no ingredients matched this user's profile concerns.";

  const remainingFlags = analysis.flags.length - topFlags.length;

  // Nutrition context (only key values if available)
  const nutritionLines: string[] = [];
  if (nutritionFacts) {
    if (typeof nutritionFacts.caloriesPerServing === "number") nutritionLines.push(`${nutritionFacts.caloriesPerServing} kcal`);
    if (typeof nutritionFacts.sugarG === "number") nutritionLines.push(`sugar ${nutritionFacts.sugarG}g`);
    if (typeof nutritionFacts.proteinG === "number") nutritionLines.push(`protein ${nutritionFacts.proteinG}g`);
    if (typeof nutritionFacts.sodiumMg === "number") nutritionLines.push(`sodium ${nutritionFacts.sodiumMg}mg`);
    if (typeof nutritionFacts.saturatedFatG === "number") nutritionLines.push(`saturated fat ${nutritionFacts.saturatedFatG}g`);
  }

  const riskContext =
    analysis.overallRisk === "low"
      ? "no ingredients matched the user's concerns — this looks fine for their profile"
      : analysis.overallRisk === "moderate"
      ? "a few ingredients are worth noting for this user's profile"
      : "several ingredients are relevant to this user's profile and deserve a closer look";

  return `You are LabelWise, a calm and empowering food label literacy assistant built for a health psychology app. Help users understand what's in the food they're considering — clearly and without alarm.

Write a 2–3 sentence plain-language summary for this scan. Your summary must:
- Open with the overall picture (risk level and what it means for this user)
- Name the most important flagged ingredient(s) and why they matter for this user's profile, if any exist
- End with a grounded, helpful takeaway — what the user might want to consider, or reassurance if things look fine

Tone: calm, factual, empowering. No bullet points. No headers. No medical advice. Speak directly to the user as "you".

SCAN DATA
Product: ${productName}${brandName ? ` by ${brandName}` : ""}
Risk level: ${analysis.overallRisk} — ${riskContext}
Total ingredients: ${analysis.normalizedIngredients.length}${remainingFlags > 0 ? ` (${remainingFlags} more flag${remainingFlags > 1 ? "s" : ""} not shown)` : ""}

Top flagged ingredients (${analysis.flags.length} total):
${flagLines}

User profile:
${profileLines.length > 0 ? profileLines.join("\n") : "No specific health concerns set."}
${nutritionLines.length > 0 ? `\nNutrition per serving: ${nutritionLines.join(", ")}` : ""}`;
}

const cache = new Map<string, string>();

export function clearCachedSummary(scanId: string) {
  cache.delete(scanId);
}

export async function generateAiSummary(scan: ScanRecord): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("no_key");
  }

  if (cache.has(scan.id)) {
    return cache.get(scan.id)!;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(scan) }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 160 },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[Gemini] API error", response.status, body);
      throw new Error(`api_error:${response.status}:${body.slice(0, 200)}`);
    }

    const data = await response.json();
    console.debug("[Gemini] response", data);
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[Gemini] no text in response", data);
      throw new Error("empty_response");
    }

    cache.set(scan.id, text.trim());
    return text.trim();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("request_timeout");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
