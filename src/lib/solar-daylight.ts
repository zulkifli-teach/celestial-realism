import { Vector3, type Object3D, type DirectionalLight } from 'three';

/** Blue Marble has longitude 0 at u=.5; Three's sphere begins at -X. */
export function geographicPosition(latitude: number, longitude: number, radius: number) {
  const lat = latitude * Math.PI / 180;
  const lon = longitude * Math.PI / 180;
  return new Vector3(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon));
}

export function indonesiaDaylight(earth: Object3D, beacon: Object3D, light: DirectionalLight) {
  // Refresh the whole ancestry before reading positions, including while paused.
  earth.updateWorldMatrix(true, true);
  light.updateWorldMatrix(true, false);
  light.target.updateWorldMatrix(true, false);
  const normal = beacon.getWorldPosition(new Vector3()).sub(earth.getWorldPosition(new Vector3())).normalize();
  // Directional lighting is parallel: use the light's target, not Earth's center.
  const towardSun = light.getWorldPosition(new Vector3()).sub(light.target.getWorldPosition(new Vector3())).normalize();
  const cosine = normal.dot(towardSun);
  return { cosine, phase: cosine > 0 ? 'day' : cosine < 0 ? 'night' : 'horizon' };
}