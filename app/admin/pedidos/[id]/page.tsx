import {requireStaff} from '@/lib/auth';
import {notFound} from 'next/navigation';
import {OrderSummary} from '@/components/order-summary';
import {OrderActions} from '@/components/orders';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const {db,profile}=await requireStaff();const {data,error}=await db.from('orders').select('*,order_items(*)').eq('id',id).eq('restaurant_id',profile.restaurant_id).single();if(error||!data)notFound();return <><OrderSummary order={data}/><OrderActions order={data} role={profile.role}/></>}
