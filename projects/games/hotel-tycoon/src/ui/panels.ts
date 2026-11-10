import type { Game } from '../core/Game';
import type { BackupInfo } from '../core/SaveManager';
import { AREA_TYPES, STAFF_ROLES } from '../data/catalog';
import { formatMoney, formatNumber, t } from '../i18n';
import type { Area } from '../state/types';
import { ICONS, h, svg } from './dom';

export function statusChip(status: string): HTMLElement {
  const cls = status === 'vacant' ? 'chip' : status === 'occupied' ? 'chip gold' : status === 'dirty' ? 'chip warn' : 'chip bad';
  return h('span', { class: cls }, t(`room.status.${status}` as never));
}

export function starsEl(n: number, max = 5): HTMLElement {
  const el = h('span', { class: 'stars', 'aria-label': `${n}/${max}` });
  for (let i = 0; i < max; i++) el.append(i < n ? '★' : h('span', { class: 'off' }, '★'));
  return el;
}

export function roomTitle(a: Area): string {
  const def = AREA_TYPES[a.type];
  return def.category === 'guestRoom' ? `${def.name} ${a.label ?? ''}`.trim() : def.name;
}

// ---------------------------------------------------------------------------

export function hotelPanel(game: Game, onRoom: (a: Area) => void): Node[] {
  const s = game.state;
  const rooms = game.rooms();
  const facilities = s.layout.areas.filter((a) => !a.parentId && AREA_TYPES[a.type].category !== 'guestRoom');
  const built = s.layout.areas.filter((a) => !a.parentId).reduce((sum, a) => sum + a.w * a.d, 0);
  const floors = Math.max(...s.layout.buildings.map((b) => b.floors));
  return [
    h('div', { class: 'cards' },
      kpi(t('hotel.rooms'), formatNumber(rooms.length)),
      kpi(t('hotel.floors'), formatNumber(floors)),
      kpi(t('hotel.facilities'), formatNumber(facilities.length)),
      kpi(t('hotel.area'), `${formatNumber(built)} ${t('common.sqm')}`)),
    h('div', { class: 'section-title' }, t('hotel.rooms')),
    h('div', { class: 'list' }, ...rooms.map((r) =>
      h('button', { class: 'row', onclick: () => onRoom(r) },
        h('span', { class: 'ic' }, svg(ICONS.bed)),
        h('span', { class: 'grow' },
          h('div', { class: 't1' }, roomTitle(r)),
          h('div', { class: 't2' }, `${formatMoney(game.roomPrice(r))} · ${r.w * r.d} ${t('common.sqm')}`)),
        statusChip(s.rooms[r.id]?.status ?? 'vacant')))),
    h('div', { class: 'section-title' }, t('hotel.facilities')),
    h('div', { class: 'list' }, ...facilities.map((a) =>
      h('button', { class: 'row', onclick: () => onRoom(a) },
        h('span', { class: 'ic' }, AREA_TYPES[a.type].icon),
        h('span', { class: 'grow' },
          h('div', { class: 't1' }, AREA_TYPES[a.type].name),
          h('div', { class: 't2' }, `${a.w}×${a.d} מ' · ${formatNumber(a.w * a.d)} ${t('common.sqm')}`))))),
  ];
}

export function guestsPanel(): Node[] {
  return [
    h('div', { class: 'note' }, t('guests.empty')),
    h('div', { class: 'note' }, t('guests.phase')),
  ];
}

export function staffPanel(): Node[] {
  return [
    h('div', { class: 'note' }, t('staff.phase')),
    h('div', { class: 'list' }, ...STAFF_ROLES.map((r) =>
      h('div', { class: 'row' },
        h('span', { class: 'ic' }, r.icon),
        h('span', { class: 'grow' },
          h('div', { class: 't1' }, r.name),
          h('div', { class: 't2' }, r.description)),
        h('span', { class: 'chip gold' }, t('staff.salary', { amount: formatMoney(r.salary) }))))),
  ];
}

export function managePanel(game: Game): Node[] {
  const s = game.state;
  const occ = game.occupancy();
  const types = Object.values(AREA_TYPES).filter((d) => d.room);
  return [
    h('div', { class: 'section-title' }, t('manage.overview')),
    h('div', { class: 'cards' },
      kpi(t('manage.balance'), formatMoney(s.finance.money), true),
      kpi(t('manage.stars'), starsEl(s.rating.stars)),
      kpi(t('manage.available'), `${occ.available} / ${occ.total}`),
      kpi(t('manage.occupied'), `${occ.occupied} (${occ.pct}%)`),
      kpi(t('manage.daysOpen'), formatNumber(s.clock.day))),
    h('div', { class: 'section-title' }, t('manage.pricing')),
    h('div', { class: 'list' }, ...types.map((d) => {
      const unlocked = s.unlocks.includes(d.id);
      const val = h('span', { class: 'v' }, formatMoney(s.pricing[d.id]));
      const step = (delta: number) => {
        game.setRoomTypePrice(d.id, s.pricing[d.id] + delta);
        val.textContent = formatMoney(s.pricing[d.id]);
      };
      return h('div', { class: `row ${unlocked ? '' : 'locked'}` },
        h('span', { class: 'ic' }, d.icon),
        h('span', { class: 'grow' }, h('div', { class: 't1' }, d.name), h('div', { class: 't2' }, unlocked ? `${d.room!.capacity} ${t('room.capacity')}` : t('build.unlock', { stars: d.unlockStars }))),
        h('span', { class: 'stepper' },
          h('button', { 'aria-label': '+50', onclick: () => step(50) }, svg(ICONS.plus)),
          val,
          h('button', { 'aria-label': '-50', onclick: () => step(-50) }, svg(ICONS.minus))));
    })),
    h('div', { class: 'note', style: 'margin-top:10px' }, t('manage.pricingHint')),
  ];
}

export function buildPanel(game: Game): Node[] {
  const s = game.state;
  return [
    h('div', { class: 'note' }, t('build.phase')),
    h('div', { class: 'list' }, ...Object.values(AREA_TYPES).filter((d) => !d.hidden).map((d) => {
      const unlocked = s.rating.stars >= d.unlockStars;
      const size = d.minSize[0] * d.minSize[1];
      return h('div', { class: `row ${unlocked ? '' : 'locked'}` },
        h('span', { class: 'ic' }, d.icon),
        h('span', { class: 'grow' },
          h('div', { class: 't1' }, d.name),
          h('div', { class: 't2' }, `${t('build.cost')}: ${formatMoney(d.costPerSqm * size)} · ${d.minSize[0]}×${d.minSize[1]} מ'`)),
        unlocked ? h('span', { class: 'chip' }, t('build.unlocked')) : h('span', { class: 'chip warn' }, svg(ICONS.lock, 'icon'), ' ', t('build.unlock', { stars: d.unlockStars })));
    })),
  ];
}

export interface MenuActions {
  save(): void;
  backup(): void;
  restore(b: BackupInfo): void;
  remove(b: BackupInfo): void;
  exportFile(): void;
  importFile(): void;
  newGame(): void;
}

export function menuPanel(game: Game, a: MenuActions, version: string): Node[] {
  const backups = game.saves.listBackups();
  const fmt = (ts: number) => new Date(ts).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return [
    h('div', { class: 'btn-grid' },
      h('button', { class: 'btn primary', onclick: a.save }, svg(ICONS.save), t('menu.saveNow')),
      h('button', { class: 'btn', onclick: a.backup }, svg(ICONS.backup), t('menu.createBackup')),
      h('button', { class: 'btn', onclick: a.exportFile }, svg(ICONS.download), t('menu.export')),
      h('button', { class: 'btn', onclick: a.importFile }, svg(ICONS.upload), t('menu.import'))),
    h('div', { class: 't2', style: 'font-size:12.5px;color:var(--muted);margin:10px 2px 0' }, t('menu.lastSaved', { time: fmt(game.state.meta.savedAt) })),
    h('div', { class: 'section-title' }, `${t('menu.backups')} (${backups.length})`),
    backups.length === 0
      ? h('div', { class: 'note' }, t('menu.noBackups'))
      : h('div', { class: 'list' }, ...backups.map((b) =>
        h('div', { class: 'row' },
          h('span', { class: 'ic' }, svg(ICONS.backup)),
          h('span', { class: 'grow' },
            h('div', { class: 't1' }, `${b.hotelName} · יום ${b.day}`),
            h('div', { class: 't2' }, `${fmt(b.createdAt)} · ${formatMoney(b.money)}${b.label ? ` · ${b.label}` : ''}`)),
          h('span', { class: b.kind === 'manual' ? 'chip gold' : 'chip' }, t(b.kind === 'manual' ? 'menu.manual' : 'menu.auto')),
          h('button', { class: 'btn small', onclick: () => a.restore(b) }, t('menu.restore')),
          h('button', { class: 'icon-btn', 'aria-label': t('menu.delete'), onclick: () => a.remove(b) }, svg(ICONS.trash))))),
    h('div', { class: 'note', style: 'margin-top:14px' }, t('menu.storage')),
    h('button', { class: 'btn danger', style: 'width:100%;margin-top:6px', onclick: a.newGame }, svg(ICONS.refresh), t('menu.newGame')),
    h('div', { style: 'text-align:center;color:var(--muted);font-size:12px;margin:14px 0 4px' }, t('menu.version', { v: version })),
  ];
}

function kpi(label: string, value: string | Node, gold = false): HTMLElement {
  return h('div', { class: 'kpi' }, h('div', { class: 'lbl' }, label), h('div', { class: `val ${gold ? 'gold' : ''}` }, value));
}
