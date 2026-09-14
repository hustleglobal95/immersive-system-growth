import { CatmullRomCurve3, Vector3 } from 'three';

/**
 * Physical centerline of the descending passage, in world coordinates.
 * A slight lateral S-curve and eased vertical drop keeps the tunnel feeling architectural
 * while giving the camera parallax, banking information, and a more convincing drone flight.
 */
export function createPassageCurve() {
  return new CatmullRomCurve3(
    [
      [0, 0, -1.4],
      [-0.12, -0.45, -2.35],
      [-0.28, -1.35, -3.75],
      [0.08, -2.55, -5.15],
      [0.32, -3.7, -6.7],
      [0.15, -4.72, -8.2],
      [-0.08, -5.18, -9.45],
      [0, -5.2, -10],
    ].map((point) => new Vector3(...point)),
    false,
    'catmullrom',
    0.35,
  );
}
