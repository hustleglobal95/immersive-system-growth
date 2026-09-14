import { CatmullRomCurve3, Vector3 } from 'three';

/** The physical centerline of the descending passage, in world coordinates. */
export function createPassageCurve() {
  return new CatmullRomCurve3([[0,0,-1.4],[0,-1.5,-4],[0,-3.5,-6],[0,-5.2,-9.5],[0,-5.2,-10]].map(p=>new Vector3(...p)));
}
