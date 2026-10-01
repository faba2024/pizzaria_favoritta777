import {serverDb} from '@/lib/supabase/server';
import type {Catalog} from '@/types';
export async function getCatalog():Promise<Catalog>{
 const db=await serverDb();
 const {data:restaurant,error}=await db.from('restaurants').select('*').eq('slug',process.env.NEXT_PUBLIC_RESTAURANT_SLUG||'favorita').single();
 if(error||!restaurant)throw Error('Restaurante não cadastrado.');
 const results=await Promise.all([
 db.from('restaurant_settings').select('*').eq('restaurant_id',restaurant.id).single(),
 db.from('categories').select('*').eq('restaurant_id',restaurant.id).eq('active',true).order('sort_order'),
 db.from('products').select('*,product_sizes(*)').eq('restaurant_id',restaurant.id).eq('active',true).order('name'),
 db.from('addons').select('*').eq('restaurant_id',restaurant.id).eq('active',true),
 db.from('delivery_zones').select('*').eq('restaurant_id',restaurant.id).eq('active',true),
 db.from('promotions').select('*').eq('restaurant_id',restaurant.id).eq('active',true)]);
 if(results.some(r=>r.error))throw Error('Não foi possível carregar o cardápio.');
 const categories=results[1].data as Catalog['categories'];
 return {restaurant,settings:results[0].data,categories,products:(results[2].data as Catalog['products']).filter(p=>categories.some(c=>c.id===p.category_id)),addons:results[3].data,zones:results[4].data,promotions:results[5].data} as Catalog;
}
