// Auto-hospeda as fontes da marca (DM Sans e Barlow Condensed) em public/fonts.
// Roda no predev/prebuild. Sem internet, mantém os arquivos já baixados; se nunca
// foram baixados, gera um fonts.css que aponta para fontes locais equivalentes,
// para o site continuar legível e sem quebrar o build.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'fonts');
const cssFile = path.join(outDir, 'fonts.css');
const manifestFile = path.join(outDir, 'fonts.json');
const API = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,700;1,800&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const SUBSETS = new Set(['latin', 'latin-ext']);

// Fontes locais com proporções próximas, usadas enquanto (ou se) o woff2 não carregar.
const FALLBACK = `@font-face{font-family:'Barlow Condensed Fallback';src:local('Arial Narrow'),local('ArialNarrow'),local('Roboto Condensed'),local('RobotoCondensed-Regular'),local('Liberation Sans Narrow');font-display:swap}
@font-face{font-family:'DM Sans Fallback';src:local('Segoe UI'),local('Roboto'),local('Helvetica Neue'),local('Arial');size-adjust:98%;font-display:swap}
`;

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function download() {
  const res = await fetch(API, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Google Fonts respondeu ${res.status}`);
  const css = await res.text();
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g)];
  if (!blocks.length) throw new Error('CSS de fontes vazio');
  fs.mkdirSync(outDir, { recursive: true });
  const faces = [];
  const files = new Map();
  for (const [, subset, body] of blocks) {
    if (!SUBSETS.has(subset)) continue;
    const get = k => (body.match(new RegExp(k + ':\\s*([^;]+);')) || [])[1]?.trim();
    const family = get('font-family').replace(/['"]/g, '');
    const style = get('font-style');
    const weight = get('font-weight');
    const url = (body.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    const range = get('unicode-range');
    if (!url) continue;
    if (!files.has(url)) files.set(url, `${slug(family)}-${style}-${slug(weight)}-${subset}.woff2`);
    faces.push({ family, style, weight, range, file: files.get(url) });
  }
  for (const [url, name] of files) {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`Falha ao baixar ${name}: ${r.status}`);
    fs.writeFileSync(path.join(outDir, name), Buffer.from(await r.arrayBuffer()));
  }
  const out = faces.map(f => `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url('/fonts/${f.file}') format('woff2');unicode-range:${f.range}}`).join('\n');
  fs.writeFileSync(cssFile, `/* Gerado por scripts/fetch-fonts.cjs — não editar. */\n${FALLBACK}${out}\n`);
  // Arquivos principais (latin) para pré-carregamento.
  const preload = faces.filter(f => f.file.endsWith('-latin.woff2') && ((f.family === 'DM Sans' && f.style === 'normal') || (f.family === 'Barlow Condensed' && f.style === 'italic' && f.weight === '800'))).map(f => f.file);
  fs.writeFileSync(manifestFile, JSON.stringify({ generated: new Date().toISOString(), files: [...files.values()], preload: [...new Set(preload)] }, null, 2));
  return files.size;
}

function hasFonts() {
  try { return JSON.parse(fs.readFileSync(manifestFile, 'utf8')).files.every(f => fs.existsSync(path.join(outDir, f))); } catch { return false; }
}

module.exports = async function fetchFonts({ force = false } = {}) {
  if (!force && hasFonts()) return 'cache';
  try {
    const n = await download();
    console.log(`[fontes] ${n} arquivos woff2 salvos em public/fonts.`);
    return 'downloaded';
  } catch (e) {
    if (hasFonts()) { console.warn(`[fontes] Não foi possível atualizar (${e.message}); usando os arquivos existentes.`); return 'cache'; }
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(cssFile, `/* Gerado por scripts/fetch-fonts.cjs sem acesso ao Google Fonts — rode "npm run fonts" com internet. */\n${FALLBACK}`);
    console.warn(`[fontes] AVISO: fontes da marca não baixadas (${e.message}). O site usa fontes locais equivalentes até rodar "npm run fonts" com internet.`);
    return 'fallback';
  }
};

if (require.main === module) module.exports({ force: process.argv.includes('--force') });
