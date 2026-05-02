import type { ReactNode } from 'react';

export type ResourceRow = Record<string, unknown>;

export type ResourceColumn<Row extends ResourceRow> = {
  key: keyof Row | string;
  label: string;
  render?: (row: Row) => ReactNode;
  format?: (value: unknown, row: Row) => ReactNode;
};

type ResourceTableProps<Row extends ResourceRow> = {
  title: string;
  rows: Row[];
  columns: ResourceColumn<Row>[];
  loading?: boolean;
  error?: string | null;
  getRowKey?: (row: Row, index: number) => string | number;
};

function formatCell(value: unknown) {
  if (value == null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function fallbackRowKey(row: ResourceRow, index: number) {
  return String(row.id ?? row.user_id ?? row.member_id ?? row.trainer_id ?? row.plan_id ?? row.session_id ?? row.booking_id ?? row.attendance_id ?? row.payment_id ?? row.subscription_id ?? index);
}

export default function ResourceTable<Row extends ResourceRow>({ title, rows, columns, loading = false, error = null, getRowKey }: ResourceTableProps<Row>) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Resource</p>
          <h2>{title}</h2>
        </div>
        <span className="pill">{loading ? 'Loading' : `${rows.length} rows`}</span>
      </div>

      {error ? <p className="error" role="alert">{error}</p> : null}
      {loading ? <p className="muted">Loading {title.toLowerCase()}...</p> : null}
      {!loading && !error && rows.length === 0 ? <p className="empty-state">No {title.toLowerCase()} found.</p> : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={getRowKey ? getRowKey(row, index) : fallbackRowKey(row, index)}>
                  {columns.map((column) => (
                    <td key={String(column.key)}>
                      {column.render
                        ? column.render(row)
                        : column.format
                          ? column.format(row[column.key], row)
                          : formatCell(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
