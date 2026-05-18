import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0].toUpperCase())
    .join('') || 'U';
}

export function formatDate(s) {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z'));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatNumber(n, opts = {}) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString(undefined, opts);
}

export function uomLabel(t) {
  return {
    numeric_min: 'Numeric (Higher is better)',
    numeric_max: 'Numeric (Lower is better)',
    timeline: 'Timeline (days)',
    zero: 'Zero-based (zero = success)'
  }[t] || t;
}

export function scoreColor(score) {
  if (score === null || score === undefined) return 'bg-slate-200';
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-red-500';
}

export function scoreTextColor(score) {
  if (score === null || score === undefined) return 'text-slate-500';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}
