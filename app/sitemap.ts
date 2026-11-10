import {SITE_URL,readContent} from '@/lib/content';
export default async function sitemap(){const c=await readContent();return ['','pr','digital','science','interests','about','biography'].map(s=>({url:SITE_URL+'/'+(s?s+'/':''),lastModified:c.updatedAt,changeFrequency:'monthly' as const,priority:s===''?1:s==='biography'?0.3:0.8}));}
