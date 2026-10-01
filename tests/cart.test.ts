import {describe,it,expect} from 'vitest';
import {previewCatalog} from '../lib/preview-catalog';
import {priceItem} from '../utils/pricing';
import {cartItemSchema,checkoutSchema} from '../validations/order';
describe('Fluxo da sacola',()=>{
 it('leva a borda para o total e impede duas bordas no mesmo item',()=>{const catalog=structuredClone(previewCatalog);catalog.addons[0].price=800;const product=catalog.products[0];const item={key:'borda',product_id:product.id,size_id:product.product_sizes[1].id,second_flavor_id:null,addon_ids:[catalog.addons[0].id],quantity:1,notes:''};expect(priceItem(item,catalog).total).toBe(6800);expect(()=>priceItem({...item,addon_ids:catalog.addons.map(a=>a.id)},catalog)).toThrow('Selecione apenas uma borda.');});
 it('preserva os dados válidos da sacola e calcula quantidade e tamanho',()=>{const product=previewCatalog.products[0];const item=cartItemSchema.parse({key:'test',product_id:product.id,size_id:product.product_sizes[1].id,second_flavor_id:null,addon_ids:[],quantity:2,notes:'Sem cebola'});expect(priceItem(item,previewCatalog).total).toBe(12000);expect(cartItemSchema.parse(JSON.parse(JSON.stringify(item)))).toEqual(item);});
 it('cobra o maior preço para pizza com dois sabores',()=>{const catalog=structuredClone(previewCatalog);catalog.products[1].product_sizes[0].price=4500;const p=catalog.products[0];expect(priceItem({key:'test',product_id:p.id,size_id:p.product_sizes[0].id,second_flavor_id:catalog.products[1].id,addon_ids:[],quantity:1,notes:''},catalog).total).toBe(4500);});
 it('permite retirada sem exigir endereço e rejeita telefone incompleto',()=>{const checkout={name:'Cliente Teste',phone:'77999999999',fulfillment:'pickup',payment:'pix',table_number:'',change_for:'',cep:'',street:'',number:'',neighborhood:'',complement:'',city:'',state:'BA',reference:'',coupon:''};expect(checkoutSchema.safeParse(checkout).success).toBe(true);expect(checkoutSchema.safeParse({...checkout,phone:'77'}).success).toBe(false);});
});
