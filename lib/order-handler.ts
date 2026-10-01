import 'server-only';
import {NextResponse} from 'next/server';
import {orderSchema} from '@/validations/order';
import {serverDb} from '@/lib/supabase/server';
export async function handleOrder(request:Request,mode:'create_order'|'preview_order'){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Origem inválida.'},{status:403});
 try{
 const raw=await request.text();if(raw.length>50000)return NextResponse.json({error:'Pedido muito grande.'},{status:413});
 let body;try{body=JSON.parse(raw)}catch{return NextResponse.json({error:'Pedido inválido.'},{status:400})}
 const parsed=orderSchema.safeParse(body);if(!parsed.success||(mode==='create_order'&&!parsed.data.expected_quote))return NextResponse.json({error:'Confira os campos e revise o total do pedido.'},{status:400});
 const db=await serverDb();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Sua sessão expirou. Recarregue a página.'},{status:401});
 const {data:r,error:re}=await db.from('restaurants').select('id').eq('slug',process.env.NEXT_PUBLIC_RESTAURANT_SLUG||'favorita').single();if(re||!r)throw Error('Restaurante indisponível.');
 const {data,error}=await db.rpc(mode,{r:r.id,payload:parsed.data});if(error)return NextResponse.json({error:error.code==='P0001'?error.message:'Não foi possível processar o pedido. Tente novamente.'},{status:422});
 if(mode==='preview_order')return NextResponse.json(data);
 const {data:order,error:oe}=await db.from('orders').select('id,number,subtotal,delivery_fee,discount,total').eq('id',data).eq('owner_id',user.id).single();if(oe||!order)throw Error('Não foi possível recuperar o pedido.');
 return NextResponse.json({id:order.id,number:order.number,quote:{subtotal:order.subtotal,delivery_fee:order.delivery_fee,discount:order.discount,total:order.total}});
 }catch{return NextResponse.json({error:'Não foi possível processar o pedido. Confira a conexão.'},{status:503});}
}
