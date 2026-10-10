import { describe, expect, it } from 'vitest';
import { DirectionalLight, Group, Vector3 } from 'three';
import { geographicPosition, indonesiaDaylight } from '../lib/solar-daylight';

describe('Indonesia daylight matches the illuminated surface', () => {
  it('places Indonesia at 118° east on the Blue Marble texture, not the opposite hemisphere', () => {
    const point = geographicPosition(.5, 118, 6.36);
    expect(point.x).toBeCloseTo(-2.985725, 4);
    expect(point.z).toBeCloseTo(-5.615333, 4);
    const u = (Math.atan2(point.z, -point.x) / (2 * Math.PI) + 1) % 1;
    expect(u).toBeCloseTo(.5 + 118 / 360, 10);
  });
  it('reports day on the illuminated side and night after half a rotation without a render between reads', () => {
    const earth = new Group();
    const pin = new Group();
    pin.position.set(6, 0, 0);
    earth.add(pin);
    const light = new DirectionalLight();
    light.position.set(40, 0, 0);
    expect(indonesiaDaylight(earth, pin, light).phase).toBe('day');
    earth.rotation.y = Math.PI;
    expect(indonesiaDaylight(earth, pin, light).phase).toBe('night');
  });
  it('uses the same parallel light direction as the renderer even with a translated Earth and target', () => {
    const earth = new Group();
    earth.position.set(100, 0, 0);
    const pin = new Group();
    pin.position.copy(new Vector3(6, 0, 0));
    earth.add(pin);
    const light = new DirectionalLight();
    light.position.set(40, 0, 0);
    light.target.position.set(10, 0, 0);
    expect(indonesiaDaylight(earth, pin, light).phase).toBe('day');
  });
});