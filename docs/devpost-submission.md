# LabelWise Devpost Notes

## One-Line Pitch

**LabelWise** is a facts-first, psychology-informed, AI-assisted food-label literacy coach that reads the actual label through OCR or manual entry, then explains ingredient, nutrition, and diet-compatibility context without becoming a calorie tracker or medical tool.

## Inspiration

Food labels are meant to help people make informed choices, but many shoppers still face a gap between **label availability** and **label understanding**. This is especially relevant in India, where people may encounter local, regional, repackaged, or new products that are not easy to look up in a barcode database.

We wanted to build something that supports **food-label literacy**, not just food logging.

## What It Does

LabelWise helps a user:

- scan or upload a food label
- extract ingredient text with OCR
- correct OCR output manually
- enter ingredients manually if needed
- add optional nutrition facts manually for a `Nutrition Reality Check`
- compare the label with saved allergies, sensitivities, diet preferences, custom avoids, and optional food-label preferences
- run a transparent dietary compatibility check for vegan, vegetarian, keto-style, gluten-free, dairy-free, nut-free, and custom avoids
- save the scan, add notes, favorite it, and organize it into folders for grocery planning or later review

## Why This Is Different

We know barcode apps and calorie apps already exist. LabelWise is different in several important ways:

- **OCR/manual-entry first**: it works even when barcode databases fail or product records are missing
- **Facts-first**: structured local rules are the source of truth; AI is only the explanation layer
- **Psychology-informed**: the app is grounded in COM-B and label-literacy design, not just database lookup
- **Not a calorie tracker**: it uses per-serving nutrition context to educate, not to push restriction or dieting
- **Safety boundaries**: it is educational, non-diagnostic, non-restrictive, and transparent

## OCR and Manual-Entry Advantage

Many food apps assume a product can be identified from a barcode and a product database. That breaks for:

- local or regional Indian packaged foods
- new products
- small brands
- imported products
- repackaged foods
- incomplete database listings

LabelWise instead reads the **actual label** through OCR and allows manual correction and manual fallback entry. This makes it more robust in messy real-world retail situations.

## Health Psychology Angle

LabelWise was designed as a digital intervention informed by **health psychology**:

- **Capability**: translates technical ingredient language and nutrition context into simpler wording
- **Opportunity**: works at the point of decision during shopping
- **Motivation**: makes label details personally relevant through saved preferences and calmer prompts

The app focuses on understanding, reflection, and informed choice rather than guilt or restriction.

## Facts-First AI Architecture

The backend analysis is grounded in:

- curated ingredient rules
- curated dietary compatibility rules
- additive and INS code mappings
- user-defined allergies, sensitivities, diet preferences, and custom avoids
- nutrition values entered from the label
- user-defined sugar, sodium, and saturated fat preferences
- transparent local comparison logic

AI is only used for:

- plain-language explanation
- structured summary
- simplifying technical wording
- optional Gemini-powered personalized explanation

AI is **not** the source of truth for dietary compatibility labels. Ambiguous ingredients are marked `Needs review` by transparent rules instead.

If no LLM is configured, LabelWise uses a built-in template-based `Smart Explanation Mode`.

## Responsible Design

LabelWise is intentionally designed to avoid disordered-eating patterns and alarmist UX.

It avoids:

- good food / bad food labels
- shame-based warnings
- do-not-eat language
- weight-loss framing
- calorie obsession
- medical or legal claims

It uses calmer language such as:

- `Good to know`
- `Worth reviewing`
- `Matched your saved preference`
- `Consider comparing with another option`

## Demo Highlights

The demo includes examples that show:

- a `High protein` product with notable sugar context
- a `No added sugar` product with sweetening-related ingredients
- a `Multigrain` local-style product that still works without barcode lookup
- a `Healthy snack` example with visible ingredient and nutrition context
- a `Vegan review` example with whey and milk powder
- a `Vegetarian review` example with gelatin and rennet
- a `Low-carb review` example with sugar, maltodextrin, and refined flour
- a `Gluten-free review` example with wheat, barley malt, and oats

## Built With

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Tesseract.js
- Vitest

## Challenges

- keeping the app clearly educational and non-medical
- avoiding calorie-tracker or dieting-app framing
- building a robust flow that still works when OCR is imperfect

## Accomplishments

- built an end-to-end OCR + manual-entry food-label workflow
- added facts-first ingredient analysis
- added a facts-first dietary compatibility rule engine with `Compatible`, `Not compatible`, `Needs review`, and `Unknown` states
- added per-serving `Nutrition Reality Check`
- added an optional Gemini-based AI summary layer while keeping structured rules as the source of truth
- designed the product with explicit safety and non-restrictive boundaries

## What We Learned

Good AI for social good is not only about having a model. It is about:

- grounding outputs in reliable structured data
- respecting user agency
- designing safer language
- solving the real-world failure cases that existing tools often miss

## What’s Next

- a stronger nutrition-grounded health-context layer, reintroduced only when it can be implemented with clearer safety boundaries
- optional multilingual and Hinglish explanation
- guided OCR extraction for nutrition panels
- more ingredient and additive coverage
- more region-specific packaged-food examples

Possible enrichment sources for future rule expansion:

- [Open Food Facts](https://world.openfoodfacts.org/)
- [USDA FoodData Central](https://fdc.nal.usda.gov/)

Safety copy:

`Diet compatibility is based on visible label text and curated rules. Ingredient origins can vary by manufacturer. Please review the package and consult qualified professionals for allergies or medical dietary needs.`
