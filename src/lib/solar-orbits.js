// Semimajor axes are presentation units. Eccentricity, inclinations and periods
// are astronomical values; orbital geometry and animation use this same solver.
export function orbitPosition(a, e, meanAnomaly, inclination = 0) {
  let E = meanAnomaly;
  for (let i = 0; i < 10; i++) E -= (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
  const z = -a * Math.sqrt(1 - e * e) * Math.sin(E);
  const tilt = inclination * Math.PI / 180;
  return { x: a * (Math.cos(E) - e), y: inclination === 0 ? 0 : z * Math.sin(tilt), z: z * Math.cos(tilt) };
}
export const ORBIT_ELEMENTS = [
  { eccentricity: .2056, inclination: 7.005, periodDays: 87.969, distanceKm: 57.9, axialTilt: .034 },
  { eccentricity: .0068, inclination: 3.395, periodDays: 224.701, distanceKm: 108.2, axialTilt: 177.36 },
  { eccentricity: .0167, inclination: 0, periodDays: 365.256, distanceKm: 149.6, axialTilt: 23.44 },
  { eccentricity: .0934, inclination: 1.85, periodDays: 686.98, distanceKm: 227.9, axialTilt: 25.19 },
  { eccentricity: .0489, inclination: 1.303, periodDays: 4332.59, distanceKm: 778.6, axialTilt: 3.13 },
  { eccentricity: .0565, inclination: 2.485, periodDays: 10759.22, distanceKm: 1433.5, axialTilt: 26.73 },
  { eccentricity: .0457, inclination: .773, periodDays: 30688.5, distanceKm: 2872.5, axialTilt: 97.77 },
  { eccentricity: .0113, inclination: 1.77, periodDays: 60182, distanceKm: 4495.1, axialTilt: 28.32 },
];
