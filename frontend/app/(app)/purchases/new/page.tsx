'use client';
import { Suspense } from 'react';
import { PurchaseForm } from '@/components/PurchaseForm';
import { Breadcrumb, PageHeader } from '@/components/ui';

export default function NewPurchase() {
  return (
    <>
      <Breadcrumb items={[['Achats', '/purchases'], ['Nouvelle commande']]} />
      <PageHeader title="Nouvelle commande" />
      <Suspense><PurchaseForm /></Suspense>
    </>
  );
}
