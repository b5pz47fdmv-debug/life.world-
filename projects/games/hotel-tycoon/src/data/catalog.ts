// Data-driven definitions. Adding a new room type / facility / staff role is a
// data change here, not a code change in the simulation or renderer.

export type AreaCategory = 'public' | 'circulation' | 'guestRoom' | 'service' | 'facility' | 'outdoor';
export type FloorFinish = 'marble' | 'carpet' | 'wood' | 'tile' | 'runner' | 'stone' | 'deck';

export interface AreaTypeDef {
  id: string;
  name: string;
  category: AreaCategory;
  floor: FloorFinish;
  /** Wall paint for the inner face of walls. */
  wall: number;
  /** Minimum size in metres (w x d). */
  minSize: [number, number];
  /** Build cost per square metre. */
  costPerSqm: number;
  /** Daily upkeep per square metre. */
  upkeepPerSqm: number;
  /** Star rating needed before the player can build it. */
  unlockStars: number;
  /** Guest-room specific. */
  room?: { capacity: number; basePrice: number };
  /** Hidden sub-areas (e.g. bathrooms) don't appear in lists. */
  hidden?: boolean;
  icon: string;
}

export const AREA_TYPES: Record<string, AreaTypeDef> = {
  lobby: { id: 'lobby', name: 'לובי וקבלה', category: 'public', floor: 'marble', wall: 0xf3ead8, minSize: [6, 5], costPerSqm: 3200, upkeepPerSqm: 6, unlockStars: 0, icon: '🛎️' },
  corridor: { id: 'corridor', name: 'מסדרון', category: 'circulation', floor: 'runner', wall: 0xf1e6d0, minSize: [2, 2], costPerSqm: 1400, upkeepPerSqm: 2, unlockStars: 0, icon: '🚪' },
  room_standard: { id: 'room_standard', name: 'חדר סטנדרט', category: 'guestRoom', floor: 'carpet', wall: 0xeee3cf, minSize: [4, 5], costPerSqm: 2600, upkeepPerSqm: 4, unlockStars: 0, room: { capacity: 2, basePrice: 690 }, icon: '🛏️' },
  room_deluxe: { id: 'room_deluxe', name: 'חדר דלוקס', category: 'guestRoom', floor: 'wood', wall: 0xe9dcc4, minSize: [5, 6], costPerSqm: 3900, upkeepPerSqm: 6, unlockStars: 2, room: { capacity: 2, basePrice: 1190 }, icon: '🛏️' },
  suite: { id: 'suite', name: 'סוויטה', category: 'guestRoom', floor: 'wood', wall: 0xe6d6ba, minSize: [7, 6], costPerSqm: 5600, upkeepPerSqm: 9, unlockStars: 3, room: { capacity: 4, basePrice: 2490 }, icon: '👑' },
  bathroom: { id: 'bathroom', name: 'חדר רחצה', category: 'service', floor: 'tile', wall: 0xf4f1ea, minSize: [2, 2], costPerSqm: 4200, upkeepPerSqm: 3, unlockStars: 0, hidden: true, icon: '🛁' },
  cafe: { id: 'cafe', name: 'בית קפה', category: 'facility', floor: 'wood', wall: 0xeadbc2, minSize: [6, 5], costPerSqm: 3000, upkeepPerSqm: 7, unlockStars: 1, icon: '☕' },
  restaurant: { id: 'restaurant', name: 'מסעדת שף', category: 'facility', floor: 'wood', wall: 0xe4d2b4, minSize: [8, 7], costPerSqm: 4400, upkeepPerSqm: 9, unlockStars: 2, icon: '🍽️' },
  gym: { id: 'gym', name: 'חדר כושר', category: 'facility', floor: 'tile', wall: 0xe8ecef, minSize: [6, 5], costPerSqm: 2800, upkeepPerSqm: 5, unlockStars: 2, icon: '🏋️' },
  spa: { id: 'spa', name: 'ספא', category: 'facility', floor: 'stone', wall: 0xe9e4da, minSize: [8, 6], costPerSqm: 5200, upkeepPerSqm: 10, unlockStars: 3, icon: '💆' },
  pool: { id: 'pool', name: 'בריכת אינסוף', category: 'outdoor', floor: 'deck', wall: 0xffffff, minSize: [8, 5], costPerSqm: 3600, upkeepPerSqm: 8, unlockStars: 1, icon: '🏊' },
  garden: { id: 'garden', name: 'גן טרופי', category: 'outdoor', floor: 'stone', wall: 0xffffff, minSize: [4, 4], costPerSqm: 600, upkeepPerSqm: 1, unlockStars: 0, icon: '🌴' },
};

export interface StaffRoleDef {
  id: string;
  name: string;
  salary: number;
  icon: string;
  uniform: number;
  description: string;
}

export const STAFF_ROLES: StaffRoleDef[] = [
  { id: 'receptionist', name: 'פקיד/ת קבלה', salary: 420, icon: '🛎️', uniform: 0x1d2b4a, description: 'צ\'ק־אין, צ\'ק־אאוט ומענה לאורחים' },
  { id: 'housekeeper', name: 'חדרן/ית', salary: 360, icon: '🧺', uniform: 0x6f8f8a, description: 'ניקיון והכנת חדרים' },
  { id: 'chef', name: 'שף', salary: 640, icon: '👨‍🍳', uniform: 0xf5f5f5, description: 'הכנת מנות במסעדה ובבית הקפה' },
  { id: 'waiter', name: 'מלצר/ית', salary: 340, icon: '🍽️', uniform: 0x262626, description: 'הגשה ושירות לשולחנות' },
  { id: 'maintenance', name: 'איש/אשת תחזוקה', salary: 450, icon: '🔧', uniform: 0x8a5a2b, description: 'תיקון תקלות ותחזוקה שוטפת' },
  { id: 'manager', name: 'מנהל/ת משמרת', salary: 900, icon: '💼', uniform: 0x3a2f4f, description: 'משפר/ת את יעילות הצוות ואת שביעות הרצון' },
];

export const GAME_BALANCE = {
  startMoney: 250_000,
  realSecondsPerGameDay: 240,
  dayStartMinute: 8 * 60,
  autosaveSeconds: 30,
  maxManualBackups: 10,
  maxAutoBackups: 5,
};
