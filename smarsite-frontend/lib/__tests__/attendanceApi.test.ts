import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAttendance,
  fetchAttendanceAiAnalysis,
  fetchAttendanceByJob,
  queuePrimeTop3ForInvoice,
  sendPrimeMotivationSmsTop3,
} from "../attendanceApi";

vi.mock("axios", () => ({
  default: { create: vi.fn() },
}));

vi.mock("../api", () => ({
  getApiBaseUrl: () => "http://localhost:3200",
  getAuthHeaderInit: () => ({}),
}));

describe("attendanceApi", () => {
  const get = vi.fn();
  const post = vi.fn();

  beforeEach(() => {
    vi.mocked(axios.create).mockReturnValue({
      get,
      post,
      interceptors: { request: { use: vi.fn() } },
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("createAttendance posts payload", async () => {
    const row = { _id: "1", jobId: "j", resourceId: "r", date: "2026-01-01", status: "present" as const };
    post.mockResolvedValue({ data: row });

    const out = await createAttendance({
      jobId: "j",
      resourceId: "r",
      date: "2026-01-01",
    });
    expect(out).toEqual(row);
    expect(post).toHaveBeenCalledWith("/attendance", expect.any(Object));
  });

  it("fetchAttendanceByJob returns array", async () => {
    get.mockResolvedValue({ data: [{ _id: "1" }] });

    const out = await fetchAttendanceByJob("jid");
    expect(out).toHaveLength(1);
  });

  it("fetchAttendanceByJob coerces non-array to []", async () => {
    get.mockResolvedValue({ data: null });

    const out = await fetchAttendanceByJob("jid");
    expect(out).toEqual([]);
  });

  it("fetchAttendanceAiAnalysis builds query", async () => {
    post.mockResolvedValue({ data: { jobId: "j" } });

    await fetchAttendanceAiAnalysis("j", { year: 2026, month: 4 });
    expect(post).toHaveBeenCalledWith(
      "/attendance/job/j/ai-analysis?year=2026&month=4",
      {},
    );
  });

  it("sendPrimeMotivationSmsTop3 posts", async () => {
    post.mockResolvedValue({ data: { jobId: "j", results: [] } });

    const out = await sendPrimeMotivationSmsTop3("j", { year: 2026, month: 1 });
    expect(out.jobId).toBe("j");
  });

  it("queuePrimeTop3ForInvoice posts", async () => {
    post.mockResolvedValue({
      data: { jobId: "j", results: [], financeEntriesRecorded: 0 },
    });

    const out = await queuePrimeTop3ForInvoice("j");
    expect(post).toHaveBeenCalledWith(
      "/attendance/job/j/prime-invoice/top3",
      {},
    );
    expect(out.jobId).toBe("j");
  });
});
