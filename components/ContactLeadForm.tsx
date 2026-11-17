'use client';
import {FormEvent,useRef,useState} from 'react';
import Link from 'next/link';

type Props={email:string};

export default function ContactLeadForm({email}:Props){
 const [name,setName]=useState('');
 const [address,setAddress]=useState('');
 const [message,setMessage]=useState('');
 const [consent,setConsent]=useState(false);
 const [adsConsent,setAdsConsent]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [done,setDone]=useState(false);
 // One submission attempt = one event ID, including retries after network errors.
 const submissionId=useRef<string|null>(null);
 const invalidate=()=>{submissionId.current=null;};

 async function submit(e:FormEvent){
  e.preventDefault();
  if(busy)return;
  if(!submissionId.current)submissionId.current=crypto.randomUUID();
  setBusy(true);setError('');
  try{
   const res=await fetch('/api/leads/',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name,email:address,message,consent,ads_consent:adsConsent,submission_id:submissionId.current}),
   });
   const data=await res.json().catch(()=>({}));
   if(!res.ok){setError(typeof data.error==='string'?data.error:'Не удалось отправить');return;}
   setDone(true);
  }catch{
   setError('Не удалось соединиться с сервером');
  }finally{setBusy(false);}
 }

 if(done){
  return <p className="lead-form-note">Спасибо. Сообщение принято — мы ответим на указанный email. Также можно написать напрямую: <a href={'mailto:'+email}>{email}</a>.</p>;
 }

 return (
  <form className="lead-form" onSubmit={submit}>
   <span className="eyebrow">Заявка</span>
   <p className="lead-form-note">Короткая форма вместо письма в почтовом клиенте. Данные передаются в CRM по защищённому каналу.</p>
   <label className="field-label">Имя<input name="name" autoComplete="name" required maxLength={200} value={name} onChange={e=>{invalidate();setName(e.target.value);}}/></label>
   <label className="field-label">Email<input name="email" type="email" autoComplete="email" required maxLength={250} value={address} onChange={e=>{invalidate();setAddress(e.target.value);}}/></label>
   <label className="field-label">Сообщение<textarea name="message" required maxLength={8000} rows={4} value={message} onChange={e=>{invalidate();setMessage(e.target.value);}}/></label>
   <label className="lead-consent"><input type="checkbox" checked={consent} onChange={e=>{invalidate();setConsent(e.target.checked);}} required/><span>Согласен(на) на <Link href="/privacy/">обработку персональных данных</Link> для ответа на обращение.</span></label>
   <label className="lead-consent optional"><input type="checkbox" checked={adsConsent} onChange={e=>{invalidate();setAdsConsent(e.target.checked);}}/><span>Хочу получать новости и приглашения по email (можно отозвать письмом).</span></label>
   {error&&<p className="lead-form-error" role="alert">{error}</p>}
   <button className="ui-button primary" type="submit" disabled={busy}>{busy?'Отправляем…':'Отправить'}</button>
  </form>
 );
}