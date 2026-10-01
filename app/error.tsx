'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="auth"><h1>Algo deu errado</h1><p>Não foi possível carregar esta página.</p><button onClick={reset}>Tentar novamente</button></main>}
