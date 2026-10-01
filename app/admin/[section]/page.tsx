import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStaff} from '@/lib/auth';
import {resources,type Resource} from '@/validations/admin';
import {Crud} from '@/components/crud';
import {Orders} from '@/components/orders';
import {SettingsForm} from '@/components/settings';
import {money} from '@/utils/pricing';
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;const {db,profile}=await requireStaff(section==='pedidos'?undefined:section==='clientes'?['admin','attendant']:['admin']);
 if(section==='pedidos'){const {data,error}=await db.from('orders').select('*,order_items(*)').eq('restaurant_id',profile.restaurant_id).order('created_at',{ascending:false}).limit(200);if(error)throw Error('Falha ao carregar pedidos.');return <Orders initial={data} restaurantId={profile.restaurant_id} role={profile.role}/>;}
 if(section==='clientes'){const {data,error}=await db.rpc('customer_stats',{rid:profile.restaurant_id});if(error)throw Error('Falha ao carregar clientes.');return <><h1>Clientes</h1><div className="table-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>Pedidos</th><th>Total gasto</th><th>Último pedido</th></tr></thead><tbody>{(data as {id:string;name:string;phone:string;order_count:number;spent:number;last_order:string|null}[]).map(c=><tr key={c.id}><td><Link href={'/admin/clientes/'+c.id}>{c.name}</Link></td><td>{c.phone}</td><td>{c.order_count}</td><td>{money(c.spent)}</td><td>{c.last_order?new Date(c.last_order).toLocaleDateString('pt-BR'):'—'}</td></tr>)}</tbody></table>{!data?.length&&<div className="empty">Os clientes aparecerão após o primeiro pedido.</div>}</div></>;}
 if(section==='configuracoes'){const [r,s]=await Promise.all([db.from('restaurants').select('*').eq('id',profile.restaurant_id).single(),db.from('restaurant_settings').select('*').eq('restaurant_id',profile.restaurant_id).single()]);if(r.error||s.error)throw Error('Falha ao carregar configurações.');return <SettingsForm restaurant={r.data} settings={s.data}/>;}
 if(!Object.hasOwn(resources,section))notFound();const resource=section as Resource;const [rows,cats,products]=await Promise.all([db.from(resources[resource].table).select('*').eq('restaurant_id',profile.restaurant_id),db.from('categories').select('id,name').eq('restaurant_id',profile.restaurant_id),db.from('products').select('id,name').eq('restaurant_id',profile.restaurant_id)]);if(rows.error||cats.error||products.error)throw Error('Falha ao carregar registros.');return <Crud resource={resource} initial={rows.data} restaurantId={profile.restaurant_id} choices={{categories:cats.data,products:products.data}}/>;
}
