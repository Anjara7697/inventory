'use client';
import { useParams } from 'next/navigation';
import { ProductForm } from '@/components/ProductForm';
import { Breadcrumb, ErrorText, Loading, PageHeader } from '@/components/ui';
import { useApi } from '@/lib/hooks';

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<any>(`/products/${id}`);
  return (
    <>
      <Breadcrumb items={[['Produits', '/products'], [data?.name ?? '…', `/products/${id}`], ['Modifier']]} />
      <PageHeader title="Modifier le produit" />
      <ErrorText>{error}</ErrorText>
      {data ? <ProductForm product={data} /> : !error && <Loading />}
    </>
  );
}
