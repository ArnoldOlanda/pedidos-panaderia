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
import { cn } from '@/lib/utils';

export interface RecordColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Applied to the data cell only. */
  className?: string;
  /** Applied to the header cell only, on top of the shell's muted header colour. */
  headerClassName?: string;
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
 *
 * Column styling is split on purpose: `className` styles the data cell and
 * `headerClassName` styles the header cell. A single shared className cannot
 * serve both, because the header row is uniformly muted while the data cells
 * are not — forwarding one class to both would repaint part of the header.
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
      {/* The Table primitive provides `overflow-x-auto` but no surface of its
          own, so this shell supplies the surface once for every CRUD screen.
          It mirrors the Card primitive's surface (`rounded-xl bg-card
          ring-1 ring-foreground/10`, no separate border) so the tables look
          like the cards do. `overflow-hidden` clips the primitive's inner
          scrolling container to the rounded corners. */}
      <div className="hidden md:block overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          {caption ? <TableCaption>{caption}</TableCaption> : null}
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  scope="col"
                  className={cn(
                    'text-muted-foreground',
                    column.headerClassName,
                  )}
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
