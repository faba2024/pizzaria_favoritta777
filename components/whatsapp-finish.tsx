'use client';
import {useEffect,useRef} from 'react';
import './checkout-animation.css';
export function WhatsappFinish({name,url,onClose}:{name:string;url:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';const timer=setTimeout(()=>window.location.assign(url),1800);return()=>{clearTimeout(timer);document.body.style.overflow=previous;};},[url]);
 return <dialog ref={dialog} className="thankYou" aria-labelledby="thanksTitle" onCancel={onClose}><div className="thankConfetti" aria-hidden="true">{Array.from({length:8},(_,i)=><i key={i}/>)}</div><div className="thankCard"><div className="thankCheck" aria-hidden="true">✓</div><img src="/logo.png" alt="A Favorita Pizzaria"/><span className="thankKicker">TUDO PRONTO PARA ENVIAR</span><h2 id="thanksTitle">Obrigado, {name.trim().split(/\s+/)[0]}!</h2><p>Estamos abrindo o WhatsApp com seu pedido. Toque em enviar na conversa e aguarde a confirmação da pizzaria.</p><a className="welcomeButton whatsappButton" href={url}>Abrir WhatsApp agora →</a><button className="secondaryWelcome" onClick={onClose}>Voltar ao pedido</button></div></dialog>;
}
