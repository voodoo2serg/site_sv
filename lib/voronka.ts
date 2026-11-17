import 'server-only';
import {randomUUID} from 'node:crypto';
import {canonicalJson,signPayload} from './signing';
import {UtmAttribution,attributionIds,formatAttributionNote} from './utm';

export type LeadInput={
 name:string;
 email:string;
 message:string;
 consent:boolean;
 adsConsent:boolean;
 utm:UtmAttribution|null;
 landingPath?:string;
 submissionId?:string;
};

export type LeadDeliveryResult={ok:boolean;leadId:string;voronka?:'sent'|'skipped'|'misconfigured';error?:string};

function voronkaEnv(){
 return {
  url:(process.env.VORONKA_WEBHOOK_URL||'').trim(),
  secret:(process.env.VORONKA_WEBHOOK_SECRET||'').trim(),
  projectId:(process.env.VORONKA_PROJECT_ID||'').trim(),
  enabled:process.env.VORONKA_ENABLED!=='false',
 };
}

function leadPayload(leadId:string,input:LeadInput,projectId:string){
 const created=new Date().toISOString();
 const ids=attributionIds(input.utm);
 const messageBody=input.message.trim();
 const attribution=formatAttributionNote(input.utm,input.landingPath);
 const message=attribution?`${messageBody}\n\n${attribution}`:messageBody;
 const data:Record<string,unknown>={
  id:leadId,
  contact_type:'email',
  contact:input.email,
  email:input.email,
  name:input.name,
  kind:'Обратная связь',
  service:'site_sv',
  message,
  consent:input.consent,
  ads_consent:input.adsConsent,
  created,
  source:'site_sv',
  source_id:ids.source_id,
  campaign_id:ids.campaign_id,
  utm_source:input.utm?.utm_source||'',
  utm_medium:input.utm?.utm_medium||'',
  utm_campaign:input.utm?.utm_campaign||'',
  utm_content:input.utm?.utm_content||'',
  utm_term:input.utm?.utm_term||'',
 };
 if(projectId)data.project_id=projectId;
 const envelope:Record<string,unknown>={
  type:'lead.created',
  kind:'lead.created',
  idempotency_key:leadId,
  event_id:leadId,
  source:'site_sv',
  data,
 };
 if(projectId)envelope.project_id=projectId;
 return envelope;
}

export async function deliverSiteLead(input:LeadInput): Promise<LeadDeliveryResult>{
 const leadId=input.submissionId||randomUUID();
 const env=voronkaEnv();
 if(!env.enabled||!env.url||!env.secret){
  return {ok:true,leadId,voronka:'misconfigured'};
 }
 const payload=leadPayload(leadId,input,env.projectId);
 const body=canonicalJson(payload);
 const timestamp=String(Math.floor(Date.now()/1000));
 const signature=signPayload(env.secret,body,timestamp);
 const sigHeader='sha256='+signature;
 try{
  const res=await fetch(env.url,{
   method:'POST',
   headers:{
    'content-type':'application/json',
    'x-solo-timestamp':timestamp,
    'x-solo-signature':sigHeader,
    'x-solo-event':'lead.created',
    'x-voronka-timestamp':timestamp,
    'x-voronka-signature':sigHeader,
    'idempotency-key':leadId,
   },
   body,
   signal:AbortSignal.timeout(12_000),
  });
  if(!res.ok){
   const text=await res.text().catch(()=>'');
   return {ok:false,leadId,voronka:'sent',error:`Voronka HTTP ${res.status}: ${text.slice(0,200)}`};
  }
  return {ok:true,leadId,voronka:'sent'};
 }catch(e){
  const msg=e instanceof Error?e.message:'unknown';
  return {ok:false,leadId,voronka:'sent',error:msg};
 }
}