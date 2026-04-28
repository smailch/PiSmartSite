import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HumanForm from "@/components/HumanresourcesForm";
import * as api from "@/lib/api";

const u = userEvent.setup();

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("swr", () => ({
  default: () => ({ data: undefined, isLoading: false, error: undefined, mutate: vi.fn() }),
  mutate: vi.fn(),
}));

describe("HumanForm (HumanresourcesForm)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "createHuman").mockResolvedValue({ _id: "h1" } as never);
    vi.spyOn(api, "updateHuman").mockResolvedValue({ _id: "h1" } as never);
  });

  it("Given empty required fields When submit Then shows validation and does not call createHuman", async () => {
    render(<HumanForm mode="create" />);
    await u.click(
      screen.getAllByRole("button", { name: /Create Person/i })[0]!,
    );
    expect(await screen.findByText(/First name is required/i)).toBeInTheDocument();
    expect(api.createHuman).not.toHaveBeenCalled();
  });

  it("Given valid data When create Then createHuman is called", async () => {
    render(<HumanForm mode="create" />);

    await u.type(screen.getByLabelText(/First Name/i), "Jean");
    await u.type(screen.getByLabelText(/Last Name/i), "Dupont");
    await u.type(screen.getByLabelText(/CIN/i), "AB123456");
    await u.type(screen.getByLabelText(/Phone Number/i), "12345678");
    await u.type(screen.getByLabelText(/Role/i), "Ouvrier");
    await u.type(document.querySelector('input[name="birthDate"]')!, "1990-05-20");

    await u.click(
      screen.getAllByRole("button", { name: /Create Person/i })[0]!,
    );

    await waitFor(() => expect(api.createHuman).toHaveBeenCalledTimes(1));
    const fd = (api.createHuman as ReturnType<typeof vi.fn>).mock.calls[0][0] as FormData;
    expect(fd.get("firstName")).toBe("Jean");
    expect(fd.get("lastName")).toBe("Dupont");
    expect(mockPush).toHaveBeenCalledWith("/humans");
  });
});
