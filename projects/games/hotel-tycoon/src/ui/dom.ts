type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; style?: string; dataset?: Record<string, string> };

/** Tiny hyperscript helper for building DOM without a framework. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'html') el.innerHTML = String(v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export function svg(markup: string, cls = 'icon'): HTMLElement {
  const span = document.createElement('span');
  span.className = cls;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = markup;
  return span;
}

const S = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS = {
  hotel: S('<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-5h6v5"/><path d="M8 9h.01M12 9h.01M16 9h.01M8 12.5h.01M12 12.5h.01M16 12.5h.01"/><path d="M2 21h20"/>'),
  guests: S('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.7c3 0 5 1.9 5 5.3"/>'),
  staff: S('<circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/><path d="M12 14.5l-1.5 3 1.5 3.5 1.5-3.5z"/>'),
  manage: S('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  build: S('<path d="M14.5 5.5l4 4"/><path d="M3 21l8.5-8.5"/><path d="M12 6l3-3 6 6-3 3z"/><path d="M9 9l6 6"/>'),
  menu: S('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  pause: S('<path d="M8 5v14M16 5v14"/>'),
  play: S('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  ff2: S('<path d="M4 6l8 6-8 6zM12 6l8 6-8 6z" fill="currentColor"/>'),
  ff4: S('<path d="M2 7l6 5-6 5zM8 7l6 5-6 5zM14 7l6 5-6 5z" fill="currentColor"/>'),
  eye: S('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  target: S('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  minus: S('<path d="M5 12h14"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  save: S('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>'),
  backup: S('<path d="M12 8v5l3 2"/><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4"/>'),
  download: S('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  upload: S('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
  refresh: S('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>'),
  trash: S('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  bed: S('<path d="M3 18V7M21 18v-5a3 3 0 0 0-3-3h-8v8"/><path d="M3 14h18"/><circle cx="6.5" cy="11" r="1.6"/>'),
  lock: S('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
};

export function clearEl(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
