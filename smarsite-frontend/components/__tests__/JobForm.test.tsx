import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobForm from "@/components/JobForm";
import * as api from "@/lib/api";

const u = userEvent.setup();

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
}));

const mockHumans = [
  { _id: "h1", firstName: "Anna", lastName: "B", role: "Ouvrier", availability: true },
];
const mockEquip = [
  { _id: "e1", name: "Grue", brand: "X", model: "Y", availability: true },
];
const mockTasks = [{ _id: "t1", title: "Task One" }];

vi.mock("swr", () => ({
  default: (key: string | (() => string)) => {
    const k = typeof key === "function" ? (key as () => string)() : String(key);
    if (k === "/humans" || k.startsWith("/humans?")) {
      return { data: mockHumans, isLoading: false, error: undefined, mutate: vi.fn() };
    }
    if (k.startsWith("/equipment")) {
      return { data: mockEquip, isLoading: false, error: undefined, mutate: vi.fn() };
    }
    if (k.startsWith("/tasks")) {
      return { data: mockTasks, isLoading: false, error: undefined, mutate: vi.fn() };
    }
    return { data: undefined, isLoading: false, error: undefined, mutate: vi.fn() };
  },
  mutate: vi.fn(),
}));

describe("JobForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "createJob").mockResolvedValue({ _id: "j1" } as never);
    vi.spyOn(api, "updateJob").mockResolvedValue({ _id: "j1" } as never);
  });

  it("Given empty form When submit Then shows title error and does not call createJob", async () => {
    render(<JobForm mode="create" />);
    await u.click(screen.getAllByRole("button", { name: /Create Job/i })[0]!);
    expect(await screen.findByText(/Title is required/i)).toBeInTheDocument();
    expect(api.createJob).not.toHaveBeenCalled();
  });

  it("Given valid fields When create Then createJob is called and navigates to /jobs", async () => {
    render(<JobForm mode="create" />);

    await u.type(
      screen.getAllByPlaceholderText(/Enter job title/i)[0]!,
      "Mon job",
    );
    const taskSelect = document.querySelector(
      'select[name="taskId"]',
    ) as HTMLSelectElement;
    await u.selectOptions(taskSelect, "t1");
    await u.type(document.querySelector('input[name="startTime"]')!, "2026-06-15T08:00");
    await u.type(document.querySelector('input[name="endTime"]')!, "2026-06-15T12:00");

    await u.click(screen.getAllByRole("button", { name: /Create Job/i })[0]!);

    await waitFor(() => expect(api.createJob).toHaveBeenCalledTimes(1));
    const payload = (api.createJob as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.title).toBe("Mon job");
    expect(payload.taskId).toBe("t1");
    expect(mockPush).toHaveBeenCalledWith("/jobs");
  });
});
