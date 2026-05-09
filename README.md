# LabelWise

**LabelWise** is a facts-first, psychology-informed, AI-assisted food-label literacy app.

It is intentionally **not** a barcode scanner, calorie tracker, dieting app, or weight-loss tool. LabelWise helps people read the **actual label** on a packaged food, understand what it says, and reflect on what may be relevant for them — matched to their own saved preferences.

---

## Demo

**Demo Video** — overview, research framing, and live feature walkthrough with voiceover

[![Watch the LabelWise Demo](https://img.youtube.com/vi/Y_wO1iJ5YHY/maxresdefault.jpg)](https://youtu.be/Y_wO1iJ5YHY)

**App Tutorial** — full screen recording walkthrough of every feature and screen

[![Watch the LabelWise App Tutorial](https://img.youtube.com/vi/SWw5AXbbv6o/maxresdefault.jpg)](https://youtu.be/SWw5AXbbv6o)

---

## Why This Was Built

Consumer research consistently shows that label-reading awareness is high, but functional use is low. Studies report that most people notice nutrition labels, yet fewer than half use them to make a decision. The gap is not motivation — it is access to understanding.

Most food-label apps assume you already understand what you are reading, or they replace reading entirely with a barcode lookup. Neither approach builds food-label literacy.

This project started from a research report on health psychology and consumer behaviour (see [`docs/LabelWise Report.pdf`](docs/LabelWise%20Report.pdf)) that examined why that gap exists and what a better intervention might look like. LabelWise is the practical outcome: an app grounded in the **COM-B model of behaviour change** that works from the actual text on the label rather than a product database.

**Capability** — translates technical ingredient names, INS codes, and nutrition figures into simpler, contextualised language.  
**Opportunity** — supports in-the-moment label reading on a mobile-friendly interface during a real shopping trip.  
**Motivation** — makes findings personally relevant through allergies, sensitivities, diet preferences, custom avoids, and user-defined food-label preferences.

---

## What Makes LabelWise Different

Most food apps use barcode lookup. That breaks when the product is:

- local or regional
- newly launched
- from a small brand
- imported or repackaged
- absent from or incomplete in any product database

LabelWise is designed to keep working when barcode-first products fail:

- OCR-based ingredient label extraction (camera or photo upload)
- Manual correction after OCR
- Manual ingredient entry fallback
- Manual nutrition entry fallback
- Local rule-based analysis engine — no product database required
- Personalised saved preferences
- Saved scans, notes, favorites, and folders for grocery planning

This makes LabelWise especially useful for regional packaged foods and mixed retail environments where database coverage is inconsistent.

---

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

The interface uses phrases such as `Good to know`, `Worth reviewing`, `Matched your saved preference`, and `Consider another product`.

---

## Features

- Account-based sign in with Supabase or a local fallback (no network required)
- OCR-powered ingredient extraction in the browser via Tesseract.js or optional AWS Textract
- Manual ingredient correction and full manual entry fallback
- Profile-based ingredient analysis using a local rule engine
- Facts-first dietary compatibility engine for Vegan, Vegetarian, Keto-style, Gluten-free, Dairy-free, and Nut-free
- Custom avoids — add any ingredient or group you personally want to flag
- Optional food-label preferences for sugar, sodium, and saturated fat
- Nutrition Reality Check with manual per-serving nutrition entry
- Template-based Smart Explanation Mode that works without an API key
- Optional Gemini-powered AI summary with personalised plain-language explanation
- Saved scans, notes, favorites, and folders such as `Go-To Options`, `Grocery`, and `Review Later`

---

## Facts-First Architecture

LabelWise does **not** use AI as the source of truth.

Structured analysis is grounded in:

- curated ingredient concern rules
- curated dietary compatibility rules
- additive and INS-code mappings
- user-defined allergies, sensitivities, diet preferences, and custom avoids
- nutrition values entered from the label
- user-defined food-label preferences
- transparent local comparison logic

AI is limited to the explanation layer:

- plain-language summaries
- simpler wording for technical terms
- optional Gemini-powered personalised explanation on the results screen
- optional AI review hints that never override the final compatibility label

If no Gemini API key is configured the app falls back to built-in template-based explanations.

---

## Dietary Compatibility

The compatibility engine uses visible ingredient text and curated rules.

| Result | Meaning |
|--------|---------|
| `Not compatible` | A visible ingredient directly conflicts with the selected preference |
| `Needs review` | The ingredient source may vary by manufacturer or the wording is ambiguous |
| `Compatible` | No obvious issue was found in the visible ingredient list |
| `Unknown` | Not enough visible ingredient text to classify confidently |

This engine is rule-based. AI is not the source of truth for dietary classification.

> Diet compatibility is based on visible label text and curated rules. Ingredient origins can vary by manufacturer. Please review the package and consult qualified professionals for allergies or medical dietary needs.

---

## Safety Boundaries

LabelWise is educational, non-diagnostic, non-restrictive, and transparent. It is **not medical advice**. It does not diagnose conditions, determine medical safety, prescribe diets, or declare any food forbidden.

---

## Demo Examples

The app includes four fixed demo examples chosen to show the core novelty to judges quickly:

| Demo | What it shows |
|------|--------------|
| High protein cereal | A protein-forward cereal that still carries notable sugar and sodium context |
| No added sugar bites | A lower-sugar-style snack where ingredient context still matters (maltodextrin, sorbitol) |
| Vegan review example | How whey and milk powder trigger a facts-first vegan compatibility check |
| Low-carb review example | How sugar, maltodextrin, and refined flour are caught in a keto-style check |

These demos highlight why LabelWise is not just another barcode app and why OCR-and-manual-entry-first design matters.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| State management | React Context + TanStack React Query |
| Auth + database | Supabase (PostgreSQL with Row Level Security) |
| OCR (browser) | Tesseract.js |
| OCR (optional, stronger) | AWS Textract via local proxy |
| AI analysis | Google Gemini API (`gemini-2.5-flash-lite` default) |
| Testing | Vitest + Testing Library |

---

## Repository Structure

```
├── docs/                         Hackathon materials and research report
│   ├── LabelWise Report.pdf      The health psychology research behind this project
│   └── devpost-submission.md     Judge-facing project write-up
├── server/                       Local AWS Textract proxy (optional)
├── src/
│   ├── components/               Reusable UI components
│   ├── context/                  Global app state (AppStateContext)
│   ├── data/                     Curated ingredient and diet rule databases
│   │   ├── ingredientKnowledge.ts   Ingredient entities, aliases, and concern rules
│   │   ├── dietRules.ts             Dietary compatibility rules
│   │   ├── demoScans.ts             Fixed demo examples
│   │   └── profileOptions.ts        Profile configuration options
│   ├── hooks/                    Custom React hooks
│   ├── lib/                      Core logic
│   │   ├── analysis.ts              Rule-based ingredient analysis engine
│   │   ├── dietCompatibility.ts     Dietary compatibility matching
│   │   ├── gemini.ts                Google Gemini integration
│   │   ├── ocr.ts                   OCR orchestration (Tesseract + Textract)
│   │   ├── nutrition.ts             Nutrition context calculations
│   │   ├── types.ts                 TypeScript type definitions
│   │   └── supabase.ts              Supabase client initialisation
│   ├── pages/                    Screen components (9 routes)
│   └── test/                     Test suite
├── supabase/
│   └── schema.sql                Database schema and RLS policies
├── .env.example                  Environment variable template
└── vite.config.ts                Vite config with Textract proxy plugin
```

---

## Local Development

### Prerequisites

- Node.js 18+ (or Bun)
- npm (or bun)

### Install dependencies

```sh
npm install
```

### Environment setup

Copy `.env.example` to `.env` and fill in your values:

```sh
cp .env.example .env
```

```env
# Required for cloud auth and data persistence
# Without these the app runs in local-only demo mode
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Required for AI-powered explanations
# Without this the app falls back to template-based summaries
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
VITE_GEMINI_MODEL=gemini-2.5-flash-lite
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

---

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Copy the project URL and anon key into your `.env`.
3. In the Supabase SQL editor, run the full schema from [`supabase/schema.sql`](supabase/schema.sql). This creates the `user_profiles`, `scan_records`, `scan_folders`, and `reflection_entries` tables with Row Level Security policies.

If Supabase is not configured the app falls back to local browser storage — useful for demos and offline use.

---

## Optional: AWS Textract OCR

For stronger OCR than the in-browser Tesseract fallback, LabelWise can call AWS Textract through a small local proxy.

Create a `.env.local` file (in addition to `.env`) with your AWS credentials:

```env
VITE_TEXTRACT_ENDPOINT=http://127.0.0.1:8787/api/ocr/textract
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=us-east-1
```

Run the proxy in one terminal:

```sh
npm run dev:textract
```

And the app in another:

```sh
npm run dev -- --host
```

When the proxy is unavailable or unconfigured, LabelWise automatically falls back to Tesseract.

---

## Current Limitations

- OCR quality depends on image clarity and cropping
- Ingredient coverage is curated and still growing
- Nutrition facts are manual-entry-first in this version
- The prototype is English-first; multilingual support is a future goal
- Health-concern scoring based on clinical evidence thresholds is a planned future layer

Possible enrichment sources for future rule expansion:

- [Open Food Facts](https://world.openfoodfacts.org/)
- [USDA FoodData Central](https://fdc.nal.usda.gov/)

---

## Research Reference

This project is grounded in original health psychology research. The full report is available at [`docs/LabelWise Report.pdf`](docs/LabelWise%20Report.pdf). It covers the label-reading gap, COM-B model application, nudge principles, and the design rationale behind the facts-first architecture.

---

**LabelWise**: A facts-first, psychology-informed food-label literacy coach that reads the actual label through OCR or manual entry, then explains ingredient, nutrition, and diet-compatibility context — matched to what you already care about, without becoming a calorie tracker or medical tool.
