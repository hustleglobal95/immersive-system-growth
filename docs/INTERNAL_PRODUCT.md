# Forge Internal Product Operations

Forge is designed to remain a private Growth Terminal production system. The internal-product layer adds durable projects, restore points, asset promotion, operator identity and production memory without turning the platform into public SaaS.

## Operating model

Forge now has three storage layers:

1. **Browser working copy** — fast local authoring under `forge-studio-v2`.
2. **Project Vault** — durable validated project snapshots stored on a dedicated GitHub branch.
3. **Asset Vault** — permanent generated binaries stored through a private authenticated object-storage gateway and served from a public runtime base URL.

Browser storage is never the only durable copy for an important project. Save production checkpoints to Project Vault.

## Project Vault

Project Vault uses the existing server-only GitHub integration.

Required:

```text
FORGE_GITHUB_REPOSITORY=owner/repository
FORGE_GITHUB_TOKEN=<fine-grained token with contents write>
FORGE_VAULT_BRANCH=forge-vault
FORGE_VAULT_BASE_BRANCH=main
```

The Vault branch is created automatically from the base branch when it does not exist. Forge stores data under:

```text
.forge/vault/index.json
.forge/vault/projects/<project-id>/current.json
.forge/vault/projects/<project-id>/versions/<version-id>.json
.forge/vault/projects/<project-id>/history.json
.forge/vault/projects/<project-id>/journal.json
```

Each Studio save creates one validated immutable version plus a new current snapshot. Restore changes the current snapshot but does not delete the original version. Archive changes only Vault project state.

The snapshot contains:

- experience
- Studio project configuration
- asset manifest
- interaction graph
- checkpoint label and production note
- author and timestamp

Project Vault uses Git data commits so a snapshot update is atomic across the current file, version, history, journal and index.

## Production memory

The project journal records:

- saves
- restores
- archive/unarchive actions
- review publishing
- permanent asset promotion
- explicit production lessons

Use **Record lesson** for information worth teaching future Forge direction. Keep it factual and operational. Example:

> On mobile, the slower orbit preserved the luxury feel better than cutting the shot.

The journal is intentionally structured separately from Git commit history so Director/autonomy can consume project learning later without reverse-engineering repository messages.

## Asset Vault

Generated provider outputs are temporary until they are promoted. Asset Vault uses a provider-neutral object gateway.

Required:

```text
FORGE_ASSET_VAULT_ENDPOINT=https://private-upload.example.com/forge/
FORGE_ASSET_VAULT_PUBLIC_BASE_URL=https://cdn.example.com/forge/
FORGE_ASSET_VAULT_TOKEN=<server-only upload token>
```

Gateway contract:

```text
PUT <FORGE_ASSET_VAULT_ENDPOINT>/<project>/<sha-prefix>/<sha-name.ext>
Authorization: Bearer <FORGE_ASSET_VAULT_TOKEN>
Content-Type: <asset MIME>
Content-Length: <bytes>
X-Forge-Sha256: <sha256>
X-Forge-Project: <project-id>
```

The public base URL must expose the same object key over HTTPS.

Forge downloads successful Meshy/Higgsfield output server-side, verifies its size, calculates SHA-256, uploads it to the object gateway, then registers the permanent public URL in the draft manifest. The server bridge limit is 120 MB per generated asset.

If Asset Vault is not configured, Asset Creator can still install a temporary draft bridge. **Guided Ship blocks review publishing while any generated-file bridge remains in the manifest.**

Local imported binaries still follow the existing asset preparation path. Promote final optimized files to permanent project/CDN paths before shipping.

## Internal access

Internal access is optional so solo local development stays frictionless.

Enable it with:

```text
FORGE_INTERNAL_ACCESS_ENABLED=true
FORGE_INTERNAL_SESSION_SECRET=<long random server secret>
FORGE_INTERNAL_USERS_JSON=[...]
```

Create a passphrase hash:

```bash
npm run internal:user-hash -- 'a long private passphrase'
```

Then configure a user:

```json
[
  {
    "id": "kevin",
    "name": "Kevin",
    "role": "owner",
    "secretHash": "pbkdf2$210000$..."
  }
]
```

Available roles, lowest to highest:

| Role | Intended access |
| --- | --- |
| reviewer | Read project/version history |
| designer | Save/load/restore projects and promote assets |
| director | Designer access plus project archive governance |
| developer | Technical operator role for production/deployment workflows |
| owner | Full internal authority |

Sessions are HMAC-signed, HTTP-only, SameSite=Strict and expire server-side after 12 hours. When internal access is enabled, the proxy protects Studio, Forge project surfaces, Director, Structure and their internal APIs.

The publishing owner secret remains a separate release-control credential. Internal identity does not automatically grant deployment authority.

## Project workflow

For production projects:

1. Start or open a project in Studio.
2. Work normally; browser state remains the fast working copy.
3. Save a named Project Vault checkpoint at every meaningful milestone.
4. Record production decisions/lessons that should survive the project.
5. Generate/import assets.
6. Promote generated assets to Asset Vault before release.
7. Use Guided Ship. It must report durable assets and clean project validation.
8. Create a review PR.
9. Run release gates and real-device verification.
10. Save an approved/shipped checkpoint.

## Readiness audit

Run:

```bash
npm run internal:readiness
```

The audit checks whether the code and current environment are configured for:

- Studio product shell
- Project Vault
- Asset Vault
- internal access
- GitHub-backed durable persistence
- review publishing
- validation contract

For deployment enforcement:

```bash
npm run internal:readiness -- --strict
```

This audit does not pretend to certify external systems. Hosted CI execution, production object-storage behavior and physical-device performance remain separate release evidence.

## What remains intentionally out of scope

Forge is internal. It does not need:

- public registration
- Stripe/billing
- seat subscriptions
- self-service organizations
- public password reset
- customer entitlement systems
- tenant-level pricing controls

Add those only if Forge itself becomes a commercial product. Until then, optimize for Growth Terminal production speed, quality, learning and reliability.


## Loop Engine

Forge Loop Engine uses durable Project Vault checkpoints as incumbents for evidence-driven improvement. Visual Polish, Mobile Translation and Motion Polish are executable; Performance, Asset Quality and Construction remain typed contracts until their repair workers satisfy the same safety/evidence standard.

Loop runs never overwrite an authoritative project. Winning artifacts require explicit human promotion with `npm run loop:accept -- --report <run-report.json> --actor "<name>" --approve`.

See [Loop Engine](LOOP_ENGINE.md) for budgets, stop policies, evidence layout, candidate tournaments and memory promotion.
