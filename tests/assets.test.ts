import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {previewCatalog} from '../lib/preview-catalog';

// O vitest roda na raiz do projeto (npm test).
const root=process.cwd();
const pub=path.join(root,'public');
const store=path.join(pub,'original');
const read=(f:string)=>fs.readFileSync(f,'utf8');
const exists=(f:string)=>fs.existsSync(f)&&fs.statSync(f).isFile();
const html=read(path.join(store,'index.html'));
const appRoutes=['/login','/perfil','/meus-pedidos','/checkout'];
// Resolve um caminho como o navegador faz na vitrine (<base href="/original/">).
const resolveStore=(ref:string)=>{const clean=ref.split(/[?#]/)[0];return clean.startsWith('/')?path.join(pub,clean):path.join(store,clean);};
const pngSize=(f:string)=>{const b=fs.readFileSync(f);return [b.readUInt32BE(16),b.readUInt32BE(20)];};

describe('Arquivos e caminhos da vitrine',()=>{
 it('todos os src/href locais do index.html existem',()=>{
  const refs=[...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(r=>!/^(https?:|mailto:|tel:|#|data:)/.test(r)&&r!=='/original/'&&r!=='/');
  expect(refs.length>10).toBe(true);
  const missing=refs.filter(r=>appRoutes.includes(r)?!exists(path.join(root,'app',r.slice(1),'page.tsx')):!exists(resolveStore(r)));
  expect(missing).toEqual([]);
 });
 it('a vitrine não depende de recursos externos (fontes auto-hospedadas)',()=>{
  const external=[...html.matchAll(/<(?:link|script)[^>]+(?:src|href)="(https?:[^"]+)"/g)].map(m=>m[1]);
  expect(external).toEqual([]);
  for(const f of fs.readdirSync(store).filter(f=>f.endsWith('.css')))expect(read(path.join(store,f)).includes('@import')).toBe(false);
  expect(exists(path.join(pub,'fonts','fonts.css'))).toBe(true);
 });
 it('todos os url() dos CSS da vitrine existem',()=>{
  const missing:string[]=[];
  for(const f of fs.readdirSync(store).filter(f=>f.endsWith('.css')))for(const m of read(path.join(store,f)).matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)){const u=m[1];if(/^(data:|https?:)/.test(u))continue;if(!exists(resolveStore(u)))missing.push(`${f}: ${u}`);}
  expect(missing).toEqual([]);
 });
 it('os imports de JavaScript da vitrine existem',()=>{
  for(const f of fs.readdirSync(store).filter(f=>f.endsWith('.js')))for(const m of read(path.join(store,f)).matchAll(/from\s+'(\.[^']+)'/g))expect(exists(path.join(store,m[1]))).toBe(true);
 });
 it('fotos e logo do catálogo de prévia existem',()=>{
  const refs=[previewCatalog.restaurant.logo_url,...previewCatalog.products.map(p=>p.image_url)].filter((u):u is string=>!!u);
  expect(refs.filter(u=>!exists(path.join(pub,u)))).toEqual([]);
 });
 it('o cache do service worker aponta para arquivos existentes',()=>{
  const list=read(path.join(pub,'sw.js')).match(/addAll\(\[([^\]]*)\]/)![1];
  for(const m of list.matchAll(/'([^']+)'/g))expect(exists(path.join(pub,m[1]))).toBe(true);
 });
});

describe('Manifest, ícones e compartilhamento',()=>{
 const manifest=JSON.parse(read(path.join(pub,'manifest.webmanifest')));
 it('manifest tem os campos essenciais e cores da marca',()=>{
  for(const k of ['name','short_name','start_url','display','icons','theme_color','background_color'])expect(k in manifest).toBe(true);
  expect(manifest.theme_color).toBe('#0b0b09');
 });
 it('ícones do manifest existem e têm o tamanho declarado',()=>{
  for(const icon of manifest.icons){const f=path.join(pub,icon.src);expect(exists(f)).toBe(true);const [w,h]=pngSize(f);expect(`${w}x${h}`).toBe(icon.sizes);}
  expect(manifest.icons.some((i:{purpose?:string})=>i.purpose==='maskable')).toBe(true);
 });
 it('favicon, apple-touch-icon e og:image existem',()=>{
  for(const f of ['favicon.ico','favicon.png','apple-touch-icon.png','og-image.jpg'])expect(exists(path.join(pub,f))).toBe(true);
  expect(html).toContain('property="og:image"');
  expect(html).toContain('og:image:width" content="1200"');
 });
 it('o index.html não tem marcadores sem conteúdo nem textos provisórios',()=>{
  expect(/lorem ipsum|\bTODO\b|\bFIXME\b|\bXXX\b/i.test(html.replace(/placeholder="[^"]*"/g,''))).toBe(false);
  expect(html).toContain('<!--fonts-->');
  expect(html).toContain('/fonts/fonts.css');
 });
});
