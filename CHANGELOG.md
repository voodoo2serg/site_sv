# Changelog

## Unreleased

### Fixed

- **AUTH-210** `/edit/` browser SSO reliability: POST SIGNAL CTA (no GET prefetch race), PKCE state cookie `Path=/`, `skipTrailingSlashRedirect` so IdP callback hits the handler without 308, friendly `/edit/?error=…` instead of raw JSON on failure.

### Added

- **AUTH-208** `/edit/` Keycloak OIDC cutover: PKCE BFF status/logout, `EDITOR_OIDC_CUTOVER` disables password bypass, optional audited break-glass, SIGNAL grant on every editor request, ChatGPT Sites path unchanged. Docs: `docs/AUTH_208_EDITOR_OIDC.md`.
- **SITE-002** UTM capture (`sv_utm` cookie, `AttributionCapture`, `/api/attribution/`), contact lead form in footer with privacy/marketing consent checkboxes.
- Outbound signed `lead.created` to Voronka (`VORONKA_WEBHOOK_URL` / `VORONKA_WEBHOOK_SECRET`, HMAC `x-solo-*` + `idempotency-key`) via `/api/leads/`.
- Documentation: `docs/SITE_002_CRM_LEADS.md`; updated `/privacy/` and `/cookies/` copy for forms and attribution cookie.