import {getCatalog} from '@/services/catalog';
import {CheckoutForm} from '@/components/checkout';
import {previewCatalog} from '@/lib/preview-catalog';
export const dynamic='force-dynamic';
export default async function Checkout(){const preview=!process.env.NEXT_PUBLIC_SUPABASE_URL;return <CheckoutForm catalog={preview?previewCatalog:await getCatalog()} preview={preview}/>}
