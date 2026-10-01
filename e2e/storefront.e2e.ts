import {test,expect,type Page} from '@playwright/test';

// E2E_STATIC=1 roda só a vitrine estática (sem o servidor Next), útil para revisão visual rápida.
const staticOnly=!!process.env.E2E_STATIC;
const isNarrow=(page:Page)=>(page.viewportSize()?.width??1366)<=650;
const hasSidebar=(page:Page)=>(page.viewportSize()?.width??1366)>=1100;

async function enter(page:Page,errors:string[]){
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto('/');
 await page.getByRole('button',{name:/Entrar no cardápio/}).click();
 await expect(page.locator('#welcomeSplash')).toHaveCount(0);
 await expect(page.locator('#products .product:not(.skeleton)').first()).toBeVisible();
}

async function openBag(page:Page){
 if(hasSidebar(page))return page.locator('#pedido');
 await page.locator('#floatingBag').click();
 await expect(page.locator('#bagDialog')).toBeVisible();
 return page.locator('#bagDialog #pedido');
}

async function addCalabresa(page:Page,size:'Pequena'|'Grande'='Grande'){
 await page.locator('#products .product',{hasText:'Calabresa'}).getByRole('button',{name:/Calabresa/}).click();
 const dialog=page.locator('#sizeDialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:/do seu jeito/i})).toBeVisible();
 await dialog.locator('.sizeoption',{hasText:size}).first().click();
 const submit=dialog.locator('button[type="submit"]');
 await expect(submit).toContainText(size==='Grande'?'R$ 60,00':'R$ 30,00');
 await submit.click();
 await expect(dialog).toBeHidden();
}

test.describe('Vitrine A Favorita',()=>{
 let errors:string[];
 test.beforeEach(async({page})=>{errors=[];await enter(page,errors);});
 test.afterEach(()=>{expect(errors,'erros de console/rede').toEqual([]);});

 test('layout sem overflow horizontal, textos cortados ou imagens quebradas',async({page})=>{
  await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}window.scrollTo(0,0);});
  await page.waitForLoadState('networkidle');
  const report=await page.evaluate(()=>{
   const vw=document.documentElement.clientWidth;
   const scrollers=[...document.querySelectorAll('#categories,#suggestedProducts')];
   const visible=(el:Element)=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!el.closest('dialog:not([open])')};
   const overflow=[...document.querySelectorAll('body *')].filter(el=>visible(el)&&!scrollers.some(s=>s.contains(el))&&!el.closest('#welcomeSplash')&&el.getBoundingClientRect().right>vw+1).map(el=>el.tagName+(el.id?'#'+el.id:'')+'.'+[...el.classList].join('.'));
   const clipped=[...document.querySelectorAll('button,h1,h2,h3,.cartlink,.priceRow strong,.tag')].filter(el=>visible(el)&&el.scrollWidth>el.clientWidth+1).map(el=>(el.textContent||'').trim().slice(0,40));
   const brokenImgs=[...document.images].filter(i=>!i.closest('dialog:not([open])')&&i.getAttribute('src')&&(!i.complete||i.naturalWidth===0)).map(i=>i.getAttribute('src'));
   return {pageOverflow:document.documentElement.scrollWidth>vw,overflow,clipped,brokenImgs};
  });
  expect(report.pageOverflow).toBe(false);
  expect(report.overflow).toEqual([]);
  expect(report.clipped).toEqual([]);
  expect(report.brokenImgs).toEqual([]);
 });

 test('busca encontra em todas as categorias e mostra estado vazio',async({page})=>{
  await page.locator('#categories button',{hasText:'Bebidas'}).click();
  await page.getByPlaceholder('Qual vai ser sua Favorita?').fill('queijo');
  await expect(page.locator('#products .product')).toHaveCount(1);
  await expect(page.locator('#products .product h3')).toHaveText('Quatro Queijos');
  await page.getByPlaceholder('Qual vai ser sua Favorita?').fill('xyzinexistente');
  await expect(page.locator('#products .empty')).toContainText('Nenhum produto encontrado');
 });

 test('categorias filtram o cardápio',async({page})=>{
  await page.locator('#categories button',{hasText:'Bebidas'}).click();
  await expect(page.locator('#categories button.active')).toHaveText('Bebidas');
  await expect(page.locator('#products .product',{hasText:'Coca-Cola'})).toBeVisible();
  await expect(page.locator('#products .product',{hasText:'Calabresa'})).toHaveCount(0);
  await page.locator('#categories button',{hasText:'Pizzas especiais'}).click();
  await expect(page.locator('#products .product',{hasText:'Quatro Queijos'})).toBeVisible();
  await expect(page.locator('#products .product',{hasText:'Coca-Cola'})).toHaveCount(0);
  await page.locator('#categories button',{hasText:'Todas'}).click();
  expect(await page.locator('#products .product').count()).toBeGreaterThan(8);
 });

 test('abrir produto, adicionar itens e editar a sacola',async({page})=>{
  await addCalabresa(page,'Grande');
  await expect(page.locator('#count')).toHaveText('1');
  await page.locator('#products .product',{hasText:'Coca-Cola'}).getByRole('button',{name:/Coca-Cola/}).click();
  await expect(page.locator('#count')).toHaveText('2');
  await expect(page.locator('#cartFeedback')).toBeVisible();
  const bag=await openBag(page);
  await expect(bag.locator('.line')).toHaveCount(2);
  await expect(bag.locator('#total')).toHaveText('R$ 72,00');
  await bag.locator('.line',{hasText:'Coca-Cola'}).getByRole('button',{name:'Aumentar quantidade'}).click();
  await expect(bag.locator('#total')).toHaveText('R$ 84,00');
  await bag.locator('.line',{hasText:'Coca-Cola'}).getByRole('button',{name:/Remover/}).click();
  await expect(bag.locator('.line')).toHaveCount(1);
  await expect(bag.locator('#total')).toHaveText('R$ 60,00');
  await expect(bag.locator('#finish')).toBeEnabled();
 });

 test('menu inferior e navegação',async({page})=>{
  const bottom=page.locator('.bottomnav');
  if(!isNarrow(page)){
   await expect(bottom).toBeHidden();
   if(hasSidebar(page))await expect(page.locator('.desktopnav')).toBeVisible();
   await page.locator('#menuToggle').click();
   await expect(page.locator('#mobileMenu')).toBeVisible();
   await page.locator('#closeMenu').click();
   await expect(page.locator('#mobileMenu')).toBeHidden();
   return;
  }
  await expect(bottom).toBeVisible();
  const box=await bottom.boundingBox();expect(Math.round(box!.y+box!.height)).toBe(page.viewportSize()!.height);
  await bottom.getByRole('link',{name:/Cardápio/}).click();
  await expect(page.locator('#cardapioContent')).toBeVisible();
  await addCalabresa(page,'Pequena');
  await expect(page.locator('#navCount')).toHaveText('1');
  await bottom.getByRole('link',{name:/Carrinho/}).click();
  await expect(page.locator('#bagDialog')).toBeVisible();
  await page.locator('#closeBag').click();
  await expect(page.locator('#bagDialog')).toBeHidden();
  await page.locator('#menuToggle').click();
  await expect(page.locator('#mobileMenu')).toBeVisible();
  await page.locator('#mobileMenu').getByRole('link',{name:/Bebidas/}).click();
  await expect(page.locator('#categories button.active')).toHaveText('Bebidas');
  if(!staticOnly){
   await bottom.getByRole('link',{name:/Pedidos/}).click();
   await expect(page).toHaveURL(/\/meus-pedidos$/);
   await expect(page.getByRole('heading',{name:'Meus pedidos'})).toBeVisible();
   await page.goto('/perfil');
   await expect(page.getByRole('heading',{name:'Seu perfil'})).toBeVisible();
  }
 });

 test('checkout completo até a revisão',async({page})=>{
  test.skip(staticOnly,'checkout depende do servidor Next');
  await addCalabresa(page,'Grande');
  const bag=await openBag(page);
  await bag.locator('#finish').click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading',{name:/Quase à sua mesa/})).toBeVisible();
  await expect(page.locator('.checkout-summary')).toContainText('Calabresa');
  await page.getByLabel('Nome completo').fill('Cliente Teste');
  await page.getByLabel('Telefone com DDD').fill('77999999999');
  await page.getByRole('button',{name:'Continuar'}).click();
  await expect(page.getByRole('heading',{name:'Como deseja receber?'})).toBeVisible();
  await page.getByRole('button',{name:'Retirada'}).click();
  await page.getByRole('button',{name:'Continuar'}).click();
  await expect(page.getByRole('heading',{name:'Como prefere pagar?'})).toBeVisible();
  await page.getByRole('button',{name:'Revisar pedido'}).click();
  await expect(page.getByRole('heading',{name:'Está tudo certinho?'})).toBeVisible();
  await expect(page.locator('.grand-total')).toContainText('R$ 60,00');
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
  expect(noOverflow).toBe(true);
 });
});
