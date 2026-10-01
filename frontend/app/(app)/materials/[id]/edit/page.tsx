'use client';
import { useParams } from 'next/navigation';
import { MaterialForm } from '@/components/MaterialForm';
import { Breadcrumb, ErrorText, Loading, PageHeader } from '@/components/ui';
import { useApi } from '@/lib/hooks';

export default function EditMaterial() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<any>(`/materials/${id}`);
  return (
    <>
      <Breadcrumb items={[['Matières', '/materials'], [data?.name ?? '…', `/materials/${id}`], ['Modifier']]} />
      <PageHeader title="Modifier la matière" />
      <ErrorText>{error}</ErrorText>
      {data ? <MaterialForm material={data} /> : !error && <Loading />}
    </>
  );
}
