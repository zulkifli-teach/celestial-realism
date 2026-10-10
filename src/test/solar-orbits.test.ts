import { describe, expect, it } from "vitest";
import { orbitPosition, ORBIT_ELEMENTS } from "../lib/solar-orbits.js";

describe("Orbit sesuai lintasan", () => {
  it("keeps Earth's orbit in the XZ plane with the Sun at a focus", () => {
    const earth = ORBIT_ELEMENTS[2];
    const a = 26;
    const e = earth.eccentricity;
    for (let i = 0; i < 100; i++) {
      const p = orbitPosition(a, e, i / 100 * Math.PI * 2);
      expect(p.y).toBe(0);
      expect((p.x + a * e) ** 2 / a ** 2 + p.z ** 2 / (a ** 2 * (1 - e * e))).toBeCloseTo(1, 10);
    }
  });
  it("moves faster at perihelion than aphelion", () => {
    const e = .2056;
    const near = orbitPosition(13, e, 0);
    const nearNext = orbitPosition(13, e, .01);
    const far = orbitPosition(13, e, Math.PI);
    const farNext = orbitPosition(13, e, Math.PI + .01);
    expect(Math.hypot(nearNext.x-near.x, nearNext.z-near.z)).toBeGreaterThan(Math.hypot(farNext.x-far.x, farNext.z-far.z));
  });
  it("keeps each inclined planet on the very same ellipse used to draw its orbit", () => {
    for (const planet of ORBIT_ELEMENTS) {
      const a = 40;
      const p = orbitPosition(a, planet.eccentricity, 1.3, planet.inclination);
      const z = Math.hypot(p.z, p.y);
      expect((p.x+a*planet.eccentricity)**2/a**2 + z**2/(a**2*(1-planet.eccentricity**2))).toBeCloseTo(1, 10);
    }
  });
});