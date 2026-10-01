export type Role = 'admin' | 'attendant' | 'kitchen' | 'courier';
export const statuses = ['new','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'] as const;
export type Status = typeof statuses[number];
export const statusLabels: Record<Status,string> = {new:'Novo',confirmed:'Confirmado',preparing:'Em preparo',ready:'Pronto',out_for_delivery:'Saiu para entrega',delivered:'Entregue',cancelled:'Cancelado'};
export interface Category { id:string; restaurant_id:string; name:string; active:boolean; sort_order:number }
export interface Size { id:string; product_id:string; name:string; price:number; promotional_price?:number|null; active:boolean }
export interface Addon { id:string; restaurant_id:string; name:string; price:number; kind:'addon'|'crust'; active:boolean }
export interface Product { id:string; restaurant_id:string; category_id:string; name:string; description:string; image_url:string|null; price:number; promotional_price:number|null; active:boolean; featured:boolean; is_combo?:boolean; is_pizza:boolean; stock_quantity:number|null; product_sizes:Size[] }
export interface Zone { id:string; restaurant_id:string; name:string; fee:number; estimated_minutes:number; active:boolean }
export interface Restaurant { id:string; slug:string; name:string; logo_url:string|null; whatsapp:string; phone:string; address:string; timezone:string; active:boolean }
export interface Settings { restaurant_id:string; minimum_order:number; pix_key:string; brand_color:string; instagram:string; hours:Record<string,{open:string;close:string;enabled:boolean}> }
export interface CartItem { key:string; product_id:string; size_id:string|null; second_flavor_id:string|null; addon_ids:string[]; quantity:number; notes:string }
export interface Promotion {id:string;restaurant_id:string;title:string;description:string;active:boolean;product_id:string|null}
export interface Coupon {id?:string;code:string;kind:"percent"|"fixed";value:number;minimum_order:number;starts_at:string;expires_at:string;usage_limit:number|null;used_count:number;active:boolean}
export interface Quote {subtotal:number;delivery_fee:number;discount:number;total:number}
export interface Catalog { restaurant:Restaurant; settings:Settings; categories:Category[]; products:Product[]; addons:Addon[]; zones:Zone[]; promotions?:Promotion[]; coupons?:Coupon[] }
export interface Customer {id:string; name:string; phone:string; created_at:string}
export interface OrderItem { id:string; product_name:string; size_name:string|null; flavor_name:string|null; quantity:number; unit_price:number; notes:string; addons:{name:string;price:number}[] }
export interface Order { id:string; number:number; restaurant_id:string; customer_id:string; customer_name:string; customer_phone:string; address:Record<string,string>|null; status:Status; payment:'pix'|'cash'|'card'|'credit'|'debit'; fulfillment:'delivery'|'pickup'|'table'; table_number:string|null; change_for:number|null; subtotal:number; delivery_fee:number; discount:number; total:number; created_at:string; order_items:OrderItem[] }
