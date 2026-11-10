import { he, type StringKey } from './he';

export type Locale = 'he';
type Dict = Record<StringKey, string>;

const locales: Record<Locale, { dict: Dict; dir: 'rtl' | 'ltr'; intl: string }> = {
  he: { dict: he, dir: 'rtl', intl: 'he-IL' },
};

let current: Locale = 'he';

export function setLocale(locale: Locale): void {
  current = locale;
  document.documentElement.lang = locale;
  document.documentElement.dir = locales[locale].dir;
}

export function t(key: StringKey, params?: Record<string, string | number>): string {
  let s: string = locales[current].dict[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function formatMoney(n: number): string {
  return `${Math.round(n).toLocaleString(locales[current].intl)} ${t('common.currency')}`;
}

/** Compact money for tight spaces (HUD): 1.25 מיליון ₪ */
export function formatMoneyShort(n: number): string {
  if (Math.abs(n) < 1_000_000) return formatMoney(n);
  const v = new Intl.NumberFormat(locales[current].intl, { maximumFractionDigits: 2 }).format(n / 1_000_000);
  return `${v} ${t('common.million')} ${t('common.currency')}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString(locales[current].intl);
}

export type { StringKey };
