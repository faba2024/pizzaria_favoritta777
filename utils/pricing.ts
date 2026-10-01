import type { Catalog, CartItem, Coupon, Quote, Size } from '@/types';
export const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const sizePrice=(size:Size)=>size.promotional_price??size.price;
export function priceItem(item:CartItem,catalog:Catalog){
 const p=catalog.products.find(p=>p.id===item.product_id);if(!p||!p.active)throw Error('Produto indisponível.');
 if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>50)throw Error('Quantidade inválida.');
 if(p.stock_quantity!==null&&item.quantity>p.stock_quantity)throw Error('Estoque insuficiente: '+p.name);
 let price=p.promotional_price??p.price;let sizeName:string|null=null;let flavorName:string|null=null;
 if(p.is_pizza){const s=p.product_sizes.find(s=>s.id===item.size_id&&s.active);if(!s)throw Error('Selecione um tamanho disponível.');price=sizePrice(s);sizeName=s.name;
 if(item.second_flavor_id){const second=catalog.products.find(x=>x.id===item.second_flavor_id&&x.active&&x.is_pizza);const ss=second?.product_sizes.find(x=>x.name===s.name&&x.active);if(!second||!ss)throw Error('Segundo sabor indisponível neste tamanho.');if(second.stock_quantity!==null&&item.quantity>second.stock_quantity)throw Error('Estoque insuficiente: '+second.name);price=Math.max(price,sizePrice(ss));flavorName=second.name;}}
 else if(item.size_id||item.second_flavor_id)throw Error('Opção inválida para o produto.');
 if(!Array.isArray(item.addon_ids)||item.addon_ids.length>20)throw Error('Adicionais inválidos.');
 if(new Set(item.addon_ids).size!==item.addon_ids.length)throw Error('Adicional duplicado.');
 const addons=item.addon_ids.map(id=>{const a=catalog.addons.find(a=>a.id===id&&a.active);if(!a||!p.is_pizza)throw Error('Adicional indisponível.');return a;});
 if(addons.filter(a=>a.kind==='crust').length>1)throw Error('Selecione apenas uma borda.');
 price+=addons.reduce((s,a)=>s+a.price,0);return {product:p,sizeName,flavorName,addons,unit:price,total:price*item.quantity};
}
export function couponDiscount(subtotal:number,coupon:Omit<Coupon,'id'|'code'>,now=new Date()){
 const start=new Date(coupon.starts_at),end=new Date(coupon.expires_at);
 if(!Number.isFinite(+start)||!Number.isFinite(+end)||!coupon.active||now<start||now>end)throw Error('Cupom fora da validade.');
 if(coupon.usage_limit!==null&&coupon.used_count>=coupon.usage_limit)throw Error('Cupom esgotado.');
 if(subtotal<coupon.minimum_order)throw Error('Pedido abaixo do mínimo do cupom.');
 if(!Number.isInteger(coupon.value)||coupon.value<=0||(coupon.kind==='percent'&&coupon.value>100))throw Error('Desconto inválido.');
 return Math.min(subtotal,coupon.kind==='percent'?Math.floor(subtotal*coupon.value/100):coupon.value);
}
export function deliveryFee(fulfillment:string,neighborhood:string,catalog:Catalog){if(!['delivery','pickup','table'].includes(fulfillment))throw Error('Recebimento inválido.');if(fulfillment!=='delivery')return 0;const z=catalog.zones.find(z=>z.active&&z.name===neighborhood);if(!z)throw Error('Bairro fora da área de entrega.');return z.fee;}
export function quoteCart(items:CartItem[],catalog:Catalog,fulfillment:string,neighborhood:string,code='',now=new Date()):Quote{
 if(!items.length||items.length>50)throw Error('Adicione produtos antes de continuar.');
 const required=new Map<string,number>();let subtotal=0;
 for(const item of items){const line=priceItem(item,catalog);subtotal+=line.total;for(const id of new Set([item.product_id,item.second_flavor_id].filter(Boolean) as string[]))required.set(id,(required.get(id)||0)+item.quantity);}
 for(const [id,qty] of required){const p=catalog.products.find(p=>p.id===id)!;if(p.stock_quantity!==null&&qty>p.stock_quantity)throw Error('Estoque insuficiente: '+p.name);}
 if(subtotal<catalog.settings.minimum_order)throw Error('Pedido mínimo: '+money(catalog.settings.minimum_order));
 let discount=0;if(code.trim()){const coupon=catalog.coupons?.find(c=>c.code===code.trim().toUpperCase());if(!coupon)throw Error('Cupom não encontrado.');discount=couponDiscount(subtotal,coupon,now);}
 const delivery_fee=deliveryFee(fulfillment,neighborhood,catalog);return {subtotal,delivery_fee,discount,total:subtotal+delivery_fee-discount};
}
