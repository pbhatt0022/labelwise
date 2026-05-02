# LabelWise

**LabelWise** is a health psychology-informed food label scanner designed to help users understand ingredients, flag personally relevant concerns, and make more informed packaged-food choices.

This project was developed as a final-year Health Psychology project focused on **food label literacy in India**, especially the gap between label availability and label understanding. Rather than acting as a clinical tool, LabelWise is designed as a **digital intervention** that reduces cognitive load, explains technical ingredient language, and supports reflective food decision-making.

## Why This App Exists

Food labels are intended to help people make informed choices, but in practice they are often difficult to use. Research explored in this project highlighted several barriers:

- low functional food-label literacy despite growing awareness
- technical ingredient names and INS codes that are hard to interpret
- misleading front-of-pack "health halo" claims
- time pressure during shopping
- difficulty translating concern into action

LabelWise responds to this by turning ingredient lists into clearer, more personalized guidance.

## Health Psychology Framing

The app is grounded primarily in the **COM-B model of behaviour change**, supported by light-touch **nudge principles**.

- **Capability**: LabelWise translates technical ingredient language into plain-language explanations.
- **Opportunity**: The app is mobile-friendly and usable during shopping, making ingredient interpretation more practical in the moment.
- **Motivation**: Personalized flags and explanations make the information more relevant to the user's own allergies, sensitivities, diet preferences, and health concerns.

The app aims not only to identify ingredients, but to support **understanding**, **reflection**, and **better informed action**.

## Core Features

- account-based sign in with Supabase
- saved user preferences linked to the account
- OCR-powered label scanning using in-browser text extraction
- manual ingredient correction and entry fallback
- personalized ingredient analysis using a local rule-based engine
- support for allergies, diet preferences, sensitivities, health concerns, and custom avoids
- saved scans with favorites, notes, and folder organization
- custom folders such as `Safe Foods`, `Grocery`, and `Review Later`
- reflection prompts and explanation cards designed to support food-label literacy

## How The App Works

1. The user creates an account or signs in.
2. The user sets their preferences, such as allergies, sensitivities, diet, and custom ingredients to avoid.
3. The user uploads or scans a food label.
4. OCR extracts ingredient text, which the user can review and edit.
5. The app analyzes the ingredient list against the user's saved profile.
6. Results are shown with explanations, profile-linked reasoning, and suggested actions.
7. The user can save the scan, favorite it, add notes, and organize it into folders.

## Project Structure

- [src](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/src): React application code
- [supabase](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/supabase): Supabase schema and setup files
- [docs](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/docs): presentation and report materials
- [report-draft.md](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/docs/report-draft.md): report draft based on the project research
- [presentation-draft.md](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/docs/presentation-draft.md): presentation draft
- [LabelWise Report.pdf](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/docs/LabelWise%20Report.pdf): uploaded final report material

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

Then open:

- `http://localhost:8080` on your laptop
- the `Network` URL shown in the terminal for phone testing on the same Wi-Fi

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
```

If Supabase keys are not configured, the app can fall back to local demo persistence. For real account-backed sessions, saved scans, and folder persistence across sessions, Supabase should be configured.

## Supabase Setup

1. Create a Supabase project.
2. Add the keys to `.env`.
3. Run the SQL in [schema.sql](C:/Users/priya/OneDrive/Documents/Health%20Psychology%20App/supabase/schema.sql).
4. If your project was created before folder ordering was added, also run the targeted `sort_index` migration in Supabase SQL Editor.

## Current Scope and Limitations

- OCR quality depends on image clarity and user crop/selection
- ingredient coverage is curated and expanding, not exhaustive
- the app is educational and advisory, not diagnostic or medical
- the current prototype is English-first and would benefit from multilingual expansion

## Research and Academic Context

This project is supported by research on:

- food label literacy in India
- ultra-processed foods and ingredient interpretation
- health halo effects
- digital health interventions
- COM-B and behaviour change design

The app was built to show how health psychology can contribute to a practical, user-facing food decision tool.

## Repository Description

**LabelWise**: A health psychology-informed food label scanner that helps users understand ingredients and make more informed food choices.
