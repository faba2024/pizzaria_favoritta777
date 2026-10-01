# A Favorita Pizzaria

Cardápio e fluxo de compra reorganizados a partir das referências enviadas: categorias e busca, produtos em lista, sacola fixa, edição de itens, sugestões, checkout em quatro etapas, perfil local e consulta dos pedidos da sessão.

## Executar

Com Node.js instalado, execute `npm install` e `npm run dev`. Para verificar, use `npm run typecheck` e `npm run build`.

## Prévia e operação real

Sem configuração do Supabase, o site mostra uma prévia explicitamente identificada. O catálogo de demonstração reaproveita os produtos e preços da versão anterior: pizzas pequenas R$ 30 e grandes R$ 60. As fotos de pizza são ilustrativas. Confirme catálogo, preços, horários e áreas de entrega antes de operar.

O carrinho persiste no navegador. Os dados de perfil são salvos somente no aparelho. A Favorita oferece entrega gratuita nos bairros atendidos e bordas Cheddar e Catupiry sem acréscimo, conforme orientação do proprietário. A prévia aceita o cupom demonstrativo PIZZA10; ela não registra pedidos nem confirma pagamentos.

Para conectar a operação real, copie `.env.example` para `.env.local`, configure a URL e chave pública do Supabase, aplique a migration em `supabase/migrations`, cadastre o restaurante e catálogo e habilite autenticação anônima para clientes. Valide as permissões por função e os fluxos de pedido com o banco antes de colocar em produção. Nunca exponha a chave service role no navegador.

O projeto usa Next.js com rotas de servidor e está preparado para continuar a integração Supabase/Vercel. Não foi convertido em uma exportação estática. O painel administrativo herdado exige validação integrada com um banco configurado.

## Visual original restaurado

A página original preservada em `public/original` é usada tanto na prévia quanto na operação conectada ao Supabase. Ela carrega o catálogo em `/api/catalog`, usa o mesmo cálculo de preços do checkout e compartilha a sacola com `/checkout`. `npm run dev` e `npm run build` sincronizam o módulo de preços automaticamente. O catálogo da prévia vem de `lib/preview-catalog.ts`. Entrega e bordas têm valor zero nesse catálogo. Ao cadastrar a Favorita no Supabase, mantenha zero nas taxas dos bairros atendidos e nas bordas. Os demais adicionais e cupons continuam demonstrativos.

## Refinamento visual (out/2026)

A camada `public/original/refine.css` é carregada por último e concentra o acabamento da vitrine: cabeçalho fixo, hero com chamadas, busca com ícone, categorias fixas ao rolar, cards com selo sobre a foto e preço destacado, modal da pizza em formato "bottom sheet" no celular com o total no botão, sacola e rodapé reorganizados. Imagens pesadas foram otimizadas (`hero.webp`/`hero.jpg`, `logo.webp`, logo e Coca-Cola recomprimidos), e a página ganhou metatags de SEO/Open Graph, favicon e ícones do PWA.

## Produção: fontes, metadados e verificação

- **Fontes:** DM Sans e Barlow Condensed são auto-hospedadas em `public/fonts` (sem depender do Google em tempo de execução). `npm run dev` e `npm run build` baixam os arquivos automaticamente na primeira vez; para atualizar, rode `npm run fonts`. Sem internet, o site usa fontes locais equivalentes e o build não falha. Faça commit da pasta `public/fonts` depois do primeiro download.
- **Compartilhamento (og:image):** defina `NEXT_PUBLIC_APP_URL` (ex.: `https://seudominio.com.br`) no `.env.local` ou na Vercel para gerar `og:image`, `og:url` e `canonical` com URL absoluta. Na Vercel, `VERCEL_PROJECT_PRODUCTION_URL` é usado automaticamente quando a variável não existe.
- **Testes:** `npm test` (preços, checkout, WhatsApp, arquivos/caminhos, manifest e ícones) e `npm run test:e2e` (Playwright em 375, 390, 768, 1366 e 1920 px: busca, categorias, produto, sacola, checkout, menu inferior e layout).
- **Verificação completa no Windows:** `powershell -ExecutionPolicy Bypass -File scripts\verificar-producao.ps1` roda install, fontes, typecheck, testes, build e Playwright e salva `verificacao-producao.log`.
- Depois de adicionar `@playwright/test`, use `npm install` (não `npm ci`) uma vez para atualizar o `package-lock.json`.
