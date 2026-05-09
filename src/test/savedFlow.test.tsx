import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

import { AppStateProvider } from "@/context/AppStateContext";
import { analyzeLabel } from "@/lib/labelAnalysis";
import type { ScanFolder, ScanRecord, UserProfile } from "@/lib/types";
import HistoryScreen from "@/pages/HistoryScreen";
import ResultsScreen from "@/pages/ResultsScreen";

const accountStorageKey = "food-scanner-accounts";
const profileStorageKey = "food-scanner-profiles";
const scanStorageKey = "food-scanner-scans";
const folderStorageKey = "food-scanner-folders";
const reflectionStorageKey = "food-scanner-reflections";
const sessionStorageKey = "food-scanner-session";

const userId = "user-1";
const baseProfile: UserProfile = {
  allergies: [],
  health: [],
  diet: [],
  sensitivities: [],
  selectedConcernIds: [],
  customAvoids: [],
  dailySugarPreferenceG: 10,
  dailySodiumPreferenceMg: 400,
  dailySaturatedFatPreferenceG: 4,
};

const folder: ScanFolder = {
  id: "folder-1",
  userId,
  name: "Review Later",
  createdAt: "2026-05-04T00:00:00.000Z",
  updatedAt: "2026-05-04T00:00:00.000Z",
  sortIndex: 0,
};

function createStoredScan(): ScanRecord {
  return {
    id: "scan-1",
    userId,
    productName: "Protein Crunch Cereal",
    brandName: "Demo Pantry",
    ingredientText: "Whole grain oats, sugar, whey protein isolate, palm oil, iodised salt.",
    nutritionFacts: {
      servingSize: "40g",
      sugarG: 12,
      proteinG: 11,
      sodiumMg: 210,
      saturatedFatG: 2,
      caloriesPerServing: 180,
    },
    createdAt: "2026-05-04T00:00:00.000Z",
    analysis: analyzeLabel({
      ingredientText: "Whole grain oats, sugar, whey protein isolate, palm oil, iodised salt.",
      profile: baseProfile,
      nutritionFacts: {
        servingSize: "40g",
        sugarG: 12,
        proteinG: 11,
        sodiumMg: 210,
        saturatedFatG: 2,
        caloriesPerServing: 180,
      },
    }),
    profileSnapshot: baseProfile,
    isFavorite: false,
  };
}

function seedLocalSession(scan: ScanRecord) {
  localStorage.setItem(
    accountStorageKey,
    JSON.stringify([
      {
        id: userId,
        email: "test@example.com",
        password: "pw",
        displayName: "Test User",
        createdAt: "2026-05-04T00:00:00.000Z",
        authProvider: "local",
      },
    ]),
  );
  localStorage.setItem(profileStorageKey, JSON.stringify({ [userId]: baseProfile }));
  localStorage.setItem(scanStorageKey, JSON.stringify([scan]));
  localStorage.setItem(folderStorageKey, JSON.stringify([folder]));
  localStorage.setItem(reflectionStorageKey, JSON.stringify([]));
  localStorage.setItem(sessionStorageKey, JSON.stringify(userId));
}

function renderSavedFlow() {
  return render(
    <MemoryRouter initialEntries={["/results"]}>
      <AppStateProvider>
        <Routes>
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
        </Routes>
      </AppStateProvider>
    </MemoryRouter>,
  );
}

describe("saved scan flows", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows nutrition details for a saved scan", async () => {
    seedLocalSession(createStoredScan());
    renderSavedFlow();

    expect(await screen.findByText("Nutrition Overview")).toBeInTheDocument();
    expect(screen.getByText("Protein Crunch Cereal")).toBeInTheDocument();
  });

  it("lets a saved scan move into a folder and reopen from history", async () => {
    seedLocalSession(createStoredScan());
    renderSavedFlow();

    fireEvent.change(screen.getByLabelText("Folder"), { target: { value: folder.id } });
    fireEvent.click(screen.getByRole("button", { name: /Saved/i }));

    expect(await screen.findByText("Your Library")).toBeInTheDocument();
    expect(screen.getAllByText("Review Later").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: /Protein Crunch Cereal/i })[0]);

    await waitFor(() => {
      expect(screen.getByText("Nutrition Overview")).toBeInTheDocument();
      expect(screen.getByText("Protein Crunch Cereal")).toBeInTheDocument();
    });
  });
});
