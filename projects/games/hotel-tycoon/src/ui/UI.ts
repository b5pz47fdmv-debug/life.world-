import type { Game } from '../core/Game';
import { formatTime, goldenFactor, nightFactor, weekday } from '../core/GameClock';
import { AREA_TYPES } from '../data/catalog';
import { formatMoney, formatMoneyShort, t, type StringKey } from '../i18n';
import type { Pick, WorldRenderer } from '../render/WorldRenderer';
import type { Area, Speed } from '../state/types';
import { Sheet, Toasts, confirmDialog } from './components';
import { ICONS, h, svg } from './dom';
import { buildPanel, guestsPanel, hotelPanel, managePanel, menuPanel, roomTitle, starsEl, statusChip, staffPanel, type MenuActions } from './panels';

type Tab = 'hotel' | 'guests' | 'staff' | 'manage' | 'build';
const TABS: { id: Tab; icon: string; label: StringKey }[] = [
  { id: 'hotel', icon: ICONS.hotel, label: 'tab.hotel' },
  { id: 'guests', icon: ICONS.guests, label: 'tab.guests' },
  { id: 'staff', icon: ICONS.staff, label: 'tab.staff' },
  { id: 'manage', icon: ICONS.manage, label: 'tab.manage' },
  { id: 'build', icon: ICONS.build, label: 'tab.build' },
];

export class UI {
  private root: HTMLElement;
  private sky: HTMLElement;
  private sheet: Sheet;
  private toasts: Toasts;
  private tabs = new Map<Tab, HTMLElement>();
  private activePanel: Tab | 'menu' | null = null;
  private speedBtns = new Map<Speed, HTMLElement>();
  private hud = {
    name: h('div', { class: 'name' }),
    money: h('div', { class: 'val' }),
    stars: h('div', { class: 'val' }),
    occ: h('div', { class: 'val' }),
    time: h('span', { class: 'time' }),
    date: h('span', { class: 'date' }),
  };
  private viewBtnLabel = h('span');
  private roomCard: HTMLElement;
  private roomCardBody = h('div');
  private selected: Area | null = null;
  private lastSkyKey = '';

  constructor(private game: Game, private world: WorldRenderer, private version: string) {
    this.root = document.getElementById('ui')!;
    this.sky = document.getElementById('sky')!;
    this.buildHud();
    this.buildFabs();
    this.roomCard = h('div', { class: 'room-card glass', role: 'region', 'aria-live': 'polite' }, this.roomCardBody);
    this.root.append(this.roomCard);
    this.buildTabbar();
    this.sheet = new Sheet(this.root);
    this.sheet.onClose = () => {
      this.activePanel = null;
      this.setTab(null);
    };
    this.toasts = new Toasts(this.root);
    this.wire();
    this.refreshHud();
  }

  // --- Construction --------------------------------------------------------

  private buildHud(): void {
    const stat = (cls: string, label: string, val: HTMLElement) => h('div', { class: `stat ${cls}` }, h('div', { class: 'lbl' }, label), val);
    const speeds: { s: Speed; icon: string; label: StringKey }[] = [
      { s: 0, icon: ICONS.pause, label: 'speed.pause' },
      { s: 1, icon: ICONS.play, label: 'speed.x1' },
      { s: 2, icon: ICONS.ff2, label: 'speed.x2' },
      { s: 4, icon: ICONS.ff4, label: 'speed.x4' },
    ];
    const speedEl = h('div', { class: 'speed', role: 'group' });
    for (const sp of speeds) {
      const b = h('button', { 'aria-label': t(sp.label), title: t(sp.label), onclick: () => this.game.setSpeed(sp.s) }, svg(sp.icon));
      this.speedBtns.set(sp.s, b);
      speedEl.append(b);
    }
    this.root.append(h('header', { class: 'hud glass' },
      h('div', { class: 'hud-row' },
        h('div', { class: 'brand' }, h('div', { class: 'logo' }, t('app.title')), this.hud.name),
        stat('money', t('hud.money'), this.hud.money),
        stat('', t('hud.rating'), this.hud.stars),
        stat('', t('hud.occupancy'), this.hud.occ)),
      h('div', { class: 'hud-row' }, h('div', { class: 'clock' }, this.hud.time, this.hud.date), speedEl)));
  }

  private buildFabs(): void {
    const viewBtn = h('button', { class: 'fab labeled glass', 'aria-label': 'view', onclick: () => this.toggleView() }, svg(ICONS.eye), this.viewBtnLabel);
    this.root.append(
      h('div', { class: 'fab-col' },
        viewBtn,
        h('button', { class: 'fab glass', 'aria-label': t('view.recenter'), title: t('view.recenter'), onclick: () => this.world.recenter() }, svg(ICONS.target)),
        h('button', { class: 'fab glass', 'aria-label': 'zoom in', onclick: () => this.world.camera.zoomBy(1.25) }, svg(ICONS.plus)),
        h('button', { class: 'fab glass', 'aria-label': 'zoom out', onclick: () => this.world.camera.zoomBy(0.8) }, svg(ICONS.minus))),
      h('button', { class: 'fab fab-menu glass', 'aria-label': t('menu.title'), onclick: () => this.openMenu() }, svg(ICONS.menu)));
  }

  private buildTabbar(): void {
    const bar = h('nav', { class: 'tabbar glass' });
    for (const tab of TABS) {
      const b = h('button', { class: 'tab', 'aria-label': t(tab.label), onclick: () => this.openTab(tab.id) }, svg(tab.icon), h('span', null, t(tab.label)));
      this.tabs.set(tab.id, b);
      bar.append(b);
    }
    this.root.append(bar);
    this.setTab(null);
  }

  private wire(): void {
    const g = this.game;
    g.bus.on('changed', ({ reason }) => {
      this.refreshHud();
      if (reason !== 'pricing') this.refreshPanel();
      if (reason === 'pricing' && this.selected) this.renderRoomCard();
    });
    g.bus.on('day', ({ day }) => {
      this.toasts.show(t('toast.newDay', { day }));
      this.refreshPanel();
    });
    g.bus.on('saveError', () => this.toasts.show(t('toast.saveError'), 3500));
    g.bus.on('replaced', () => {
      this.hideRoomCard();
      this.refreshHud();
      this.refreshPanel();
    });
    this.world.camera.onTap = (x, y) => this.onWorldTap(this.world.pick(x, y));
  }

  // --- Tabs & panels -------------------------------------------------------

  private setTab(tab: Tab | null): void {
    for (const [id, el] of this.tabs) el.classList.toggle('on', id === (tab ?? 'hotel'));
  }

  openTab(tab: Tab): void {
    if (this.activePanel === tab && this.sheet.opened) {
      this.sheet.close();
      return;
    }
    this.activePanel = tab;
    this.setTab(tab);
    this.sheet.open(this.panelTitle(tab), this.panelContent(tab));
  }

  private panelTitle(tab: Tab | 'menu'): string {
    return t(({ hotel: 'hotel.title', guests: 'guests.title', staff: 'staff.title', manage: 'manage.title', build: 'build.title', menu: 'menu.title' } as const)[tab]);
  }

  private panelContent(tab: Tab | 'menu'): Node[] {
    switch (tab) {
      case 'hotel': return hotelPanel(this.game, (a) => this.focusArea(a));
      case 'guests': return guestsPanel();
      case 'staff': return staffPanel();
      case 'manage': return managePanel(this.game);
      case 'build': return buildPanel(this.game);
      case 'menu': return menuPanel(this.game, this.menuActions(), this.version);
    }
  }

  private refreshPanel(): void {
    if (this.activePanel && this.sheet.opened) this.sheet.refresh(this.panelContent(this.activePanel));
  }

  openMenu(): void {
    this.activePanel = 'menu';
    this.setTab(null);
    this.sheet.open(t('menu.title'), this.panelContent('menu'));
  }

  private menuActions(): MenuActions {
    const g = this.game;
    return {
      save: () => {
        if (g.save()) this.toasts.show(t('menu.saved'));
        this.refreshPanel();
      },
      backup: () => {
        try {
          g.createManualBackup();
          this.toasts.show(t('menu.backupCreated'));
        } catch {
          this.toasts.show(t('toast.saveError'), 3500);
        }
        this.refreshPanel();
      },
      restore: async (b) => {
        if (!(await confirmDialog(this.root, t('menu.restoreConfirm'), t('menu.restore')))) return;
        if (g.restoreBackup(b.id)) this.toasts.show(t('menu.restored'));
        this.refreshPanel();
      },
      remove: async (b) => {
        if (!(await confirmDialog(this.root, t('menu.deleteConfirm'), t('menu.delete'), true))) return;
        g.saves.deleteBackup(b.id);
        this.toasts.show(t('menu.deleted'));
        this.refreshPanel();
      },
      exportFile: () => this.exportFile(),
      importFile: () => this.importFile(),
      newGame: async () => {
        if (!(await confirmDialog(this.root, t('menu.newGameConfirm'), t('menu.newGame'), true))) return;
        g.newGame();
        this.sheet.close();
        this.world.recenter(false);
      },
    };
  }

  private async exportFile(): Promise<void> {
    const g = this.game;
    g.save();
    const day = g.state.clock.day;
    const name = `hotel-tycoon-day${day}-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([g.saves.exportString(g.state)], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    // iPhone: the share sheet lets the player save to Files / iCloud Drive.
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'HOTEL TYCOON' });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  private importFile(): void {
    const input = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      input.remove();
      if (!f) return;
      try {
        const st = this.game.saves.importString(await f.text());
        this.game.importState(st);
        this.toasts.show(t('menu.imported'));
        this.world.recenter(false);
      } catch {
        this.toasts.show(t('menu.importFailed'), 3500);
      }
      this.refreshPanel();
    });
    document.body.append(input);
    input.click();
  }

  // --- World interaction ---------------------------------------------------

  private onWorldTap(p: Pick): void {
    if (p?.kind === 'area') {
      this.selectArea(p.area);
    } else if (p?.kind === 'building') {
      this.toggleView();
    } else {
      this.hideRoomCard();
    }
  }

  private focusArea(a: Area): void {
    this.sheet.close();
    if (this.game.state.settings.view === 'exterior') this.toggleView();
    this.world.focusArea(a);
    this.selectArea(a);
  }

  private selectArea(a: Area): void {
    this.selected = a;
    this.world.select(a);
    this.renderRoomCard();
    this.roomCard.classList.add('open');
  }

  private hideRoomCard(): void {
    this.selected = null;
    this.world.select(null);
    this.roomCard.classList.remove('open');
  }

  private renderRoomCard(): void {
    const a = this.selected;
    if (!a) return;
    const def = AREA_TYPES[a.type];
    const isRoom = def.category === 'guestRoom';
    const fact = (label: string, val: string) => h('div', { class: 'fact' }, h('div', { class: 'lbl' }, label), h('div', { class: 'val' }, val));
    const facts = isRoom
      ? [fact(t('room.price'), formatMoney(this.game.roomPrice(a))), fact(t('room.size'), `${a.w * a.d} ${t('common.sqm')}`), fact(t('room.capacity'), String(def.room!.capacity)), fact(t('room.level'), '★'.repeat(a.level))]
      : [fact(t('room.size'), `${a.w * a.d} ${t('common.sqm')}`), fact(t('room.floor'), a.floor === 0 ? t('view.ground') : String(a.floor)), fact(t('room.level'), '★'.repeat(a.level)), fact('מידות', `${a.w}×${a.d}`)];
    this.roomCardBody.replaceChildren(
      h('div', { class: 'head' },
        h('span', { style: 'font-size:22px' }, def.icon),
        h('h3', null, roomTitle(a)),
        isRoom ? statusChip(this.game.state.rooms[a.id]?.status ?? 'vacant') : null,
        h('button', { class: 'icon-btn', 'aria-label': t('common.close'), onclick: () => this.hideRoomCard() }, svg(ICONS.close))),
      h('div', { class: 'facts' }, ...facts),
      isRoom ? h('div', { class: 'btn-grid' },
        h('button', { class: 'btn small primary', onclick: () => this.openTab('manage') }, t('manage.pricing')),
        h('button', { class: 'btn small', onclick: () => this.world.focusArea(a) }, t('view.recenter'))) : '');
  }

  private toggleView(): void {
    const next = this.game.state.settings.view === 'interior' ? 'exterior' : 'interior';
    this.hideRoomCard();
    this.game.setView(next);
    this.world.build();
  }

  notify(text: string, ms?: number): void {
    this.toasts.show(text, ms);
  }

  // --- Per-frame -----------------------------------------------------------

  refreshHud(): void {
    const s = this.game.state;
    this.hud.name.textContent = s.meta.hotelName;
    this.hud.money.textContent = formatMoneyShort(s.finance.money);
    const full = starsEl(s.rating.stars);
    full.classList.add('stars-full');
    this.hud.stars.replaceChildren(full, h('span', { class: 'stars-compact' }, `★ ${s.rating.stars}`));
    this.hud.occ.textContent = `${this.game.occupancy().pct}%`;
    for (const [sp, b] of this.speedBtns) {
      b.classList.toggle('on', sp === s.clock.speed);
      b.setAttribute('aria-pressed', String(sp === s.clock.speed));
    }
    this.viewBtnLabel.textContent = s.settings.view === 'interior' ? t('view.exterior') : t('view.interior');
  }

  /** Called every frame – only touches the DOM when values change. */
  tick(): void {
    const s = this.game.state;
    const time = formatTime(s.clock.minute);
    if (this.hud.time.textContent !== time) {
      this.hud.time.textContent = time;
      const date = `${t('hud.day', { day: s.clock.day })} · ${t(`weekday.${weekday(s.clock.day)}` as StringKey)}`;
      if (this.hud.date.textContent !== date) this.hud.date.textContent = date;
      this.updateSky();
    }
  }

  private updateSky(): void {
    const m = this.game.state.clock.minute;
    const n = nightFactor(m), g = goldenFactor(m);
    const key = `${n.toFixed(2)}:${g.toFixed(2)}`;
    if (key === this.lastSkyKey) return;
    this.lastSkyKey = key;
    const lerp = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    let top = lerp([120, 186, 228], [255, 170, 120], g * 0.8);
    let bot = lerp([226, 240, 246], [255, 222, 188], g * 0.8);
    top = lerp(top, [9, 17, 40], n);
    bot = lerp(bot, [28, 42, 74], n);
    this.sky.style.background = `linear-gradient(rgb(${top}), rgb(${bot}))`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${top})`);
  }
}
