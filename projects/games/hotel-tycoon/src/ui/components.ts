import { t } from '../i18n';
import { ICONS, clearEl, h, svg } from './dom';

/** Bottom sheet with drag-to-close handle. One instance is reused for every panel. */
export class Sheet {
  readonly el: HTMLElement;
  private backdrop: HTMLElement;
  private title: HTMLElement;
  private body: HTMLElement;
  private isOpen = false;
  onClose?: () => void;

  constructor(parent: HTMLElement) {
    this.backdrop = h('div', { class: 'sheet-backdrop', style: 'display:none', onclick: () => this.close() });
    this.title = h('h2');
    this.body = h('div', { class: 'sheet-body' });
    const handle = h('div', { class: 'sheet-handle' });
    this.el = h('section', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', style: 'visibility:hidden' },
      handle,
      h('div', { class: 'sheet-head' }, this.title, h('button', { class: 'icon-btn', 'aria-label': t('dialog.close'), onclick: () => this.close() }, svg(ICONS.close))),
      this.body);
    parent.append(this.backdrop, this.el);
    this.enableDrag(handle);
  }

  open(title: string, content: Node | Node[]): void {
    this.title.textContent = title;
    clearEl(this.body);
    this.body.append(...(Array.isArray(content) ? content : [content]));
    this.body.scrollTop = 0;
    if (this.isOpen) return;
    this.isOpen = true;
    this.backdrop.style.display = 'block';
    this.el.style.visibility = 'visible';
    requestAnimationFrame(() => {
      this.backdrop.classList.add('open');
      this.el.classList.add('open');
    });
  }

  /** Replace content in place (keeps scroll position). */
  refresh(content: Node | Node[]): void {
    if (!this.isOpen) return;
    const top = this.body.scrollTop;
    clearEl(this.body);
    this.body.append(...(Array.isArray(content) ? content : [content]));
    this.body.scrollTop = top;
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.backdrop.classList.remove('open');
    this.el.classList.remove('open');
    this.el.style.transform = '';
    setTimeout(() => {
      if (this.isOpen) return;
      this.backdrop.style.display = 'none';
      this.el.style.visibility = 'hidden';
    }, 320);
    this.onClose?.();
  }

  get opened(): boolean {
    return this.isOpen;
  }

  private enableDrag(handle: HTMLElement): void {
    let startY = 0, dy = 0, dragging = false;
    handle.addEventListener('pointerdown', (e) => {
      dragging = true; startY = e.clientY; dy = 0;
      this.el.style.transition = 'none';
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - startY);
      this.el.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      this.el.style.transition = '';
      this.el.style.transform = '';
      if (dy > 90) this.close();
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
}

export class Toasts {
  private el: HTMLElement;
  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'toasts', 'aria-live': 'polite' });
    parent.append(this.el);
  }
  show(text: string, ms = 2200): void {
    const toast = h('div', { class: 'toast glass' }, text);
    this.el.append(toast);
    while (this.el.children.length > 3) this.el.firstChild?.remove();
    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 380);
    }, ms);
  }
}

export function confirmDialog(parent: HTMLElement, message: string, okLabel = t('dialog.ok'), danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (v: boolean) => {
      wrap.remove();
      resolve(v);
    };
    const wrap = h('div', { class: 'dialog-wrap', role: 'alertdialog', 'aria-modal': 'true' },
      h('div', { class: 'dialog glass' },
        h('p', null, message),
        h('div', { class: 'btn-grid' },
          h('button', { class: 'btn', onclick: () => done(false) }, t('dialog.cancel')),
          h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => done(true) }, okLabel))));
    parent.append(wrap);
  });
}
