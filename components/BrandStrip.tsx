'use client';
import {useState} from 'react';
type Brand={id:string;name:string;caption:string;url:string;label:boolean};
export default function BrandStrip({brands}:{brands:Brand[]}){
 const [open,setOpen]=useState<string|null>(null);
 return <div className="brands" aria-label="Опыт и проекты">{brands.map(b=><div className={`brand ${open===b.id?'is-open':''}`} key={b.id} onMouseLeave={()=>setOpen(null)}>
 <button className="brand-button" aria-expanded={open===b.id} aria-describedby={'tip-'+b.id} onClick={()=>setOpen(b.id)} onKeyDown={e=>{if(e.key==='Escape')setOpen(null)}} onFocus={()=>setOpen(b.id)} onBlur={e=>{if(!e.currentTarget.parentElement?.contains(e.relatedTarget))setOpen(null)}}>
 {b.label?<span className="brand-word">{b.name}</span>:<span className="brand-art"><img className="brand-mono" src={`/assets/logos/${b.id}.png`} width="180" height="60" alt={b.name}/><img className="brand-color" src={`/assets/logos/color/${b.id}.png`} width="180" height="60" alt="" aria-hidden="true"/></span>}<span className="brand-info" aria-hidden="true">+</span></button>
 <div id={'tip-'+b.id} className={`brand-tip ${open===b.id?'is-open':''}`}><strong>{b.name}</strong><span>{b.caption}</span>{b.url&&<a href={b.url} target="_blank" rel="noopener noreferrer">Открыть сайт ↗</a>}</div>
 </div>)}</div>
}
