import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { UserProfile } from "@/lib/types";

const saveProfileMock = vi.fn().mockResolvedValue(undefined);
const profileState = {
  current: {
    allergies: [],
    health: [],
    diet: [],
    sensitivities: [],
    selectedConcernIds: [],
    customAvoids: [],
  } as UserProfile,
};

vi.mock("@/context/AppStateContext", () => ({
  useAppState: () => ({
    profile: profileState.current,
    saveProfile: saveProfileMock,
  }),
}));

import ProfileSetup from "@/pages/ProfileSetup";

describe("ProfileSetup sensitivities", () => {
  it("resets expanded sensitivity panels after deselecting and reselecting", () => {
    profileState.current = {
      allergies: [],
      health: [],
      diet: [],
      sensitivities: [],
      selectedConcernIds: [],
      customAvoids: [],
    };

    render(
      <MemoryRouter>
        <ProfileSetup />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByRole("button", { name: "MSG" }));
    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByRole("button", { name: "Hide details" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Systematic review on MSG and gut-microbiota changes/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "MSG" }));
    expect(screen.queryByRole("button", { name: "Hide details" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "MSG" }));

    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hide details" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Systematic review on MSG and gut-microbiota changes/i })).not.toBeInTheDocument();
  });

  it("repopulates the form when a saved profile arrives after mount", () => {
    profileState.current = {
      allergies: [],
      health: [],
      diet: [],
      sensitivities: [],
      selectedConcernIds: [],
      customAvoids: [],
    };

    const view = render(
      <MemoryRouter>
        <ProfileSetup />
      </MemoryRouter>,
    );

    profileState.current = {
      allergies: ["Milk"],
      health: [],
      diet: ["Vegetarian"],
      sensitivities: ["MSG"],
      selectedConcernIds: ["milk_allergy", "vegetarian", "avoid_msg"],
      customAvoids: [],
      dailySugarPreferenceG: 12,
      dailySodiumPreferenceMg: 1500,
      dailySaturatedFatPreferenceG: 9,
    };

    view.rerender(
      <MemoryRouter>
        <ProfileSetup />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByDisplayValue("12")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1500")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9")).toBeInTheDocument();
  });
});
