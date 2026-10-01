import {priceItem,money,quoteCart,sizePrice} from './pricing.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='favorita-cart-v1';
let bagQuote=null;let quoteSequence=0;
const hasPromo=p=>p.promotional_price!==null||p.product_sizes.some(s=>s.promotional_price!=null);

let catalog,preview=true,open=false,items=[],category='all',query='',selected=null,editing=null,feedbackTimer;
const findProduct=id=>catalog?.products.find(p=>p.id===id);
const count=()=>items.reduce((n,i)=>n+i.quantity,0);
const minPrice=p=>p.is_pizza&&p.product_sizes.some(s=>s.active)?Math.min(...p.product_sizes.filter(s=>s.active).map(s=>sizePrice(s))):p.promotional_price??p.price;
function feedback(message){$('cartFeedback').textContent=message;$('cartFeedback').hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>$('cartFeedback').hidden=true,3000);}
function bump(){for(const id of ['count','floatingCount','navCount']){const n=$(id);n.classList.remove('bump');void n.offsetWidth;n.classList.add('bump');}}
function persist(){bagQuote=null;quoteSequence++;try{localStorage.setItem(key,JSON.stringify(items));}catch{feedback('Seu navegador não permitiu salvar a sacola.');}renderCart();}
function loadCart(){try{const saved=JSON.parse(localStorage.getItem(key)||'[]');items=Array.isArray(saved)?saved.filter(i=>{try{if(typeof i.key!=='string'||typeof i.notes!=='string'||!Array.isArray(i.addon_ids))return false;priceItem(i,catalog);return true;}catch{return false;}}).slice(0,50):[];}catch{items=[];}}
function renderMenu(){
 const list=catalog.products.filter(p=>p.active&&(category==='all'||category==='promo'&&hasPromo(p)||p.category_id===category)&&`${p.name} ${p.description}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
 $('products').innerHTML=list.map(p=>{const tag=p.stock_quantity===0?'<span class="tag soldout">Esgotado</span>':hasPromo(p)?'<span class="tag promo-tag">Promoção</span>':p.is_combo?'<span class="tag">Combo</span>':p.featured?'<span class="tag">Favorita da casa</span>':'';const sizes=p.is_pizza?p.product_sizes.filter(s=>s.active).map(s=>esc(s.name)).join(' · '):'Unidade';return `<article class="product${p.stock_quantity===0?' is-soldout':''}"><div class="productMedia">${p.image_url?`<img ${p.is_pizza||p.is_combo?'':'class="beveragephoto"'} src="${esc(p.image_url)}" alt="${esc(p.name)+(preview&&p.is_pizza?' — imagem ilustrativa':'')}" loading="lazy" decoding="async" width="360" height="240">`:'<div class="empty">Foto em breve</div>'}${tag}</div><div class="productbody"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><span class="unit">${sizes}</span><div class="buy"><div class="priceRow">${p.is_pizza?'<small>a partir de</small>':''}<strong>${money(minPrice(p))}</strong>${p.promotional_price!==null&&!p.is_pizza?`<del>${money(p.price)}</del>`:''}</div><button class="add" data-add="${esc(p.id)}" ${p.stock_quantity===0?'disabled':''} aria-label="${p.stock_quantity===0?'Esgotado':'Adicionar '+esc(p.name)}">${p.stock_quantity===0?'Esgotado':p.is_pizza?'Escolher':'Adicionar'}<span aria-hidden="true">+</span></button></div></div></article>`}).join('')||'<p class="empty">Nenhum produto encontrado nesta seleção. Experimente outra categoria ou busca.</p>';
 document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category===category));
}
function showCategory(value){category=value;setCardapioOpen(true);renderMenu();}
function sizeRadio(){return document.querySelector('input[name="pizzaSize"]:checked')?.value||null;}
function draft(){return {key:editing?.key||crypto.randomUUID(),product_id:selected.id,size_id:selected.is_pizza?sizeRadio():null,second_flavor_id:selected.is_pizza?$('secondFlavor').value||null:null,addon_ids:[...document.querySelectorAll('[name="pizzaCrust"]:checked,[name="addon"]:checked')].map(n=>n.value).filter(Boolean),quantity:Number($('itemQuantity').value),notes:$('itemNotes').value};}
function updatePrice(){const btn=$('sizeForm').querySelector('button[type="submit"]');const label=editing?'Salvar alterações':'Adicionar ao pedido';try{const p=priceItem(draft(),catalog);$('sizePrice').textContent=money(p.total);btn.innerHTML=`<span>${label}</span><b>${money(p.total)}</b>`;btn.disabled=false;}catch(e){$('sizePrice').textContent=e.message;btn.textContent=label;}}
function updateFlavors(){const size=selected.product_sizes.find(s=>s.id===sizeRadio());const previous=$('secondFlavor').value;$('secondFlavor').innerHTML='<option value="">Um sabor</option>'+catalog.products.filter(p=>p.active&&p.is_pizza&&p.id!==selected.id&&p.stock_quantity!==0&&p.product_sizes.some(s=>s.active&&s.name===size?.name)).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');if([...$('secondFlavor').options].some(o=>o.value===previous))$('secondFlavor').value=previous;}
function start(p,item=null){
 selected=p;editing=item;$('sizeForm').reset();$('sizeFlavor').textContent=p.name;$('modalPhoto').src=p.image_url||'';$('modalPhoto').hidden=!p.image_url;$('modalDescription').textContent=p.description;
 $('sizeChoices').hidden=!p.is_pizza;$('crustChoices').hidden=!p.is_pizza;$('secondFlavor').parentElement.hidden=!p.is_pizza;
 $('sizeChoices').innerHTML='<legend>Escolha o tamanho</legend>'+p.product_sizes.filter(s=>s.active).map(s=>`<label class="sizeoption"><input type="radio" name="pizzaSize" value="${esc(s.id)}" ${item?.size_id===s.id||(!item&&s.id===p.product_sizes.find(s=>s.active)?.id)?'checked':''} required><span><strong>${esc(s.name)}</strong><small>${money(sizePrice(s))}</small></span></label>`).join('');
 $('crustChoices').innerHTML='<legend>Qual borda você prefere?</legend><label class="sizeoption"><input type="radio" name="pizzaCrust" value="" checked><span><strong>Sem borda recheada</strong></span></label>'+catalog.addons.filter(a=>a.active&&a.kind==='crust').map(a=>`<label class="sizeoption"><input type="radio" name="pizzaCrust" value="${esc(a.id)}"><span><strong>${esc(a.name)}</strong><small>${a.price?money(a.price):'Sem custo adicional'}</small></span></label>`).join('');
 $('addonChoices').hidden=!p.is_pizza;$('addonChoices').innerHTML=(p.is_pizza?catalog.addons:[]).filter(a=>a.active&&a.kind!=='crust').map(a=>`<label class="sizeoption"><input type="checkbox" name="addon" value="${esc(a.id)}"><span>${esc(a.name)} · ${a.price?money(a.price):'sem custo'}</span></label>`).join('');
 document.querySelectorAll('[name="pizzaCrust"],[name="addon"]').forEach(n=>{if(item?.addon_ids.includes(n.value))n.checked=true;});
 $('itemQuantity').value=item?.quantity||1;$('itemNotes').value=item?.notes||'';updateFlavors();$('secondFlavor').value=item?.second_flavor_id||'';
 $('sizeTitle').textContent=p.is_pizza?'Sua pizza, do seu jeito':'Personalize seu item';$('sizeForm').querySelector('button[type="submit"]').textContent=item?'Salvar alterações':'Adicionar ao pedido';updatePrice();$('sizeDialog').showModal();
}
function add(p){if(!p||p.stock_quantity===0)return;if(p.is_pizza){start(p);return;}if(items.length>=50){feedback('Sua sacola chegou ao limite de 50 itens.');return;}const existing=items.find(i=>i.product_id===p.id&&!i.notes&&!i.addon_ids.length);if(existing){if(existing.quantity>=50)return;try{priceItem({...existing,quantity:existing.quantity+1},catalog)}catch(e){feedback(e.message);return}existing.quantity++;}else items.push({key:crypto.randomUUID(),product_id:p.id,size_id:null,second_flavor_id:null,addon_ids:[],quantity:1,notes:''});persist();bump();feedback('Adicionado à sua sacola.');}
function renderCart(){
 let total=0,invalid=false;
 $('items').innerHTML=items.map(item=>{try{const p=priceItem(item,catalog);total+=p.total;return `<div class="line"><strong>${esc(p.product.name)}${p.flavorName?' / '+esc(p.flavorName):''}</strong><small>${esc(p.sizeName||'Unidade')}${p.addons.map(a=>' · '+(a.kind==='crust'?'Borda ':'')+esc(a.name)).join('')}</small>${item.notes?`<small>${esc(item.notes)}</small>`:''}<div class="linebottom"><div class="qty"><button type="button" data-key="${esc(item.key)}" data-delta="-1" aria-label="Diminuir quantidade">−</button><span>${item.quantity}</span><button type="button" data-key="${esc(item.key)}" data-delta="1" aria-label="Aumentar quantidade" ${item.quantity>=50?'disabled':''}>+</button></div><b>${money(p.total)}</b></div><div class="item-actions"><button data-edit="${esc(item.key)}">Editar</button><button data-remove="${esc(item.key)}">Remover</button></div></div>`;}catch{invalid=true;return `<div class="line">Item indisponível <button data-remove="${esc(item.key)}">Remover</button></div>`;}}).join('')||'<div class="empty"><span aria-hidden="true">＋</span><p>Seu pedido começa com<br>uma boa escolha.</p></div>';
 renderBagTotals(total);$('count').textContent=count();$('floatingCount').textContent=count();$('navCount').textContent=count();$('navCount').hidden=!items.length;$('floatingBag').hidden=!items.length;$('clearBag').hidden=!items.length;
 $('finish').disabled=!items.length||invalid||(!preview&&!open);$('finish').textContent=!preview&&!open?'Pedidos encerrados por enquanto':'Continuar pedido';
 document.querySelector('.grand>span').textContent=$('bagFulfillment').value==='delivery'&&!$('bagZone').value?'Total parcial':'Total';
 $('orderNotice').textContent=preview?'Demonstração: taxas, descontos e preços ilustrativos.':'Você confere entrega, cupom e total antes de confirmar.';
 const suggestions=catalog.products.filter(p=>p.active&&p.stock_quantity!==0&&!items.some(i=>i.product_id===p.id)).slice(0,5);
 $('recommendations').hidden=!items.length||!suggestions.length;$('suggestedProducts').innerHTML=suggestions.map(p=>`<button type="button" data-add="${esc(p.id)}">${p.image_url?`<img src="${esc(p.image_url)}" alt="" loading="lazy">`:''}<span>${esc(p.name)}</span><strong>${p.is_pizza?'A partir de ':''}${money(minPrice(p))}</strong></button>`).join('');
}
function showBag(){closeMenu();$('bagContent').append($('pedido'));$('bagDialog').showModal();document.body.classList.add('bag-lock');}
function closeBag(){$('bagDialog').close();}
$('bagDialog').addEventListener('close',()=>{$('bagHome').after($('pedido'));document.body.classList.remove('bag-lock');});$('closeBag').onclick=closeBag;$('floatingBag').onclick=showBag;
$('clearBag').onclick=()=>{if(confirm('Limpar todos os itens da sacola?')){items=[];persist();}};
$('moreItems').onclick=()=>{closeBag();setCardapioOpen(true);$('cardapio').scrollIntoView({behavior:'smooth'});};
$('menuSearch').addEventListener('input',e=>{query=e.target.value;if(query.trim())category='all';if(catalog)renderMenu();});
$('categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b&&catalog)showCategory(b.dataset.category);});
document.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)add(findProduct(b.dataset.add));});
$('sizeClose').onclick=()=>$('sizeDialog').close();
$('sizeForm').addEventListener('change',e=>{if(e.target.name==='pizzaSize')updateFlavors();updatePrice();});$('itemQuantity').addEventListener('input',updatePrice);
$('sizeForm').addEventListener('submit',e=>{e.preventDefault();try{const item=draft();priceItem(item,catalog);if(!editing&&items.length>=50)throw Error('Sua sacola chegou ao limite de 50 itens.');items=items.filter(i=>i.key!==item.key);items.push(item);persist();if(!editing)bump();$('sizeDialog').close();feedback(editing?'Item atualizado.':'Adicionado à sua sacola.');}catch(e){$('sizePrice').textContent=e.message;}});
$('items').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]');if(edit){const i=items.find(x=>x.key===edit.dataset.edit);if(i)start(findProduct(i.product_id),i);return;}const remove=e.target.closest('[data-remove]');if(remove){items=items.filter(i=>i.key!==remove.dataset.remove);persist();return;}const delta=e.target.closest('[data-delta]');if(delta){const item=items.find(i=>i.key===delta.dataset.key);if(!item)return;const next=Math.min(50,item.quantity+Number(delta.dataset.delta));if(next>0){try{priceItem({...item,quantity:next},catalog)}catch(e){feedback(e.message);return}}item.quantity=next;items=items.filter(i=>i.quantity>0);persist();}});
$('checkout').addEventListener('submit',e=>{e.preventDefault();if(items.length&&(preview||open)){persist();location.href='/checkout';}});
const menuPanel=$('mobileMenu');function closeMenu(){if(menuPanel.open)menuPanel.close();$('menuToggle').setAttribute('aria-expanded','false');}$('menuToggle').onclick=()=>{menuPanel.showModal();$('menuToggle').setAttribute('aria-expanded','true');};$('closeMenu').onclick=closeMenu;menuPanel.addEventListener('close',()=>$('menuToggle').setAttribute('aria-expanded','false'));menuPanel.addEventListener('click',e=>{const a=e.target.closest('a');if(a){if(a.dataset.beverages&&catalog){const drinks=catalog.categories.find(c=>/bebida/i.test(c.name));if(drinks)showCategory(drinks.id);}closeMenu();}});
function setCardapioOpen(value){$('cardapioContent').hidden=!value;$('toggleCardapio').setAttribute('aria-expanded',String(value));$('catalogButtonTitle').textContent=value?'FECHAR CARDÁPIO':'ABRIR CARDÁPIO';$('catalogButtonHint').textContent=value?'Toque para recolher os sabores e bebidas':'Escolha sua pizza favorita e faça seu pedido';$('catalogButtonArrow').textContent=value?'−':'+';}$('toggleCardapio').onclick=()=>setCardapioOpen($('cardapioContent').hidden);
document.addEventListener('click',e=>{const a=e.target.closest('a');const href=a?.getAttribute('href');if(!href?.startsWith('#'))return;e.preventDefault();if(href==='#pedido'){showBag();return;}if(href==='#cardapio')setCardapioOpen(true);history.replaceState(null,'','/'+href);if(href==='#')window.scrollTo({top:0,behavior:'smooth'});else document.getElementById(href.slice(1))?.scrollIntoView({behavior:'smooth'});});
const welcome=$('welcomeSplash');function closeWelcome(){welcome.classList.add('welcomeLeaving');document.body.classList.remove('welcomeLock');try{sessionStorage.setItem('favorita-welcomed','1');}catch{}setTimeout(()=>welcome.remove(),650);}let welcomed=false;try{welcomed=sessionStorage.getItem('favorita-welcomed')==='1'}catch{}if(location.hash||welcomed)welcome.remove();else{document.body.classList.add('welcomeLock');$('enterSite').onclick=closeWelcome;welcome.addEventListener('click',e=>{if(e.target===welcome)closeWelcome();});}
async function load(){const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível carregar o cardápio.');const data=await response.json();catalog=data.catalog;preview=data.preview;open=data.open;updateStoreInfo(data);$('categories').innerHTML='<button class="active" data-category="all">Todas</button>'+catalog.categories.map(c=>`<button data-category="${esc(c.id)}">${esc(c.name)}</button>`).join('')+'<button data-category="promo">Promoções</button>';restoreOptions();loadCart();renderMenu();renderCart();if(location.hash==='#pedido')showBag();else if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();}
load().catch(e=>{$('products').textContent=e.message+' Atualize a página para tentar novamente.';});
window.addEventListener('pageshow',e=>{if(e.persisted&&catalog){loadCart();renderCart();}});
window.addEventListener('storage',e=>{if(e.key===key&&catalog){loadCart();renderCart();}});


function saveOptions(){try{sessionStorage.setItem('favorita-order-options',JSON.stringify({fulfillment:$('bagFulfillment').value,neighborhood:$('bagZone').value,coupon:$('bagCoupon').value.toUpperCase()}))}catch{}}
function restoreOptions(){
 $('bagZone').innerHTML='<option value="">Selecione seu bairro</option>'+catalog.zones.filter(z=>z.active).map(z=>'<option value="'+esc(z.name)+'">'+esc(z.name)+' · '+money(z.fee)+'</option>').join('');
 try{const o=JSON.parse(sessionStorage.getItem('favorita-order-options')||'{}');if(['delivery','pickup','table'].includes(o.fulfillment))$('bagFulfillment').value=o.fulfillment;$('bagZone').value=o.neighborhood||'';$('bagCoupon').value=o.coupon||''}catch{}
}
function renderBagTotals(subtotal){
 const mode=$('bagFulfillment').value,zone=$('bagZone').value,code=$('bagCoupon').value;
 $('bagZoneLabel').hidden=mode!=='delivery';
 const fee=mode==='delivery'?catalog.zones.find(z=>z.active&&z.name===zone)?.fee:null;
 let q={subtotal,delivery_fee:fee||0,discount:0,total:subtotal+(fee||0)};
 if(preview&&items.length){try{q=quoteCart(items,catalog,mode,zone,code)}catch{}}
 if(bagQuote)q=bagQuote;
 $('subtotal').textContent=money(q.subtotal);$('deliveryTotal').textContent=mode==='delivery'&&fee==null?'Selecione o bairro':money(q.delivery_fee);
 $('discountTotal').textContent='−'+money(q.discount);$('total').textContent=money(q.total);
 $('floatingBag').setAttribute('aria-label','Meu pedido • '+count()+' itens • '+money(q.total));
 $('floatingTotal').textContent=money(q.total);
}
for(const id of ['bagFulfillment','bagZone','bagCoupon'])$(id).addEventListener('change',()=>{bagQuote=null;quoteSequence++;saveOptions();$('bagQuoteStatus').textContent='';renderCart()});
$('applyBagCoupon').onclick=async()=>{const sequence=++quoteSequence;$('applyBagCoupon').disabled=true;$('bagQuoteStatus').textContent='Calculando…';saveOptions();try{
 const payload={items,fulfillment:$('bagFulfillment').value,neighborhood:$('bagZone').value,coupon:$('bagCoupon').value};
 let q;if(preview)q=quoteCart(items,catalog,payload.fulfillment,payload.neighborhood,payload.coupon);else{const res=await fetch('/api/cart-quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});q=await res.json();if(!res.ok)throw Error(q.error||'Não foi possível aplicar o cupom.')}
 if(sequence!==quoteSequence)return;bagQuote=q;renderCart();$('bagQuoteStatus').textContent=payload.coupon?'Cupom aplicado: −'+money(q.discount):'Valores atualizados.';
 }catch(e){if(sequence===quoteSequence){bagQuote=null;$('bagQuoteStatus').textContent=e.message;renderCart()}}finally{$('applyBagCoupon').disabled=false}};
function updateStoreInfo(data){
 const r=data.catalog.restaurant;$('storeStatus').className='small storeStatus '+(data.open?'is-open':'is-closed');$('storeStatus').innerHTML=`<b>${data.open?'Aberto agora':'Fechado'}</b>${data.open?'':'<span>'+esc(data.openingLabel)+'</span>'}${data.preview?'<em>Horários de demonstração</em>':''}`;
 $('contactAddress').textContent=r.address;$('menuContact').textContent=r.address+' · '+r.phone;
 $('contactWhatsapp').href='https://wa.me/'+r.whatsapp.replace(/\D/g,'');$('contactWhatsapp').textContent='WhatsApp: '+r.phone;
 const instagram=data.catalog.settings.instagram;if(instagram){const url=instagram.startsWith('https://www.instagram.com/')||instagram.startsWith('https://instagram.com/')?instagram:'https://www.instagram.com/'+encodeURIComponent(instagram.replace(/^@/,''));$('contactInstagram').href=url;$('contactInstagram').hidden=false}
 $('promotionBanners').innerHTML=(data.catalog.promotions||[]).filter(p=>p.active).map(p=>'<article class="promo-banner"><span class="tag">PROMOÇÃO</span><strong>'+esc(p.title)+'</strong><p>'+esc(p.description)+'</p>'+(p.product_id&&findProduct(p.product_id)?'<button class="add" data-add="'+esc(p.product_id)+'">Ver oferta</button>':'')+'</article>').join('');
}
setInterval(async()=>{try{const res=await fetch('/api/catalog',{cache:'no-store'});if(!res.ok)return;const data=await res.json();catalog=data.catalog;open=data.open;updateStoreInfo(data);renderMenu();bagQuote=null;renderCart()}catch{}},60000);

const yearEl=$('year');if(yearEl)yearEl.textContent=new Date().getFullYear();
