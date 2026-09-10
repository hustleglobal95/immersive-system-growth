# Troubleshooting

## Canvas is black

Check browser console errors, camera coordinates, model scale, light intensity and whether the object is behind the camera. Enable the debug HUD with `NEXT_PUBLIC_DEBUG_3D=true`.

## Model loads but is invisible

GLB units may be extremely large or small. Test it at the origin with scale `1`, then inspect bounds and normalize the asset in Blender or your DCC rather than compensating with extreme runtime scale values.

## Scroll and 3D feel disconnected

Verify Lenis is the only smooth-scroll owner and that scene ranges are contiguous. Avoid creating a second scroll engine inside individual components.

## Mobile stutters

Reduce DPR, postprocessing, shadow resolution, transparent materials and texture sizes. Split large environments into zones and load ahead of camera movement.

## Transition looks like a cut

Add a threshold, foreground occluder, persistent object or camera movement that establishes where the next scene exists in relation to the current one.
