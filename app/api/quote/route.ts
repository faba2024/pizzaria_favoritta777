import {handleOrder} from '@/lib/order-handler';
export const POST=(request:Request)=>handleOrder(request,'preview_order');
