import 'server-only';
import {redirect} from 'next/navigation';
import {serverDb} from '@/lib/supabase/server';
import type {Role} from '@/types';
export async function requireStaff(roles:Role[]=['admin','attendant','kitchen','courier']){if(!process.env.NEXT_PUBLIC_SUPABASE_URL)redirect('/login');const db=await serverDb();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');const {data:profile}=await db.from('profiles').select('*').eq('id',user.id).single();if(!profile||!roles.includes(profile.role))redirect('/login');return {db,profile:profile as {id:string;restaurant_id:string;role:Role;name:string}};}
