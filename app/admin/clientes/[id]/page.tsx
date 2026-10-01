import Link from 'next/link';
import {requireStaff} from '@/lib/auth';
import {notFound} from 'next/navigation';
import {money} from '@/utils/pricing';
import {statusLabels,type Status} from '@/types';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const {db,profile}=await requireStaff(['admin','attendant']);const [c,o]=await Promise.all([db.from('customers').select('*').eq('id',id).eq('restaurant_id',profile.restaurant_id).single(),db.from('orders').select('*').eq('customer_id',id).eq('restaurant_id',profile.restaurant_id).order('created_at',{ascending:false})]);if(c.error)notFound();if(o.error)throw Error('Falha ao carregar histórico.');return <><Link href="/admin/clientes">← Clientes</Link><h1>{c.data.name}</h1><p>{c.data.phone}</p><h2>Histórico de pedidos</h2>{o.data.map(order=><Link className="panel history-order" href={'/admin/pedidos/'+order.id} key={order.id}><b>#{order.number}</b><span>{new Date(order.created_at).toLocaleString('pt-BR')}</span><span>{statusLabels[order.status as Status]}</span><strong>{money(order.total)}</strong></Link>)}</>}
