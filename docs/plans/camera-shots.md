# Subject camera shot plan

Add opt-in camera shots to the scene lab; existing scene choreography remains the default.

| Shot | Purpose | Start → end | Path | Object/environment | Typography and interaction | Next scene |
| --- | --- | --- | --- | --- | --- | --- |
| Low reveal | Give the subject scale | Low, distant three-quarter → raised near view | subject-orbit | Existing sampled states | Existing synchronized copy; lab scrub | Export endpoints and reconcile with next configured scene |
| Hero orbit | Reveal silhouette and materials | Left three-quarter → right three-quarter | subject-orbit | Existing sampled states | Existing copy; lab scrub | Match next start to exported end |
| Detail approach | Inspect surface detail | Wider three-quarter → closer, narrower lens | subject-orbit | Existing sampled states | Existing copy; lab scrub | Match next start; hand-author focus target for a specific component |

All shots use a user-supplied world-space subject radius and the current camera target. Compute fit distance from sphere radius, lens and aspect. Mobile export uses 9:16 framing. The orbit interpolates radius, azimuth and elevation around a moving look-at target; no straight-line chord through the subject. No automatic scene collision avoidance, inferred model bounds, depth of field or new assets. Reduced motion retains the original static camera. Lab preview is temporary, resets with lab state, and exports validated camera definitions for deliberate integration.
