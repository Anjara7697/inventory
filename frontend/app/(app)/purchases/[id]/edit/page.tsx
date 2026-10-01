'use client';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import { PurchaseForm } from '@/components/PurchaseForm';
import { ErrorText } from '@/components/ui';
import { useApi } from '@/lib/hooks';

export default function EditPurchase() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<any>(`/purchase-orders/${id}`);
  return (
    <>
      <h1 className="text-xl font-semibold">Modifier la commande</h1>
      <ErrorText>{error}</ErrorText>
      {data && (data.status === 'DRAFT' ? <Suspense><PurchaseForm order={data} /></Suspense> : <ErrorText>Seul un brouillon peut être modifié.</ErrorText>)}
    </>
  );
}
