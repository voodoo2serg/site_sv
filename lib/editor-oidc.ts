import 'server-only';

/** Opt-in editor SSO. Explicit subject + SIGNAL grant required; existing editor password untouched. */
const EXPECTED_ISSUER = 'https://auth.solo-pr.ru/realms/solo-pr';
const E = new TextEncoder();

function config() {
  const issuer = process.env.EDITOR_OIDC_ISSUER;
  const clientId = process.env.EDITOR_OIDC_CLIENT_ID;
  const secret = process.env.EDITOR_OIDC_SESSION_SECRET;
  const ownerSub = process.env.EDITOR_OIDC_OWNER_SUB;
  const redirect = process.env.EDITOR_OIDC_REDIRECT_URI;
  const gate = process.env.SIGNAL_ACCESS_RESOLVE_URL;
  const gateKey = process.env.SIGNAL_ACCESS_SIGNING_KEY;
  if (issuer !== EXPECTED_ISSUER || !clientId || !secret || secret.length < 32 ||
      !ownerSub || !redirect || !gate || !gate.startsWith('https://') ||
      !gateKey || gateKey.length < 32) return null;
  try {
    const url = new URL(redirect);
    if (url.protocol !== 'https:' || url.pathname !== '/api/editor-oidc/callback' ||
        url.hostname !== 'vodopetov.ru') return null;
    return {issuer, clientId, secret, ownerSub, redirect, gate, gateKey,
      clientSecret: process.env.EDITOR_OIDC_CLIENT_SECRET || ''};
  } catch { return null; }
}
export function editorOidcEnabled() { return config() !== null; }

function base64(bytes: Uint8Array) { return Buffer.from(bytes).toString('base64url'); }
function random(n = 32) { return base64(crypto.getRandomValues(new Uint8Array(n))); }
function unbase64(text: string) { return new Uint8Array(Buffer.from(text, 'base64url')); }
async function key(secret: string) {
  return crypto.subtle.importKey('raw', E.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
}
async function sign(secret: string, data: string) {
  return base64(new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), E.encode(data))));
}
async function validSignature(secret: string, data: string, signature: string) {
  try { return crypto.subtle.verify('HMAC', await key(secret), unbase64(signature), E.encode(data)); }
  catch { return false; }
}

export async function beginEditorOidc() {
  const cfg = config();
  if (!cfg) throw new Error('SSO редактора не настроено');
  const state = random(), nonce = random(), verifier = random(48);
  const expire = Date.now() + 600_000;
  const data = [state, nonce, verifier, expire].join('.');
  const sealed = data + '.' + await sign(cfg.secret, data);
  const challenge = base64(new Uint8Array(await crypto.subtle.digest('SHA-256', E.encode(verifier))));
  const url = new URL(cfg.issuer + '/protocol/openid-connect/auth');
  for (const [k,v] of Object.entries({
    response_type:'code', client_id:cfg.clientId, redirect_uri:cfg.redirect,
    scope:'openid email profile', state, nonce, code_challenge:challenge,
    code_challenge_method:'S256'
  })) url.searchParams.set(k,v);
  return {url: url.toString(), sealed};
}

async function verifiedState(sealed:string, expectedState:string) {
  const cfg = config();
  if (!cfg) throw new Error('SSO выключен');
  const parts = sealed.split('.');
  if (parts.length !== 5) throw new Error('Неверное состояние входа');
  const [state,nonce,verifier,expires,sig] = parts;
  const payload = [state,nonce,verifier,expires].join('.');
  if (state !== expectedState || !state || !nonce || !verifier ||
      !Number.isFinite(Number(expires)) || Date.now() >= Number(expires) ||
      !(await validSignature(cfg.secret,payload,sig))) throw new Error('Состояние входа недействительно');
  return {nonce,verifier};
}

async function verifiedIdToken(token:string, nonce:string) {
  const cfg=config();
  if (!cfg) throw new Error('SSO выключен');
  const parts=token.split('.');
  if (parts.length !== 3) throw new Error('Неверный ответ Keycloak');
  const header=JSON.parse(Buffer.from(parts[0],'base64url').toString()) as {alg?:string;kid?:string};
  const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString()) as {
    iss?:string;aud?:string|string[];exp?:number;nbf?:number;nonce?:string;sub?:string;
  };
  if (header.alg !== 'RS256' || !header.kid || payload.iss !== cfg.issuer ||
      !(typeof payload.aud === 'string' ? payload.aud === cfg.clientId :
        Array.isArray(payload.aud) && payload.aud.includes(cfg.clientId)) ||
      !payload.exp || payload.exp <= Math.floor(Date.now()/1000) ||
      (payload.nbf && payload.nbf > Math.floor(Date.now()/1000)+60) ||
      payload.nonce !== nonce || !payload.sub) throw new Error('Неверное подтверждение Keycloak');
  const res=await fetch(cfg.issuer+'/protocol/openid-connect/certs',
    {cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!res.ok)throw new Error('Ключи Keycloak недоступны');
  const {keys}=await res.json() as {keys:Array<JsonWebKey & {kid?:string}>};
  const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA');
  if(!jwk)throw new Error('Ключ Keycloak не найден');
  const verifyKey=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',verifyKey,unbase64(parts[2]),E.encode(parts[0]+'.'+parts[1]));
  if(!ok)throw new Error('Подпись Keycloak неверна');
  return payload.sub;
}

async function verifySignalGrant(cfg: NonNullable<ReturnType<typeof config>>, sub: string) {
  const timestamp=String(Math.floor(Date.now()/1000));
  const message=[timestamp,'site_sv_editor',cfg.issuer,sub].join('\n');
  const signature=Buffer.from(await crypto.subtle.sign('HMAC',await key(cfg.gateKey),E.encode(message))).toString('hex');
  const res=await fetch(cfg.gate,{method:'POST',headers:{
    'content-type':'application/json','x-signal-service':'site_sv_editor',
    'x-signal-timestamp':timestamp,'x-signal-signature':signature
  },body:JSON.stringify({issuer:cfg.issuer,subject:sub}),cache:'no-store',
  signal:AbortSignal.timeout(8000)});
  if(!res.ok)throw new Error('Проверка разрешений SIGNAL недоступна');
  const result=await res.json() as {allowed?:boolean};
  if(result.allowed!==true)throw new Error('Редактор сайта не разрешён в SIGNAL');
}

export async function completeEditorOidc(code:string,state:string,sealed:string) {
  const cfg=config();
  if(!cfg)throw new Error('SSO выключен');
  const {nonce,verifier}=await verifiedState(sealed,state);
  const body=new URLSearchParams({
    grant_type:'authorization_code',client_id:cfg.clientId,
    redirect_uri:cfg.redirect,code,code_verifier:verifier
  });
  if(cfg.clientSecret)body.set('client_secret',cfg.clientSecret);
  const res=await fetch(cfg.issuer+'/protocol/openid-connect/token',{
    method:'POST',body,headers:{'content-type':'application/x-www-form-urlencoded'},
    cache:'no-store',signal:AbortSignal.timeout(8000)
  });
  if(!res.ok)throw new Error('Keycloak отклонил вход');
  const tokens=await res.json() as {id_token?:string};
  if(!tokens.id_token)throw new Error('Keycloak не вернул id_token');
  const sub=await verifiedIdToken(tokens.id_token,nonce);
  if(sub!==cfg.ownerSub)throw new Error('Доступ редактора не разрешён этому пользователю');
  await verifySignalGrant(cfg,sub);
  const expiry=String(Date.now()+8*3600_000);
  const payload=sub+'.'+expiry;
  return payload+'.'+await sign(cfg.secret,payload);
}

export async function validEditorOidcSession(session:string|undefined) {
  const cfg=config();
  if(!cfg||!session)return false;
  const parts=session.split('.');
  if(parts.length!==3)return false;
  const [sub,expires,sig]=parts;
  if(sub!==cfg.ownerSub||!Number.isFinite(Number(expires))||Number(expires)<=Date.now())return false;
  if (!(await validSignature(cfg.secret,sub+'.'+expires,sig))) return false;
  // Enforce revocation on every protected editor request, not just at SSO login.
  // If SIGNAL is unavailable, SSO access fails closed; legacy login stays intact.
  try {
    await verifySignalGrant(cfg, sub);
    return true;
  } catch {
    return false;
  }
}
