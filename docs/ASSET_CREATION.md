# Forge Asset Creator

`/studio/assets/create` closes the gap between Creative Agent recommendations and an editable Forge draft.

## Nontechnical flow

1. Creative Agent proposes a required scene asset.
2. **Create this asset** opens Asset Creator with the asset name, type, priority, scene and reason already filled in.
3. The user can rewrite the generation brief or accept Forge's production prompt.
4. Forge submits the request server-side, tracks the asynchronous provider job and keeps credentials out of browser code.
5. For Meshy text-to-3D, Forge creates a geometry preview and automatically starts the refine/PBR stage after the preview succeeds.
6. When the provider result is ready, **Use in current project** hashes the generated file, registers it in the local draft manifest and assigns it to the target scene or hero model.
7. The generated provider URL is bridged through a root-relative Forge API path so the current draft can use it immediately.

## Connected providers

### Meshy — 3D

- Server credential: `MESHY_API_KEY`
- Forge uses Meshy Text to 3D v2.
- Preview: `POST https://api.meshy.ai/openapi/v2/text-to-3d` with `mode: preview`.
- Refine: the same endpoint with `mode: refine`, PBR enabled and GLB requested.
- Status: `GET https://api.meshy.ai/openapi/v2/text-to-3d/:id`.

Official reference: https://docs.meshy.ai/en/api/text-to-3d

### Higgsfield — image and video

- Server credentials: `HF_API_KEY_ID` and `HF_API_KEY_SECRET`
- Image generation: `marketing-studio/image`, 2K, 16:9.
- Video generation: `minimax/h3/text-to-video`, 5 seconds, 2K, 16:9.
- Request status is polled through the Higgsfield requests status API.

Official references:
- https://console.higgsfield.ai/models/marketing-studio%2Fimage/api-reference
- https://console.higgsfield.ai/models/minimax%2Fh3%2Ftext-to-video/api-reference

Higgsfield's API account/balance is separate from a normal higgsfield.ai creator subscription. Configure API credentials and balance before expecting generation to run from Forge.

## Deliberate limits

Forge does not currently pretend that a normal generated image is a production HDRI, and it does not route audio generation through an unverified provider. HDRI and audio requests remain import-only until purpose-built provider paths are connected.

Generated provider files are appropriate for immediate draft iteration, but they are not permanent project storage. Before final publishing, promote approved generated files into the project's durable asset storage/repository and update the manifest to the permanent path. Meshy in particular documents time-limited retention for non-Enterprise generated files.

## Security

Provider keys are server-only environment variables. Do not prefix them with `NEXT_PUBLIC_`, commit them to Git, or put them into the Studio draft/localStorage. Generation routes accept bounded structured requests and never accept arbitrary provider URLs for server-side fetching.
