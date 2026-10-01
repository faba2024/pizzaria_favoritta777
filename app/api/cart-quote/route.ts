import {z} from 'zod';
import {cartItemSchema} from '@/validations/order';
import {serverDb} from '@/lib/supabase/server';
const schema=z.object({items:z.array(cartItemSchema).min(1).max(50),fulfillment:z.enum(['delivery','pickup','table']),neighborhood:z.string().max(100),coupon:z.string().trim().max(40)});
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 try{const text=await request.text();if(text.length>50000)return Response.json({error:'Pedido muito grande.'},{status:413});const parsed=schema.safeParse(JSON.parse(text));if(!parsed.success)return Response.json({error:'Confira os itens e o bairro.'},{status:400});
 const db=await serverDb();const {data:{user}}=await db.auth.getUser();if(!user){const {error}=await db.auth.signInAnonymously();if(error)return Response.json({error:'Não foi possível iniciar sua sessão.'},{status:401})}
 const {data:r,error:re}=await db.from('restaurants').select('id').eq('slug',process.env.NEXT_PUBLIC_RESTAURANT_SLUG||'favorita').single();if(re||!r)throw Error('Restaurante indisponível.');
 const {data,error}=await db.rpc('preview_order',{r:r.id,payload:{items:parsed.data.items,checkout:{fulfillment:parsed.data.fulfillment,neighborhood:parsed.data.neighborhood,coupon:parsed.data.coupon}}});
 if(error)return Response.json({error:error.code==='P0001'?error.message:'Não foi possível calcular o pedido.'},{status:422});return Response.json(data);
 }catch{return Response.json({error:'Não foi possível calcular. Confira a conexão.'},{status:503})}
}
