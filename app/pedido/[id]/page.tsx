import {Tracking} from '@/components/tracking';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Tracking id={id}/>}
