import type {Metadata} from 'next';
import '@fontsource-variable/golos-text';
import '@fontsource-variable/unbounded';
import './globals.css';
import {SITE_URL} from '@/lib/content';
export const metadata:Metadata={metadataBase:new URL(SITE_URL),title:'Сергей Водопетов',description:'Медиаменеджер, учёный, предприниматель',openGraph:{locale:'ru_RU',type:'website',siteName:'Сергей Водопетов',images:[{url:'/assets/portrait/vodopetov-640.webp',width:640,height:640,alt:'Сергей Водопетов'}]},icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body><a className="skip-link" href="#main">К содержанию</a>{children}</body></html>}
