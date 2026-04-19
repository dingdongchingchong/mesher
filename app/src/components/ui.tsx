import clsx from 'clsx';
import type { ReactNode } from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  className,
  loading,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-500',
        variant === 'secondary' && 'bg-slate-100 text-slate-800 hover:bg-slate-200',
        variant === 'danger' && 'bg-rose-600 text-white hover:bg-rose-500',
        variant === 'ghost' && 'bg-transparent text-slate-700 hover:bg-slate-100',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}

type CardProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
};

export function Card({ title, subtitle, className, children }: CardProps) {
  return (
    <section className={clsx('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      <div className={clsx((title || subtitle) && 'mt-4')}>{children}</div>
    </section>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={clsx(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500',
        className,
      )}
      {...rest}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select
      className={clsx(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
};

export function Label({ className, children, ...rest }: LabelProps) {
  return (
    <label className={clsx('block text-sm font-medium text-slate-700', className)} {...rest}>
      {children}
    </label>
  );
}

type FieldProps = {
  label: string;
  htmlFor?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

type BadgeProps = {
  children: ReactNode;
};

export function Badge({ children }: BadgeProps) {
  return (
    <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
      {children}
    </span>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </Card>
  );
}

type ErrorTextProps = {
  children: ReactNode;
};

export function ErrorText({ children }: ErrorTextProps) {
  return <p className="text-sm text-rose-600">{children}</p>;
}

type NoticeProps = {
  children: ReactNode;
  className?: string;
};

export function Notice({ children, className }: NoticeProps) {
  return (
    <p className={clsx('rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700', className)}>
      {children}
    </p>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative';
};

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={clsx(
          'mt-2 text-2xl font-semibold',
          tone === 'default' && 'text-slate-900',
          tone === 'positive' && 'text-emerald-700',
          tone === 'negative' && 'text-rose-700',
        )}
      >
        {value}
      </p>
    </div>
  );
}

type TableColumn<Row extends Record<string, unknown>> = {
  key: keyof Row | string;
  header: string;
  className?: string;
  render?: (value: unknown, row: Row) => ReactNode;
};

type TableProps<Row extends Record<string, unknown>> = {
  columns: Array<TableColumn<Row>>;
  rows: Row[];
  emptyMessage?: string;
};

export function Table<Row extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = 'No rows',
}: TableProps<Row>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={clsx('px-3 py-2 font-semibold text-slate-700', column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-slate-500" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-slate-200">
                {columns.map((column) => {
                  const value = (row as Record<string, unknown>)[String(column.key)];
                  return (
                    <td key={String(column.key)} className={clsx('px-3 py-2', column.className)}>
                      {column.render ? column.render(value, row) : (value as ReactNode)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />;
}

type PageCardProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
};

export function PageCard({ title, subtitle, className, children }: PageCardProps) {
  return (
    <Card title={title} subtitle={subtitle} className={className}>
      {children}
    </Card>
  );
}
