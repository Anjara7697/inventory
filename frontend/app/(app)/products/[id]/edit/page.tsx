'use client';
import { useParams } from 'next/navigation';
import { ProductForm } from '@/components/ProductForm';
import { ErrorText } from '@/components/ui';
import { useApi } from '@/lib/hooks';

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<any>(`/products/${id}`);
  return (
    <>
      <h1 className="text-xl font-semibold">Modifier le produit</h1>
      <ErrorText>{error}</ErrorText>
      {data && <ProductForm product={data} />}
    </>
  );
}
