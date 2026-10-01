'use client';
import { useParams } from 'next/navigation';
import { MaterialForm } from '@/components/MaterialForm';
import { ErrorText } from '@/components/ui';
import { useApi } from '@/lib/hooks';

export default function EditMaterial() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<any>(`/materials/${id}`);
  return (
    <>
      <h1 className="text-xl font-semibold">Modifier la matière</h1>
      <ErrorText>{error}</ErrorText>
      {data && <MaterialForm material={data} />}
    </>
  );
}
