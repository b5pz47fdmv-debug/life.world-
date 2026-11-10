import '@fontsource/heebo/hebrew-400.css';
import '@fontsource/heebo/hebrew-500.css';
import '@fontsource/heebo/hebrew-700.css';
import '@fontsource/heebo/latin-400.css';
import '@fontsource/heebo/latin-700.css';
import '@fontsource/frank-ruhl-libre/hebrew-700.css';
import '@fontsource/frank-ruhl-libre/latin-700.css';
import './ui/styles.css';
import { Application } from 'pixi.js';
import { Game } from './core/Game';
import { SaveManager, browserStore } from './core/SaveManager';
import { setLocale, t } from './i18n';
import { WorldRenderer } from './render/WorldRenderer';
import { UI } from './ui/UI';

const VERSION = '0.1.0';

async function boot(): Promise<void> {
  setLocale('he');
  document.title = `${t('app.title')} · ${t('app.subtitle')}`;
  await Promise.race([
    Promise.all([document.fonts.load('700 20px "Frank Ruhl Libre"'), document.fonts.load('400 14px Heebo')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);

  const saves = new SaveManager(browserStore());
  const loaded = saves.load();
  const game = new Game(saves, loaded.state ?? undefined);
  if (!loaded.state) game.save();

  const host = document.getElementById('game')!;
  const app = new Application();
  await app.init({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 3),
    autoDensity: true,
    powerPreference: 'high-performance',
  });
  host.appendChild(app.canvas);

  const world = new WorldRenderer(app, game);
  world.build();
  world.recenter(false);
  const ui = new UI(game, world, VERSION);
  game.bus.on('replaced', () => {
    world.build();
    world.recenter(false);
  });
  if (loaded.recovered) setTimeout(() => ui.notify(t('toast.loadRecovered'), 4000), 600);

  app.ticker.add((tk) => {
    const dt = tk.deltaMS / 1000;
    game.update(dt);
    world.update(dt);
    ui.tick();
  });

  // iOS may kill a backgrounded tab at any time: save whenever we lose visibility.
  const persist = () => game.save();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      persist();
      app.ticker.stop();
    } else {
      app.ticker.start();
    }
  });
  window.addEventListener('pagehide', persist);
  window.addEventListener('resize', () => setTimeout(() => world.recenter(false), 50));

  // Debug hook for automated tests.
  (window as any).__hotel = { game, world, ui };

  document.getElementById('splash')?.classList.add('hide');
  setTimeout(() => document.getElementById('splash')?.remove(), 700);
}

boot().catch((err) => {
  console.error(err);
  const s = document.getElementById('splash');
  if (s) s.querySelector('.sub')!.textContent = `שגיאה בטעינה: ${String(err?.message ?? err)}`;
});
