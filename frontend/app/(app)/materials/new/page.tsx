'use client';
import { MaterialForm } from '@/components/MaterialForm';
import { Breadcrumb, PageHeader } from '@/components/ui';

export default function NewMaterial() {
  return (
    <>
      <Breadcrumb items={[['Matières', '/materials'], ['Nouvelle matière']]} />
      <PageHeader title="Nouvelle matière" />
      <MaterialForm />
    </>
  );
}
