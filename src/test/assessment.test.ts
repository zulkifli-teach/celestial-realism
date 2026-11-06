import { describe, it, expect } from "vitest";
import { QUESTIONS, checkAnswer } from "@/lib/assessment";

describe("asesmen", () => {
  it("rotasi menyebabkan siang dan malam", () => {
    const q = QUESTIONS.find((x) => x.q.startsWith("Akibat dari rotasi"))!;
    expect(q.options[q.answer]).toBe("Pergantian siang dan malam");
    expect(checkAnswer(q, 0)).toBe(false);
  });
  it("revolusi Bumi sekitar 365¼ hari", () => {
    const q = QUESTIONS.find((x) => x.q.includes("satu kali revolusi"))!;
    expect(checkAnswer(q, q.options.indexOf("365¼ hari"))).toBe(true);
  });
});
