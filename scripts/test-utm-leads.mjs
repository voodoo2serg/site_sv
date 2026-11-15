import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';

const UTM_KEYS=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
const UTM_VALUE=/^[a-z0-9][a-z0-9._-]{0,118}$/i;

function parseUtmFromSearch(params){
 const out={};
 for(const key of UTM_KEYS){
  const raw=params.get(key);
  if(!raw)continue;
  const value=raw.trim().slice(0,120);
  if(value&&UTM_VALUE.test(value))out[key]=value.toLowerCase();
 }
 return out;
}

function formatAttributionNote(utm,landingPath=''){
 if(!utm||!Object.keys(utm).length)return '';
 const lines=[`[site_sv attribution]${landingPath?` landing=${landingPath}`:''}`];
 for(const key of UTM_KEYS){if(utm[key])lines.push(`${key}=${utm[key]}`);}
 if(utm.utm_source)lines.push(`source_id=${utm.utm_source}`);
 if(utm.utm_campaign)lines.push(`campaign_id=${utm.utm_campaign}`);
 return lines.join('\n');
}

function canonicalJson(value){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
 const obj=value;
 return '{'+Object.keys(obj).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(obj[k])).join(',')+'}';
}

const params=new URLSearchParams('utm_source=Telegram&utm_campaign=Solo_Launch&utm_medium=social');
const utm=parseUtmFromSearch(params);
assert.equal(utm.utm_source,'telegram');
assert.equal(utm.utm_campaign,'solo_launch');
const note=formatAttributionNote(utm,'/');
assert.match(note,/source_id=telegram/);
assert.match(note,/campaign_id=solo_launch/);

const body=canonicalJson({b:2,a:1,nested:{z:9,y:8}});
assert.equal(body,'{"a":1,"b":2,"nested":{"y":8,"z":9}}');

const timestamp='1700000000000';
const secret='test-secret';
const payload={type:'lead.created',event_id:'id-1'};
const raw=canonicalJson(payload);
const sig=createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');
assert.equal(sig.length,64);

console.log('PASS: UTM parse/normalize, attribution note, canonical JSON, HMAC shape.');