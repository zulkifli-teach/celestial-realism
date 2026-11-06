import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SolarLab } from "@/components/SolarLab";
import { QUESTIONS } from "@/lib/assessment";

vi.mock("@/lib/solar-simulator.js", () => ({ mountSolarSimulator: vi.fn(() => () => {}) }));

describe("assessment preserves the live lab", () => {
  it("keeps the same canvas after completing, closing and reopening the assessment", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { mountSolarSimulator } = await import("@/lib/solar-simulator.js");
    const { unmount } = render(<SolarLab />);
    await waitFor(() => expect(mountSolarSimulator).toHaveBeenCalledTimes(1));
    const canvas = document.getElementById("webgl-canvas");
    const open = document.getElementById("btn-assessment");
    if (!canvas || !open) throw new Error("Missing lab controls");

    fireEvent.click(open);
    expect(document.getElementById("webgl-canvas")).toBe(canvas);
    for (const q of QUESTIONS) {
      fireEvent.click(screen.getByRole("button", { name: `${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}` }));
      fireEvent.click(screen.getByRole("button", { name: q === QUESTIONS.at(-1) ? "Lihat Hasil" : "Soal Berikutnya →" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Tutup asesmen" }));
    expect(document.getElementById("webgl-canvas")).toBe(canvas);
    expect(canvas.isConnected).toBe(true);
    fireEvent.click(open);
    expect(screen.getByText("Soal 1 dari 10")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tutup asesmen" }));
    expect(document.getElementById("webgl-canvas")).toBe(canvas);
    expect(mountSolarSimulator).toHaveBeenCalledTimes(1);
    unmount();
    vi.restoreAllMocks();
  });
});