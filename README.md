# LabelWise

**LabelWise** is a facts-first, psychology-informed, AI-assisted food-label literacy coach.

It is intentionally **not** positioned as a generic barcode scanner, calorie tracker, dieting app, or weight-loss tool. LabelWise helps people read the **actual label** on a packaged food, understand what it says, and reflect on what may be relevant for them.

## What Makes LabelWise Different?

Many food apps depend on barcode lookup and product databases. That approach can break when the product is:

- local or regional
- newly launched
- from a small brand
- imported or repackaged
- incomplete or missing in a database

LabelWise is designed to keep working when barcode-first products fail:

- OCR-based ingredient label extraction
- manual correction after OCR
- manual ingredient entry fallback
- manual nutrition entry fallback
- local rule-based analysis
- personalized saved preferences
- saved scans, notes, favorites, and folders for grocery planning

This makes LabelWise especially useful for **Indian packaged foods**, regional products, and mixed retail environments where database coverage is inconsistent.

## Product Positioning

LabelWise focuses on:

- food-label literacy
- ingredient transparency
- nutrition context per serving
- reflection and user agency

LabelWise avoids:

- calorie obsession
- shame-based warnings
- good food / bad food language
- weight-loss framing
- medical claims
- diagnosis or treatment advice

The interface uses calmer phrases such as:

- `Good to know`
- `Worth reviewing`
- `Matched your saved preference`
- `Consider another product`

## Health Psychology Framing

The app is grounded primarily in the **COM-B model of behaviour change**, with light-touch **nudge principles**.

- **Capability**: translates technical ingredient names, INS codes, and nutrition context into simpler language
- **Opportunity**: supports in-the-moment label reading during shopping on a mobile-friendly interface
- **Motivation**: makes findings personally relevant through allergies, sensitivities, diet preferences, custom avoids, and optional food-label preferences

The goal is not to tell users what they must eat. The goal is to help them **understand the label better**.

## Current Hackathon Features

- account-based sign in with Supabase or local fallback
- OCR-powered ingredient extraction in the browser
- manual ingredient correction and manual entry fallback
- profile-based ingredient analysis using a local rule engine
- a facts-first dietary compatibility engine for vegan, vegetarian, keto-style, gluten-free, dairy-free, nut-free, and custom avoids
- optional food-label preferences for sugar, sodium, and saturated fat
- `Nutrition Reality Check` with manual per-serving nutrition entry
- template-based `Smart Explanation Mode`

## Optional AWS Textract OCR

If you want stronger OCR than the in-browser Tesseract fallback, LabelWise can call AWS Textract through a small local proxy.

Add these values to your local `.env.local`:

```env
VITE_TEXTRACT_ENDPOINT=http://127.0.0.1:8787/api/ocr/textract
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=us-east-1
```

Then run the proxy in one terminal:

```bash
npm run dev:textract
```

And the app in another:

```bash
npm run dev -- --host
```

When the proxy is unavailable, LabelWise automatically falls back to local Tesseract OCR.
- optional Gemini-powered `AI-assisted summary` with template fallback
- saved scans, notes, favorites, and folders such as `Go-To Options`, `Grocery`, and `Review Later`

## Facts-First Architecture

LabelWise does **not** use AI as the source of truth.

Structured analysis is grounded in:

- curated ingredient rules
- curated dietary compatibility rules
- additive and INS-code mappings where available
- user-defined allergies, sensitivities, diet preferences, and custom avoids
- nutrition values entered from the label
- user-defined food-label preferences
- transparent local comparison logic

AI is limited to the explanation layer:

- plain-language summaries
- student-friendly phrasing
- simpler wording for technical terms
- optional Gemini-powered personalized explanation on the results screen
- optional AI review hints that never set the final compatibility label

If no LLM is configured, the app uses a built-in template-based explanation mode.

## Diet Compatibility

LabelWise includes a transparent dietary compatibility engine based on visible ingredient text and curated rules.

- `Not compatible`: a visible ingredient directly conflicts with the selected preference
- `Needs review`: the ingredient source may vary by manufacturer or the wording is ambiguous
- `Compatible`: no obvious issue was found in the visible ingredient list
- `Unknown`: there was not enough visible ingredient text to classify confidently

This compatibility engine is rule-based. AI is **not** the source of truth for dietary classification.

Safety copy used in the product:

`Diet compatibility is based on visible label text and curated rules. Ingredient origins can vary by manufacturer. Please review the package and consult qualified professionals for allergies or medical dietary needs.`

## Safety Boundaries

LabelWise is:

- educational
- non-diagnostic
- non-restrictive
- transparent

It is **not medical advice**. It does not diagnose conditions, determine medical safety, prescribe diets, or tell users that a food is forbidden.

## Demo Examples

The current app includes fixed demo examples that show the core novelty:

- a `High protein` cereal with notable sugar context
- a `No added sugar` snack with sweetening-related ingredients
- a `Multigrain` khakhra example for local/regional packaged-food context
- a `Healthy snack` makhana mix with visible ingredient and nutrition context
- a `Vegan review` example with whey and milk powder
- a `Vegetarian review` example with gelatin and rennet
- a `Low-carb review` example with sugar, maltodextrin, and refined flour
- a `Gluten-free review` example with wheat, barley malt, and oats

These demos are meant to help judges quickly understand:

- why LabelWise is not just another barcode app
- why it is not a calorie tracker
- why OCR/manual-entry-first design matters

## Repository Guide

- [src](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/src): React application code
- [supabase](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/supabase): Supabase setup and schema
- [docs](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/docs): hackathon and report materials
- [docs/devpost-submission.md](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/docs/devpost-submission.md): judge-facing project write-up
- [docs/LabelWise Report.pdf](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/docs/LabelWise%20Report.pdf): report material

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase
- Tesseract.js
- Vitest

## Local Development

### Prerequisites

- Node.js
- npm

### Install dependencies

```sh
npm install
```

### Run the development server

```sh
npm run dev -- --host
```

Then open `http://localhost:8080`.

### Run tests

```sh
npm test
```

### Build for production

```sh
npm run build
```

## Environment Setup

Create a local `.env` file based on [.env.example](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/.env.example):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=gemini-2.5-flash-lite
```

If Supabase keys are not configured, the app can fall back to local demo persistence.
If the Gemini key is not configured, LabelWise falls back to local template-based summaries.

## Supabase Setup

1. Create a Supabase project.
2. Add the keys to `.env`.
3. Run the SQL in [schema.sql](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/supabase/schema.sql).

## Current Limitations

- OCR quality still depends on image clarity and cropping
- ingredient coverage is curated and still growing
- nutrition facts are manual-entry-first in this version
- health-concern logic has been intentionally removed from the user-facing profile flow until it can be rebuilt more rigorously
- the current prototype is English-first, with room for multilingual and Hinglish explanation later

Possible enrichment sources for future rule expansion:

- [Open Food Facts](https://world.openfoodfacts.org/)
- [USDA FoodData Central](https://fdc.nal.usda.gov/)

Future work may include a stronger nutrition-grounded health-context layer once it can be implemented with clearer safety boundaries and more robust evidence handling.

## Repository Description

**LabelWise**: A facts-first, psychology-informed food-label literacy coach that reads the actual label through OCR or manual entry, then explains ingredient, nutrition, and diet-compatibility context without becoming a calorie tracker or medical tool.
