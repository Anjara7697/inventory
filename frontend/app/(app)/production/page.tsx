'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { IconFactory } from '@/components/icons';
import { ProductionDrawer } from '@/components/ProductionDrawer';
import { canWrite } from '@/components/Shell';
import { Badge, Button, Card, ErrorText, PageHeader, Pager, Select, Sku, Table, cx } from '@/components/ui';
import { getUser, num } from '@/lib/api';
import { dateTime, productionRef } from '@/lib/format';
import { useApi, usePaged } from '@/lib/hooks';
import { PRODUCTION_STATUS } from '@/lib/stock';

const Chevron = () => <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M9 6l6 6-6 6" /></svg>;

export default function ProductionHistory() {
  const router = useRouter();
  const user = getUser();
  const operator = canWrite(user, 'MANAGER', 'OPERATOR');
  const [status, setStatus] = useState('');
  const [productId, setProductId] = useState('');
  const list = usePaged('/production', { status: status || undefined, productId: productId || undefined });
  const products = useApi<any[]>('/products?limit=200');
  const [drawer, setDrawer] = useState<{ productId?: number } | null>(null);
  const close = useCallback(() => setDrawer(null), []);

  // /production?new=1[&productId=3] opens the panel (dashboard button).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('new') && operator) setDrawer({ productId: Number(p.get('productId')) || undefined });
  }, [operator]);

  const segment = (on: boolean) => cx('h-8 rounded-lg px-3 text-[13px] font-medium transition-colors', on ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink');

  return (
    <>
      <PageHeader
        title="Production"
        overline={`${list.total} production${list.total > 1 ? 's' : ''}`}
        actions={operator && <Button onClick={() => setDrawer({})}><IconFactory />Lancer une production</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72 max-w-full">
          <Select aria-label="Produit" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Tous les produits</option>
            {products.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div role="group" aria-label="Filtrer par statut" className="flex gap-1 rounded-[10px] bg-sunken p-[3px]">
          {[['', 'Toutes'], ['COMPLETED', 'Terminées'], ['CANCELLED', 'Annulées']].map(([v, l]) => (
            <button key={v} aria-pressed={status === v} className={segment(status === v)} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
      </div>

      <ErrorText>{list.error}</ErrorText>
      <Card flush>
        <Table head={['Référence', 'Date', 'Produit', '>Quantité', 'Statut', 'Par', '']}>
          {list.items.map((p: any) => {
            const [label, tone] = PRODUCTION_STATUS[p.status] ?? [p.status, 'gray'];
            return (
              <tr key={p.id} className={cx('cursor-pointer', p.status === 'CANCELLED' && 'opacity-60')} onClick={() => router.push(`/production/${p.id}`)}>
                <td><Link href={`/production/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12.5px] font-medium hover:text-accent">{productionRef(p.id)}</Link></td>
                <td className="whitespace-nowrap text-ink-muted">{dateTime(p.createdAt)}</td>
                <td><span className="font-medium">{p.product.name}</span><div><Sku>{p.product.sku}</Sku></div></td>
                <td className="text-right font-medium tabular-nums">{num(p.quantity)} pcs</td>
                <td><Badge tone={tone}>{label}</Badge></td>
                <td>{p.user.firstName}</td>
                <td className="w-6 text-right text-ink-muted"><Chevron /></td>
              </tr>
            );
          })}
        </Table>
        {list.total === 0 && !list.loading && <p className="px-4 pt-3 text-sm text-ink-muted">Aucune production. Lancez-en une avec le bouton ci-dessus ou depuis la fiche d'un produit.</p>}
        <div className="px-4 pb-1"><Pager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} /></div>
      </Card>

      <ProductionDrawer open={!!drawer} productId={drawer?.productId} products={(products.data ?? []).filter((p) => p.active)}
        canOrder={canWrite(user, 'MANAGER')} onClose={close} />
    </>
  );
}
