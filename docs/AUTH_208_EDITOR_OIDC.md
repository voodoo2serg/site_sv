# AUTH-208 — `/edit/` Keycloak OIDC cutover

**Issue:** [site_sv#3](https://github.com/voodoo2serg/site_sv/issues/3) · Plan Pass 3b  
**Contract:** [UNIFIED_IDENTITY_AND_ACCESS_v5.3](https://github.com/voodoo2serg/solo_pr/blob/main/docs/signal/UNIFIED_IDENTITY_AND_ACCESS_V5_3.md)  
**Identity:** verified `issuer + sub` only. Email never grants editor. MFA deferred to AUTH-210.  
**Secrets:** never commit passwords, client secrets, session secrets, or signing keys.

## What this changes

| Surface | Behaviour |
|---------|-----------|
| Public `vodopetov.ru` | Unchanged — no login |
| ChatGPT Sites owner path | Unchanged (`OWNER_PRIVATE_EDITOR` + `oai-authenticated-user-id`) |
| VPS `/edit/` with OIDC env complete | PKCE BFF → Keycloak → SIGNAL grant → `editor_oidc_session` |
| `EDITOR_OIDC_CUTOVER=1` | Local `EDITOR_PASSWORD` / `editor_session` **disabled** (not a hidden bypass) |
| `EDITOR_OIDC_BREAK_GLASS=1` | Optional audited emergency password after cutover |
| Stranger / wrong `sub` / no SIGNAL grant | **403** |

## Env (VPS `/etc/site-sv.env`)

Required together (SSO off until all valid):

- `EDITOR_OIDC_ISSUER=https://auth.solo-pr.ru/realms/solo-pr`
- `EDITOR_OIDC_CLIENT_ID=site-sv-editor`
- `EDITOR_OIDC_CLIENT_SECRET` (if confidential client)
- `EDITOR_OIDC_REDIRECT_URI=https://vodopetov.ru/api/editor-oidc/callback`
- `EDITOR_OIDC_OWNER_SUB=<kc-sub>` (comma-separated allowlist; Gate 0 inventory)
- `EDITOR_OIDC_SESSION_SECRET` (≥32 random)
- `SIGNAL_ACCESS_RESOLVE_URL` + `SIGNAL_ACCESS_SIGNING_KEY` (`app_id=site_sv_editor`)

Cutover flags:

- `EDITOR_OIDC_CUTOVER=0` — dual mode (SSO + password) while proving login
- `EDITOR_OIDC_CUTOVER=1` — password off
- Rollback: set `CUTOVER=0` (or `BREAK_GLASS=1` briefly); restart `site-sv`

## Keycloak client (ops)

Create/update confidential (or public+PKCE) client `site-sv-editor`:

- Standard flow + PKCE S256
- Valid redirect: `https://vodopetov.ru/api/editor-oidc/callback`
- Valid post-logout: `https://vodopetov.ru/edit/`
- No public registration of editors

Owner `sub` from AUTH-202 inventory (do not paste into chat/docs beyond ops runbooks that already hold it).

## Smoke

```bash
curl -sS https://vodopetov.ru/api/editor-oidc/status
# → enabled:true, cutover:true|false, local_login:…

curl -sSI https://vodopetov.ru/api/editor-oidc/start | head
# → 302 Location: …/realms/solo-pr/protocol/openid-connect/auth?...code_challenge_method=S256

# Public site still open
curl -sSI https://vodopetov.ru/ | head -1
```

Browser: owner with active KC session opens `/edit/` → SSO without a new site password. Customer account → 403. After cutover, old `EDITOR_PASSWORD` returns 403 on `/api/login`.

## Logout / revoke

- `GET /api/editor-oidc/logout` — clears local cookies, redirects to Keycloak end-session
- `POST /api/logout` — clears local cookies (CSRF `Origin` required); `?idp=1` also returns KC logout URL
- SIGNAL grant checked on **every** protected editor request — revoke in Signal fails closed

## Explicit non-goals

- MFA / FreeOTP (AUTH-210)
- Closing issue #3 before MERGED → DEPLOYED → smoke
- Changing public pages or Sites ChatGPT claim path
