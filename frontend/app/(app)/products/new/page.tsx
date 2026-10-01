'use client';
import { ProductForm } from '@/components/ProductForm';
import { Breadcrumb, PageHeader } from '@/components/ui';

export default function NewProduct() {
  return (
    <>
      <Breadcrumb items={[['Produits', '/products'], ['Nouveau produit']]} />
      <PageHeader title="Nouveau produit" />
      <ProductForm />
    </>
  );
}
