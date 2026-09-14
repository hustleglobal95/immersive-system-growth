# Forge Studio: refined authoring workspace

## Open the editor

Use Node 22 and the repository's locked dependencies. From a checkout containing
this UI pass, run `npm ci`, then `npm run dev`, and open `/studio` on the server
address printed by Next.js. A GitHub commit does not update a separately running
checkout or publish a public site.

The primary workspace is organized around the scene outline, one live preview,
a contextual inspector, and one chapter transport. The public HELIOT and NOCTERRA
scene definitions and renderers are reused; the editor is not a separate scene
simulation. Existing production panels remain under **All tools**.

## A practical first session

1. Choose HELIOT or NOCTERRA from **Switch project**, then select a chapter.
2. In Camera, use a shot preset for a starting point. For direct framing, enter
   **Orbit / edit view**, compose the shot, and choose **Set start from view** or
   **Set end from view**. The buttons require a ready WebGL preview. Presets and
   framing capture are disabled when authored motion tracks override the camera.
3. Open **Fine-tune camera path** for XYZ, look-at targets, intermediate waypoints,
   top/side diagrams, and the original precise camera controls. Diagram drags
   remain a single undo operation. Presets are not architectural collision checks.
4. Use **Add object** to search bundled models, insert one, and edit its transform.
   Duplicate creates an independent asset definition offset by one world unit.
5. Use Light, Material, and Story for atmosphere, hero-surface treatment, and copy.
   Material presets affect the hero, not all architectural surfaces.
6. Play the chapter sequence, test mobile framing, save a snapshot, then use
   **Review & export**. JSON includes asset references, not binary model files.

The 15/30/60-second transport is a preview pacing control. It does not replace the
runtime's normalized scroll/chapter timing. Changing it does not author a fixed
movie duration into the exported website.

## Workspace tools

- Chapter search filters the outline without changing the selected scene.
- Focus mode gives the preview more room without discarding inspector state.
- Guides and text visibility are preview aids, not exported scene changes.
- Quick actions search commands and chapters. Ctrl/Cmd K opens it; Ctrl/Cmd S
  saves a snapshot. Ctrl/Cmd Z and Shift Z undo and redo outside text fields.
- O toggles orbit view when available. W/E/R choose move/rotate/scale for a
  selected object. F toggles focus mode. Space plays/pauses outside text fields
  and ordinary button activation. Escape exits focus mode or closes a modal.
- Dialogs contain keyboard focus, support Escape, and restore prior focus.
- Numeric transforms commit complete finite values on blur or Enter; intermediate
  typing does not immediately move objects or invalidate the scene.

## Snapshots, persistence, and release

**Save snapshot** records a validated version, keeping the latest 12 per named
experience. **Version history** can restore one; restore is undoable. The shared
Studio draft also uses the existing local autosave/recovery mechanism. Browser
storage is not cloud storage or a durable backup. When storage is blocked/full,
export before leaving. Corrupt histories are not silently overwritten.

Switching experience preserves its outgoing experience draft, but does not change
the Project panel's deployment metadata, asset manifest, or interaction graph.
Review these together in the full Studio before a client release. Export is not
publish, and export does not save a file directly into the repository.

## Import local GLB files

In the full development Studio, choose **Import GLB** or drop a file on the preview.
The local endpoint is deliberately disabled in production. It accepts same-origin
Studio requests only, enforces a 25 MiB limit, checks the GLB v2 header/JSON chunk,
and rejects external buffer/image references. Embedded PNG/JPEG/WebP data is
allowed. Files are written under `public/models/studio/` using a SHA-256 name.
An identical upload safely reuses the same bytes.

This is asset intake, not retopology, texture baking, malware certification, or
license clearance. Inspect and optimize large assets before shipping. Keep the
new files with the project when exporting/moving its configuration. Production
hosted upload needs an authenticated asset service; this endpoint is not one.

## Portable edition

Run `node scripts/portable-studio/build.mjs` to create
`dist/forge-studio-portable.html`. It contains the actual workspace components,
HELIOT/NOCTERRA configs, and bundled model/texture assets in one document. No font
files are embedded. Open the HTML in a browser capable of running local HTML.

The portable edition has no backend and cannot write into a project folder or
load unbundled hosted assets. Local GLB intake, full delivery/project panels, and
hosted integrations require the full development Studio. Browser restrictions
can disable local storage and WebGL for local files. Export a JSON backup, and
use the full Studio on localhost when those restrictions apply.

When WebGL is unavailable, the editor displays an explicitly labelled still
reference and keeps schema editing, presets, snapshots, and export available.
That still does not move when camera/object values change and is not a live
render. Orbit/framing capture is disabled in this state.

## Boundaries

Built-in HELIOT terrain, tunnel, gallery, and architecture are still code-authored.
This is a scene, camera, motion, and content editor, not a polygon-modeling tool.
It has no AI generation endpoint, no cloud collaboration, and no automatic public
deployment. No Ambrel project was invented or substituted for a missing source.

## Verification of this UI pass

The production Next.js build, full repository check, 169 unit tests, TypeScript,
and lint completed successfully (8 existing lint warnings). The authoring helpers
have tests for immutable camera presets, valid capture, independent asset copies,
bounded version history, corruption/quota handling, and GLB validation.

The restricted review browser could not navigate to localhost or create WebGL.
An offline component host exercised the same bundled UI with embedded assets and
an explicitly in-memory storage test double: 18 UI checks passed, including a real
JSON download containing the edited values. This verifies controls/config flow and
the genuine unsupported-WebGL fallback, not live 3D rendering, native storage
durability, GPU performance, visual camera clearance, or drag-gizmo accuracy.

Eight integration checks against the actual local Next development server passed,
covering the Studio route, upload rejection rules, valid import, byte-for-byte
serving, and idempotent import. Run the existing real-browser Studio verification
on an unrestricted WebGL-capable machine before a production client handoff.
