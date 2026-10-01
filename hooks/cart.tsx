'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import type {CartItem} from '@/types';
import {cartItemSchema} from '@/validations/order';
interface CartState {items:CartItem[];setItems:(items:CartItem[])=>void;ready:boolean}
const Context=createContext<CartState|null>(null);
export function CartProvider({children}:{children:React.ReactNode}){const [items,setItems]=useState<CartItem[]>([]);const [ready,setReady]=useState(false);useEffect(()=>{try{const result=cartItemSchema.array().max(50).safeParse(JSON.parse(localStorage.getItem('favorita-cart-v1')||'[]'));if(result.success)setItems(result.data);}catch{}setReady(true);},[]);useEffect(()=>{if(ready){try{localStorage.setItem('favorita-cart-v1',JSON.stringify(items));}catch{}}},[items,ready]);return <Context.Provider value={{items,setItems,ready}}>{children}</Context.Provider>}
export function useCart(){const c=useContext(Context);if(!c)throw Error('Carrinho não inicializado.');return c;}
