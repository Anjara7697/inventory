'use client';
import { ReactNode } from 'react';
import { IconPencil, IconTrash } from './icons';
import { Button } from './ui';

/** Edit / delete icon buttons at the end of a table row. */
export function RowActions({ name, onEdit, onDelete }: { name: string; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <span className="flex justify-end gap-0.5 whitespace-nowrap">
      {onEdit && <Button variant="ghost" size="icon-sm" aria-label={`Modifier ${name}`} title="Modifier" onClick={onEdit}><IconPencil size={16} /></Button>}
      {onDelete && <Button variant="ghost-danger" size="icon-sm" aria-label={`Supprimer ${name}`} title="Supprimer" onClick={onDelete}><IconTrash size={16} /></Button>}
    </span>
  );
}

/** Row-level confirmation shown in place of the row's content (no browser dialog). */
export function ConfirmRow({ colSpan, children, confirmLabel = 'Supprimer', onCancel, onConfirm }: {
  colSpan: number; children: ReactNode; confirmLabel?: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="bg-danger-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 text-danger">
          <span>{children}</span>
          <span className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
            <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
          </span>
        </div>
      </td>
    </tr>
  );
}
