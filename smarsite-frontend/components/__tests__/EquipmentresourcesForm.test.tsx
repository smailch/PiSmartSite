import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EquipmentForm from "@/components/EquipmentresourcesForm";
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

describe("EquipmentForm (EquipmentresourcesForm)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "createEquipment").mockResolvedValue({ _id: "e1", name: "E" } as never);
    vi.spyOn(api, "updateEquipment").mockResolvedValue({ _id: "e1", name: "E" } as never);
  });

  it("Given empty fields When submit Then shows name error and does not call createEquipment", async () => {
    render(<EquipmentForm mode="create" />);
    await u.click(
      screen.getAllByRole("button", { name: /Create Equipment/i })[0]!,
    );
    const errLines = await screen.findAllByText(/required/i);
    expect(
      errLines.some((e) => (e.textContent ?? "").includes("Equipment name")),
    ).toBe(true);
    expect(api.createEquipment).not.toHaveBeenCalled();
  });

  it("Given valid data When create Then createEquipment is called", async () => {
    render(<EquipmentForm mode="create" />);

    await u.type(document.querySelector('input[name="name"]')!, "Pelle");
    await u.type(document.querySelector('input[name="category"]')!, "Terrassement");
    await u.type(document.querySelector('input[name="serialNumber"]')!, "SN-01");
    await u.type(document.querySelector('input[name="model"]')!, "M-200");
    await u.type(document.querySelector('input[name="brand"]')!, "Cat");
    await u.type(document.querySelector('input[name="location"]')!, "Chantier A");
    await u.type(document.querySelector('input[name="purchaseDate"]')!, "2020-01-10");
    await u.type(document.querySelector('input[name="lastMaintenanceDate"]')!, "2024-06-01");

    await u.click(
      screen.getAllByRole("button", { name: /Create Equipment/i })[0]!,
    );

    await waitFor(() => expect(api.createEquipment).toHaveBeenCalledTimes(1));
    const payload = (api.createEquipment as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.name).toBe("Pelle");
    expect(mockPush).toHaveBeenCalledWith("/equipment");
  });
});
