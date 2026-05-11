'use client';

import { type ReactNode, type ButtonHTMLAttributes } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-navy-soft/30 border border-gold/20 p-6 sm:p-8 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`bg-gold text-navy-deep font-bold px-8 py-3 rounded-full hover:bg-gold-light transition disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`border border-gold/40 text-gold px-6 py-2 rounded-full hover:bg-gold/10 transition text-sm disabled:opacity-30 ${className}`}
    >
      {children}
    </button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="block text-sm text-offwhite-dim mb-2 tracking-wide">
      {children}
    </label>
  );
}

export function TextInput({
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite placeholder:text-offwhite-dim/50 focus:border-gold ${className}`}
    />
  );
}

export function TextArea({
  className = '',
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={`w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite placeholder:text-offwhite-dim/50 focus:border-gold leading-loose tracking-wide text-base ${className}`}
    />
  );
}

export function StepHeader({
  step,
  title,
  subtitle,
}: {
  step: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-3 mb-6">
      <p className="text-xs text-gold tracking-[0.3em] uppercase">{step}</p>
      <h2 className="text-2xl sm:text-3xl font-bold leading-snug">{title}</h2>
      {subtitle && (
        <p className="text-sm text-offwhite-dim leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
