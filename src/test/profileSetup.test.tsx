import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const saveProfileMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/context/AppStateContext", () => ({
  useAppState: () => ({
    profile: {
      allergies: [],
      health: [],
      diet: [],
      sensitivities: [],
      selectedConcernIds: [],
      customAvoids: [],
    },
    saveProfile: saveProfileMock,
  }),
}));

import ProfileSetup from "@/pages/ProfileSetup";

describe("ProfileSetup sensitivities", () => {
  it("resets expanded sensitivity panels after deselecting and reselecting", () => {
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
});
