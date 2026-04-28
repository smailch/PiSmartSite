import { describe, it, expect } from "vitest";
import { jobStatusLabelEn, projectStatusLabelEn } from "@/lib/projectStatusLabel";

describe("projectStatusLabelEn", () => {
  it("Given 'En cours' When label Then returns In progress", () => {
    expect(projectStatusLabelEn("En cours")).toBe("In progress");
  });
  it("Given 'Terminé' When label Then returns Completed", () => {
    expect(projectStatusLabelEn("Terminé")).toBe("Completed");
  });
  it("Given 'En retard' When label Then returns Behind schedule", () => {
    expect(projectStatusLabelEn("En retard")).toBe("Behind schedule");
  });
  it("Given value outside union When label Then default branch returns it", () => {
    expect(projectStatusLabelEn("Custom" as "En cours")).toBe("Custom");
  });
});

describe("jobStatusLabelEn", () => {
  it("Given 'Planifié' When label Then returns Planned", () => {
    expect(jobStatusLabelEn("Planifié")).toBe("Planned");
  });
  it("Given 'Terminé' When label Then returns Completed", () => {
    expect(jobStatusLabelEn("Terminé")).toBe("Completed");
  });
});
