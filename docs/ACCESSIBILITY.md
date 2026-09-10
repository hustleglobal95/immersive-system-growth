# Accessibility

Primary content is an ordinary server-rendered anchored document. It is visible without JavaScript, without WebGL and at global timeline endpoints. Headings use one h1 and subsequent h2 elements. The decorative Canvas remains aria-hidden; every hotspot has an equivalent native details/summary in the document.

Keyboard navigation uses native anchors and a skip link. Global cinematic shortcuts ignore focused controls/editable fields. The optional nonmodal hotspot dialog moves focus on open, closes with Escape and returns focus when possible; it does not claim modal semantics or trap focus.

Reduced motion fixes the camera and hero to an initial pose, disables Lenis smoothing, parallax, particles/postprocessing and autonomous animation, and changes the narrative to compact ordinary flow. It can follow the system preference or be previewed in /lab. A change to the OS preference is observed live.

Validate content contrast against project artwork, zoom/text wrapping, touch targets and actual screen-reader navigation before client release. The supplied dark panel backdrop is a starting treatment, not a guarantee for arbitrary CSS/theme changes.
