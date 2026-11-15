# Changelog

## Unreleased

### Added

- **SITE-002** UTM capture (`sv_utm` cookie, `AttributionCapture`, `/api/attribution/`), contact lead form in footer with privacy/marketing consent checkboxes.
- Outbound signed `lead.created` to Voronka (`VORONKA_WEBHOOK_URL` / `VORONKA_WEBHOOK_SECRET`, HMAC `x-solo-*` + `idempotency-key`) via `/api/leads/`.
- Documentation: `docs/SITE_002_CRM_LEADS.md`; updated `/privacy/` and `/cookies/` copy for forms and attribution cookie.