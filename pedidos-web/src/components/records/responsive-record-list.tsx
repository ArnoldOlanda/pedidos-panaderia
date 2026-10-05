import type * as React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface RecordColumn<T> {
  key: string;
  header: React.ReactNode;
  className?: string;
  render: (record: T) => React.ReactNode;
}

export interface ResponsiveRecordListProps<T> {
  records: T[];
  columns: RecordColumn<T>[];
  getRowKey: (record: T) => string;
  caption?: string;
  renderCard: (record: T) => React.ReactNode;
}

/**
 * Single switch between a desktop table (`md` and up) and a mobile card list
 * (below `md`), used by the vendor CRUD screens.
 *
 * Both branches rely on `display: none` (`hidden` / `md:hidden`), so the
 * inactive branch leaves the accessibility tree entirely and is never
 * announced. That is intentional: do not collapse this into one branch that
 * renders both.
 *
 * Empty-state contract: this component never special-cases an empty `records`
 * array and exposes no `emptyState` prop. The owning screen renders its own
 * empty state before mounting this list.
 */
export function ResponsiveRecordList<T>({
  records,
  columns,
  getRowKey,
  caption,
  renderCard,
}: ResponsiveRecordListProps<T>) {
  return (
    <>
      {/* Table's own container already provides `overflow-x-auto`. */}
      <div className="hidden md:block">
        <Table>
          {caption ? <TableCaption>{caption}</TableCaption> : null}
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  scope="col"
                  className={column.className}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={getRowKey(record)}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(record)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {records.map((record) => (
          <li key={getRowKey(record)}>{renderCard(record)}</li>
        ))}
      </ul>
    </>
  );
}
