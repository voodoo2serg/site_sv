/**
 * Contract tests for AUTH-208 editor OIDC cutover helpers (no live IdP, no secrets).
 */
import {build} from 'esbuild';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const dir = await mkdtemp(join(process.cwd(), '.oidc-test-'));
try {
  const source = `import assert from 'node:assert/strict';
import {
  editorOidcEnabled,
  editorOidcCutover,
  editorOidcBreakGlass,
  localEditorPasswordAllowed,
  editorOidcStatus,
  editorOidcEndSessionUrl,
} from './lib/editor-oidc';
import {issueSession, isEditor} from './lib/auth';

function clearOidcEnv() {
  for (const k of [
    'EDITOR_OIDC_ISSUER','EDITOR_OIDC_CLIENT_ID','EDITOR_OIDC_CLIENT_SECRET',
    'EDITOR_OIDC_REDIRECT_URI','EDITOR_OIDC_OWNER_SUB','EDITOR_OIDC_SESSION_SECRET',
    'SIGNAL_ACCESS_RESOLVE_URL','SIGNAL_ACCESS_SIGNING_KEY',
    'EDITOR_OIDC_CUTOVER','EDITOR_OIDC_BREAK_GLASS','EDITOR_PASSWORD',
  ]) delete process.env[k];
}

function enableOidc() {
  process.env.EDITOR_OIDC_ISSUER = 'https://auth.solo-pr.ru/realms/solo-pr';
  process.env.EDITOR_OIDC_CLIENT_ID = 'site-sv-editor';
  process.env.EDITOR_OIDC_REDIRECT_URI = 'https://vodopetov.ru/api/editor-oidc/callback';
  process.env.EDITOR_OIDC_OWNER_SUB = '28a91eae-4775-4988-838a-b6ff5fa9b3bd';
  process.env.EDITOR_OIDC_SESSION_SECRET = 'x'.repeat(32);
  process.env.SIGNAL_ACCESS_RESOLVE_URL = 'https://signal.example/api/v1/access/resolve';
  process.env.SIGNAL_ACCESS_SIGNING_KEY = 'y'.repeat(32);
}

globalThis.testEnv = {};
globalThis.testHeaders = new Headers();
globalThis.testCookies = new Map();
process.env.NODE_ENV = 'production';

clearOidcEnv();
assert.equal(editorOidcEnabled(), false);
assert.equal(editorOidcCutover(), false);
assert.equal(localEditorPasswordAllowed(), true);
assert.equal(editorOidcStatus().local_login, 'password-or-sites');
assert.equal(editorOidcEndSessionUrl('https://vodopetov.ru/edit/'), null);

enableOidc();
assert.equal(editorOidcEnabled(), true);
assert.equal(editorOidcCutover(), false);
assert.equal(localEditorPasswordAllowed(), true);
assert.equal(editorOidcStatus().local_login, 'dual-migration');
assert.equal(editorOidcStatus().identity, 'issuer+sub');
assert.equal(editorOidcStatus().mfa, 'deferred-AUTH-210');

const end = editorOidcEndSessionUrl('https://vodopetov.ru/edit/');
assert.ok(end.includes('/protocol/openid-connect/logout'));
assert.ok(end.includes('client_id=site-sv-editor'));
assert.equal(editorOidcEndSessionUrl('https://evil.example/edit/'), null);

process.env.EDITOR_OIDC_CUTOVER = '1';
assert.equal(editorOidcCutover(), true);
assert.equal(editorOidcBreakGlass(), false);
assert.equal(localEditorPasswordAllowed(), false);
assert.equal(editorOidcStatus().local_login, 'disabled');
assert.equal(editorOidcStatus().cutover, true);

process.env.EDITOR_PASSWORD = 'a-test-only-long-password-12345';
assert.equal(await issueSession(process.env.EDITOR_PASSWORD), null, 'cutover blocks password session issue');
globalThis.testCookies.set('editor_session', {value: '9999999999999.fakesig'});
assert.equal(await isEditor(), false, 'legacy password cookie rejected after cutover');

process.env.EDITOR_OIDC_BREAK_GLASS = '1';
assert.equal(editorOidcBreakGlass(), true);
assert.equal(localEditorPasswordAllowed(), true);
assert.equal(editorOidcStatus().local_login, 'break-glass-audited');
const token = await issueSession(process.env.EDITOR_PASSWORD);
assert.ok(token, 'break-glass can issue password session');
globalThis.testCookies.set('editor_session', {value: token});
assert.equal(await isEditor(), true);

// Wrong issuer / incomplete config disables SSO entirely.
process.env.EDITOR_OIDC_ISSUER = 'https://evil.example/realms/solo-pr';
assert.equal(editorOidcEnabled(), false);

console.log('PASS: editor OIDC cutover, break-glass, end-session allowlist, status contract.');
`;

  await build({
    stdin: {contents: source, resolveDir: process.cwd(), sourcefile: 'oidc-test.ts', loader: 'ts'},
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: join(dir, 'test.mjs'),
    packages: 'external',
    plugins: [{
      name: 'test-boundaries',
      setup(b) {
        b.onResolve({filter: /^server-only$/}, () => ({path: 'empty', namespace: 'mock'}));
        b.onResolve({filter: /^next\/headers$/}, () => ({path: 'headers', namespace: 'mock'}));
        b.onResolve({filter: /^@opennextjs\/cloudflare$/}, () => ({path: 'context', namespace: 'mock'}));
        b.onLoad({filter: /.*/, namespace: 'mock'}, (args) => ({
          contents: args.path === 'empty' ? ''
            : args.path === 'headers'
              ? 'export async function headers(){return globalThis.testHeaders;} export async function cookies(){return {get:key=>globalThis.testCookies.get(key)}}'
              : 'export function getCloudflareContext(){return {env:globalThis.testEnv}}',
          loader: 'js',
        }));
      },
    }],
  });

  const result = spawnSync(process.execPath, [join(dir, 'test.mjs')], {
    stdio: 'inherit',
    env: {...process.env, NODE_PATH: join(process.cwd(), 'node_modules')},
  });
  if (result.status) process.exitCode = result.status;
} finally {
  await rm(dir, {recursive: true, force: true});
}
