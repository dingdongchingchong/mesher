import type { ReactNode } from 'react'
import clsx from 'clsx'

type ContainerProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: ContainerProps) {
  return (
    <div className={clsx('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  )
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}

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
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-500',
        variant === 'secondary' && 'bg-slate-100 text-slate-800 hover:bg-slate-200',
        variant === 'danger' && 'bg-rose-600 text-white hover:bg-rose-500',
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={clsx(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500',
        className
      )}
      {...rest}
    />
  )
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select
      className={clsx(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  )
}

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode
}

export function Label({ className, children, ...rest }: LabelProps) {
  return (
    <label className={clsx('block text-sm font-medium text-slate-700', className)} {...rest}>
      {children}
    </label>
  )
}

type FieldProps = {
  label: string
  children: ReactNode
}

export function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

type BadgeProps = {
  children: ReactNode
}

export function Badge({ children }: BadgeProps) {
  return (
    <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
      {children}
    </span>
  )
}

type EmptyProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyProps) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </Card>
  )
}

type ErrorProps = {
  children: ReactNode
}

export function ErrorText({ children }: ErrorProps) {
  return <p className="text-sm text-rose-600">{children}</p>
}
