import {getCatalog} from '@/services/catalog';
import {Storefront} from '@/components/storefront';
import {Setup} from '@/components/setup';
import {previewCatalog} from '@/lib/preview-catalog';
export const dynamic='force-dynamic';
export default async function Page(){if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return <Storefront catalog={previewCatalog} preview/>;try{return <Storefront catalog={await getCatalog()}/>;}catch{return <Setup error="Não foi possível carregar o restaurante. Tente novamente em alguns instantes."/>;}}
