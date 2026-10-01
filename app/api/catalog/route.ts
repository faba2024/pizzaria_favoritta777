import {getCatalog} from '@/services/catalog';
import {previewCatalog} from '@/lib/preview-catalog';
import {isOpen,openingLabel} from '@/utils/hours';
export const dynamic='force-dynamic';
export async function GET(){
 const preview=!process.env.NEXT_PUBLIC_SUPABASE_URL;
 try{const catalog=preview?previewCatalog:await getCatalog();return Response.json({catalog:{...catalog,settings:{...catalog.settings,pix_key:''}},preview,open:isOpen(catalog.settings.hours,catalog.restaurant.timezone),openingLabel:openingLabel(catalog.settings.hours,catalog.restaurant.timezone)}, {headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Não foi possível carregar o cardápio. Tente novamente.'},{status:503});}
}
