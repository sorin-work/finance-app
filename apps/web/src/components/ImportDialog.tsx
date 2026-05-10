import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { importTransactions, type DateFormat } from '../api/transactions';
import type { Account } from '../api/types';
import { invalidateFinancialData } from '../hooks/invalidate';
import { Field } from './Field';
import { Modal } from './Modal';

interface ImportDialogProps {
  accounts: Account[];
  onClose: () => void;
}

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'YMD', label: '2026-03-31 (ISO)' },
  { value: 'MDY', label: '03/31/2026 (month first)' },
  { value: 'DMY', label: '31/03/2026 (day first)' },
];

export function ImportDialog({ accounts, onClose }: ImportDialogProps) {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState(accounts.find((a) => !a.archived)?.id ?? '');
  const [dateFormat, setDateFormat] = useState<DateFormat>('YMD');
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a file');
      return importTransactions({ accountId, dateFormat, csv: await file.text() });
    },
    onSuccess: () => invalidateFinancialData(queryClient),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    upload.mutate();
  }

  const result = upload.data;

  return (
    <Modal title="Import transactions" onClose={onClose}>
      {result ? (
        <div className="import-result">
          <p>
            <strong>{result.imported}</strong> transaction{result.imported === 1 ? '' : 's'}{' '}
            imported.
          </p>
          {result.skipped.length > 0 && (
            <>
              <p className="muted">{result.skipped.length} rows were skipped:</p>
              <ul className="import-result__skipped">
                {result.skipped.slice(0, 20).map((s) => (
                  <li key={`${s.line}-${s.reason}`}>
                    Line {s.line}: {s.reason}
                  </li>
                ))}
                {result.skipped.length > 20 && <li>…and {result.skipped.length - 20} more</li>}
              </ul>
            </>
          )}
          <div className="form-actions">
            <button className="button button--primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="muted import-help">
            Upload a CSV exported from your bank. It needs a header row with a date column and
            either an amount column (negative for spending) or separate debit and credit columns.
          </p>
          {upload.error && (
            <div className="alert alert--error" role="alert">
              {upload.error instanceof ApiError || upload.error instanceof Error
                ? upload.error.message
                : 'Import failed'}
            </div>
          )}
          <Field label="CSV file">
            {(id) => (
              <input
                id={id}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            )}
          </Field>
          <div className="form-row">
            <Field label="Into account">
              {(id) => (
                <select id={id} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {accounts
                    .filter((a) => !a.archived)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              )}
            </Field>
            <Field label="Date format">
              {(id) => (
                <select
                  id={id}
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                >
                  {DATE_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="form-actions">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button button--primary" disabled={!file || upload.isPending}>
              {upload.isPending ? 'Importing…' : 'Import'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
