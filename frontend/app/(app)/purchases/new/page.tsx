'use client';
import { Suspense } from 'react';
import { PurchaseForm } from '@/components/PurchaseForm';

export default function NewPurchase() {
  return (<><h1 className="text-xl font-semibold">Nouvelle commande</h1><Suspense><PurchaseForm /></Suspense></>);
}
