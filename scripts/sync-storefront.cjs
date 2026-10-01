const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const fetchFonts = require('./fetch-fonts.cjs');

const root = path.resolve(__dirname, '..');
const indexFile = path.join(root, 'public/original/index.html');

// 1. Usa o mesmo cálculo de preços na vitrine original e no checkout React.
const source = fs.readFileSync(path.join(root, 'utils/pricing.ts'), 'utf8');
fs.writeFileSync(path.join(root, 'public/original/pricing.js'), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText);

// Endereço público do site para links absolutos (Open Graph exige URL completa).
function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  try { const u = new URL(raw); return u.origin; } catch { return ''; }
}

function replaceBlock(html, name, content) {
  const re = new RegExp(`<!--${name}-->[\\s\\S]*?<!--/${name}-->`);
  if (!re.test(html)) throw new Error(`Marcador <!--${name}--> não encontrado em public/original/index.html`);
  return html.replace(re, `<!--${name}-->${content}<!--/${name}-->`);
}

module.exports = async function sync() {
  await fetchFonts();
  let preload = [];
  try { preload = JSON.parse(fs.readFileSync(path.join(root, 'public/fonts/fonts.json'), 'utf8')).preload || []; } catch {}
  let html = fs.readFileSync(indexFile, 'utf8');
  // 2. Fontes auto-hospedadas (sem dependência do Google em tempo de execução).
  html = replaceBlock(html, 'fonts', '\n' + preload.map(f => `<link rel="preload" href="/fonts/${f}" as="font" type="font/woff2" crossorigin>`).concat('<link rel="stylesheet" href="/fonts/fonts.css">').join('\n') + '\n');
  // 3. Metadados de compartilhamento com URL absoluta quando o domínio é conhecido.
  const site = siteUrl();
  html = replaceBlock(html, 'social', '\n' + [
    site ? `<link rel="canonical" href="${site}/">` : '',
    site ? `<meta property="og:url" content="${site}/">` : '',
    `<meta property="og:image" content="${site}/og-image.jpg">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Pizza da A Favorita Pizzaria">',
    `<meta name="twitter:image" content="${site}/og-image.jpg">`,
  ].filter(Boolean).join('\n') + '\n');
  fs.writeFileSync(indexFile, html);
  if (!site) console.warn('[vitrine] Defina NEXT_PUBLIC_APP_URL (ex.: https://afavorita.com.br) para gerar og:image com URL absoluta.');
};

if (require.main === module) module.exports().catch(e => { console.error(e); process.exit(1); });
