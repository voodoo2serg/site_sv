export const UTM_COOKIE='sv_utm';
export const UTM_KEYS=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'] as const;
export type UtmKey=(typeof UTM_KEYS)[number];
export type UtmAttribution=Partial<Record<UtmKey,string>>;
export type AttributionCookie=UtmAttribution&{captured_at?:string;landing_path?:string};

const UTM_VALUE=/^[a-z0-9][a-z0-9._-]{0,118}$/i;

export function parseUtmFromSearch(params:URLSearchParams):UtmAttribution{
 const out:UtmAttribution={};
 for(const key of UTM_KEYS){
  const raw=params.get(key);
  if(!raw)continue;
  const value=raw.trim().slice(0,120);
  if(value&&UTM_VALUE.test(value))out[key]=value.toLowerCase();
 }
 return out;
}

export function parseAttributionCookie(raw:unknown):AttributionCookie|null{
 if(!raw||typeof raw!=='object')return null;
 const src=raw as Record<string,unknown>;
 const utm=parseUtmRecord(src);
 if(!utm&&!src.landing_path&&!src.captured_at)return null;
 const out:AttributionCookie={...(utm||{})};
 if(typeof src.captured_at==='string')out.captured_at=src.captured_at.slice(0,80);
 if(typeof src.landing_path==='string')out.landing_path=src.landing_path.slice(0,300);
 return Object.keys(out).length?out:null;
}

export function parseUtmRecord(raw:unknown):UtmAttribution|null{
 if(!raw||typeof raw!=='object')return null;
 const src=raw as Record<string,unknown>;
 const out:UtmAttribution={};
 for(const key of UTM_KEYS){
  const value=src[key];
  if(typeof value!=='string'||!value.trim())continue;
  const trimmed=value.trim().slice(0,120);
  if(UTM_VALUE.test(trimmed))out[key]=trimmed.toLowerCase();
 }
 return Object.keys(out).length?out:null;
}

export function mergeAttribution(stored:UtmAttribution|null,incoming:UtmAttribution):UtmAttribution|null{
 if(!incoming||!Object.keys(incoming).length)return stored;
 if(!stored)return incoming;
 const merged={...stored};
 let changed=false;
 for(const key of UTM_KEYS){
  const value=incoming[key];
  if(value&&merged[key]!==value){merged[key]=value;changed=true;}
 }
 return changed||!stored?merged:stored;
}

export function attributionIds(utm:UtmAttribution|null){
 return {
  source_id:utm?.utm_source||'',
  campaign_id:utm?.utm_campaign||'',
 };
}

export function formatAttributionNote(utm:UtmAttribution|null,landingPath?:string):string{
 if(!utm||!Object.keys(utm).length)return '';
 const lines=[`[site_sv attribution]${landingPath?` landing=${landingPath}`:''}`];
 for(const key of UTM_KEYS){if(utm[key])lines.push(`${key}=${utm[key]}`);}
 const ids=attributionIds(utm);
 if(ids.source_id)lines.push(`source_id=${ids.source_id}`);
 if(ids.campaign_id)lines.push(`campaign_id=${ids.campaign_id}`);
 return lines.join('\n');
}