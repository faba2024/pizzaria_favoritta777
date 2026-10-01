import type { Metadata, Viewport } from 'next';
import './globals.css';
import './commercial.css';
import {CartProvider} from '@/hooks/cart';
import {Pwa} from '@/components/pwa';

function siteUrl(){
 const raw=process.env.NEXT_PUBLIC_APP_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:'');
 try{return new URL(raw)}catch{return new URL('http://localhost:3000')}
}

const description='Peça pizzas tradicionais, especiais, doces e bebidas da A Favorita Pizzaria. Cardápio online, meio a meio e entrega na sua região.';
export const metadata:Metadata={
 metadataBase:siteUrl(),
 title:{default:'A Favorita Pizzaria',template:'%s | A Favorita Pizzaria'},
 description,
 manifest:'/manifest.webmanifest',
 icons:{icon:[{url:'/favicon.ico',sizes:'any'},{url:'/favicon.png',type:'image/png',sizes:'64x64'}],apple:'/apple-touch-icon.png'},
 appleWebApp:{capable:true,title:'Favorita',statusBarStyle:'black-translucent'},
 openGraph:{type:'website',locale:'pt_BR',siteName:'A Favorita Pizzaria',title:'A Favorita Pizzaria — a melhor pizza da cidade',description,images:[{url:'/og-image.jpg',width:1200,height:630,alt:'Pizza da A Favorita Pizzaria'}]},
 twitter:{card:'summary_large_image',images:['/og-image.jpg']},
};
export const viewport:Viewport={themeColor:'#0b0b09',width:'device-width',initialScale:1};

export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><head><link rel="stylesheet" href="/fonts/fonts.css"/></head><body><CartProvider>{children}</CartProvider><Pwa/></body></html>}
