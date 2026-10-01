import {requireStaff} from '@/lib/auth';
import {AdminShell} from '@/components/admin-shell';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){const {profile}=await requireStaff();return <AdminShell profile={profile}>{children}</AdminShell>}
