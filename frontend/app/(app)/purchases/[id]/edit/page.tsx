'use client';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import { PurchaseForm } from '@/components/PurchaseForm';
import { Breadcrumb, ErrorText, Loading, PageHeader } from '@/components/ui';
import { purchaseRef } from '@/lib/format';
import { useApi } from '@/lib/hooks';

export default function EditPurchase() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<any>(`/purchase-orders/${id}`);
  const ref = purchaseRef(Number(id));
  return (
    <>
      <Breadcrumb items={[['Achats', '/purchases'], [ref, `/purchases/${id}`], ['Modifier']]} />
      <PageHeader title={`Modifier ${ref}`} />
      <ErrorText>{error}</ErrorText>
      {data ? (data.status === 'DRAFT' ? <Suspense><PurchaseForm order={data} /></Suspense> : <ErrorText>Seul un brouillon peut être modifié.</ErrorText>) : !error && <Loading />}
    </>
  );
}
