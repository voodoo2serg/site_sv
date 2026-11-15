'use client';
import {useEffect} from 'react';
import {UTM_KEYS} from '@/lib/utm';

export default function AttributionCapture(){
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const utm:Record<string,string>={};
  for(const key of UTM_KEYS){
   const value=params.get(key);
   if(value)utm[key]=value;
  }
  if(!Object.keys(utm).length)return;
  void fetch('/api/attribution/',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({...utm,path:window.location.pathname}),
   credentials:'same-origin',
  });
 },[]);
 return null;
}