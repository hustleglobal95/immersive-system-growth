import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import heliot from '../../src/experiences/heliot/experience.json';
import projectRaw from '../../clients/heliot/studio-project.json';
import manifest from '../../config/asset-manifest.json';
import graphRaw from '../../config/interaction-graph.json';
import { parseExperience } from '../../src/lib/configSchema';
import { parseStudioProject } from '../../src/platform/studioSchema';
import { parseInteractionGraph } from '../../src/lib/interactionGraph';
import { StudioWorkspace } from '../../src/studio/StudioWorkspace';
import { useStudioDraft } from '../../src/studio/useStudioDraft';
import { StudioIcon } from '../../src/studio/ui/StudioControls';
import type { AssetManifest } from '../../src/types/assets';
const initial = parseExperience(heliot), project = parseStudioProject(projectRaw), graph = parseInteractionGraph(graphRaw);
function PortableStudio() {
  const draft = useStudioDraft(initial, project, manifest as AssetManifest, graph);
  const [active, setActive] = useState(0);
  return <main className="studio-shell studio-pro-shell">
    <header className="studio-header"><div><span className="studio-brand"><StudioIcon name="layers" size={22}/>FORGE<span>STUDIO</span></span><span className="pro-header-caption">Portable scene editor</span></div><div className="studio-header__status" data-valid={!draft.validation.length}><i/>{draft.validation.length ? 'Check configuration' : 'Experience schema valid'}</div><div className="studio-actions"><span>OFFLINE EDITION</span></div></header>
    <nav className="studio-tabs" aria-label="Editing workspace"><button aria-current="page"><StudioIcon name="cube"/>Workspace</button><span className="pro-workflow-note">Compose <i/> Direct <i/> Light <i/> Export</span></nav>
    {draft.storageNotice && <p className="pro-info" role="alert">{draft.storageNotice}</p>}
    {draft.hydrated && <StudioWorkspace experience={draft.experience} setExperience={draft.setExperience} active={Math.min(active,draft.experience.scenes.length-1)} setActive={setActive} undo={draft.undoExperience} redo={draft.redoExperience} canUndo={draft.canUndoExperience} canRedo={draft.canRedoExperience}/>}
    <footer className="studio-footer"><span>FORGE STUDIO / Portable workspace</span><span>Embedded reference assets. Export JSON for the full project. Not a deployment.</span></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<PortableStudio/>);
