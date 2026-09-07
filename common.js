// Общие утилиты для Clash Royale Generator
;(function() {
  const STORAGE_KEYS = {
    OWNED_CARDS: 'cr-owned-cards',
    OWNED_TOWERS: 'cr-owned-towers',
    EVO: 'cr-evo-owned',
    HEROISM: 'cr-heroism-owned'
  };

  // SVG иконки (без изменений)
  const RING = `<circle class="icon-ring" cx="18" cy="18" r="15"></circle>`;
  const HERO_SHIELD_SVG = `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" focusable="false">${RING}<path class="icon-shape" d="M18 6 L28 10 L28 20 C28 28 18 32 18 32 C18 32 8 28 8 20 L8 10 Z M18 12 L22 15 L20 21 L16 21 L14 15 Z" /></svg>`;
  const HEROISM_STAR_SVG = `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" focusable="false">${RING}<path class="icon-shape" d="M18 6 L20.9 14 L18 14 Z M18 6 L15.1 14 L18 14 Z M29.4 14.3 L20.9 14 L21.85 16.75 Z M29.4 14.3 L22.8 19.5 L21.85 16.75 Z M25.1 27.7 L22.8 19.5 L20.4 21.25 Z M25.1 27.7 L18 23 L20.4 21.25 Z M10.9 27.7 L18 23 L15.6 21.25 Z M10.9 27.7 L13.2 19.5 L15.6 21.25 Z M6.6 14.3 L13.2 19.5 L14.15 16.75 Z M6.6 14.3 L15.1 14 L14.15 16.75 Z M18 14 L21.85 16.75 L20.4 21.25 L15.6 21.25 L14.15 16.75 Z" /></svg>`;
  const EVO_AMETHYST_SVG = `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" focusable="false">${RING}<path class="icon-shape" d="M18 7 L29 18 L18 29 L7 18 Z" /></svg>`;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function loadSet(key) {
    try {
      const raw = localStorage.getItem(key);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (_) { return new Set(); }
  }

  function saveSet(key, set) {
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch (_) {}
  }

  function loadMap(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }

  function saveMap(key, map) {
    try {
      localStorage.setItem(key, JSON.stringify(map));
    } catch (_) {}
  }

  // Тема
  function setTheme(theme) {
    const isLight = theme === 'light';
    // Обновляем класс и на <html>, и на <body>, чтобы все проверки темы
    // (в т.ч. на странице cards.html) видели одинаковое состояние.
    document.documentElement.classList.toggle('light-theme', isLight);
    document.body.classList.toggle('light-theme', isLight);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = isLight ? '☀️' : '🌙';
  }

  function loadTheme() {
    let stored = null;
    try { stored = localStorage.getItem('cr-theme'); } catch (_) {}
    if (stored) { setTheme(stored); return; }
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(prefersLight ? 'light' : 'dark');
  }

  function toggleTheme() {
    const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    setTheme(current === 'light' ? 'dark' : 'light');
    try { localStorage.setItem('cr-theme', current === 'light' ? 'dark' : 'light'); } catch (_) {}
  }

  // Состояние иконок – теперь с учётом режима управления (cardOwned)
  function computeIconState(map, key, slotIndex, kind, cardOwned) {
    const owned = Boolean(map[key]);
    if (!owned) return 1;

    // Если передан cardOwned – это режим управления коллекцией
    if (cardOwned !== undefined && cardOwned !== null) {
      return cardOwned ? 3 : 2;
    }

    // Иначе режим генератора – зависит от слота
    let isSpecialSlot;
    if (kind === 'heroism') {
      isSpecialSlot = (slotIndex === 1 || slotIndex === 2);
    } else {
      isSpecialSlot = (slotIndex === 0 || slotIndex === 2);
    }
    return isSpecialSlot ? 3 : 2;
  }

  // Сборка HTML иконок для карты
  // Добавлен параметр cardOwned (для страницы управления)
  function buildCardIcons(card, slotIndex = 0, evoOwned = null, heroismOwned = null, tournamentMode = false, cardOwned = null) {
    if (evoOwned === null) evoOwned = loadMap(STORAGE_KEYS.EVO);
    if (heroismOwned === null) heroismOwned = loadMap(STORAGE_KEYS.HEROISM);

    const parts = [];
    const key = card.key || String(card.id);
    const isChampion = String(card.rarity || '').toLowerCase() === 'champion';

    // Герой – всегда статическая иконка (не кнопка)
    if (isChampion) {
      parts.push(`<span class="card-icon hero-icon" title="Герой">${HERO_SHIELD_SVG}</span>`);
    }

    // Эволюция
    if (card.has_evolution) {
      let state;
      if (tournamentMode) {
        state = 3;
      } else {
        state = computeIconState(evoOwned, key, slotIndex, 'evolution', cardOwned);
      }
      if (tournamentMode) {
        parts.push(`<span class="card-icon" data-kind="evolution" data-key="${escapeHtml(key)}" data-state="${state}" title="Эволюция (турнирный режим)">${EVO_AMETHYST_SVG}</span>`);
      } else {
        parts.push(`
          <button type="button" class="card-icon-btn" data-kind="evolution" data-key="${escapeHtml(key)}" data-state="${state}"
            aria-pressed="${Boolean(evoOwned[key])}" aria-label="Эволюция: ${evoOwned[key] ? 'есть' : 'нет'}"
            title="Отметить, есть ли у вас эволюция этой карты">
            ${EVO_AMETHYST_SVG}
          </button>
        `);
      }
    }

    // Героизм
    if (card.has_heroism) {
      let state;
      if (tournamentMode) {
        state = 3;
      } else {
        state = computeIconState(heroismOwned, key, slotIndex, 'heroism', cardOwned);
      }
      if (tournamentMode) {
        parts.push(`<span class="card-icon" data-kind="heroism" data-key="${escapeHtml(key)}" data-state="${state}" title="Героизм (турнирный режим)">${HEROISM_STAR_SVG}</span>`);
      } else {
        parts.push(`
          <button type="button" class="card-icon-btn" data-kind="heroism" data-key="${escapeHtml(key)}" data-state="${state}"
            aria-pressed="${Boolean(heroismOwned[key])}" aria-label="Героизм: ${heroismOwned[key] ? 'есть' : 'нет'}"
            title="Отметить, есть ли у вас героизм этой карты">
            ${HEROISM_STAR_SVG}
          </button>
        `);
      }
    }

    return parts.length ? `<div class="card-icons">${parts.join('')}</div>` : '';
  }

  // Получение данных о всегда доступных картах/башнях из generator.js (без изменений)
  function getAlwaysOwnedCards() {
    const gen = window.ClashRoyaleGenerator;
    return gen && gen.ALWAYS_OWNED_CARDS_KEYS ? gen.ALWAYS_OWNED_CARDS_KEYS : new Set();
  }

  function getAlwaysOwnedTowers() {
    const gen = window.ClashRoyaleGenerator;
    return gen && gen.ALWAYS_OWNED_TOWERS_NAMES ? gen.ALWAYS_OWNED_TOWERS_NAMES : new Set();
  }

  function getTowerRarity(towerName) {
    const gen = window.ClashRoyaleGenerator;
    return gen && gen.TOWER_RARITY_MAP ? gen.TOWER_RARITY_MAP[towerName] || '' : '';
  }

  // Публичный API
  window.ClashRoyaleCommon = {
    STORAGE_KEYS,
    SVG: { RING, HERO_SHIELD_SVG, HEROISM_STAR_SVG, EVO_AMETHYST_SVG },
    escapeHtml,
    loadOwnedCards: () => loadSet(STORAGE_KEYS.OWNED_CARDS),
    saveOwnedCards: (set) => saveSet(STORAGE_KEYS.OWNED_CARDS, set),
    loadOwnedTowers: () => loadSet(STORAGE_KEYS.OWNED_TOWERS),
    saveOwnedTowers: (set) => saveSet(STORAGE_KEYS.OWNED_TOWERS, set),
    loadOwnedMap: loadMap,
    saveOwnedMap: saveMap,
    setTheme,
    loadTheme,
    toggleTheme,
    computeIconState,
    buildCardIcons,  // теперь принимает cardOwned
    getAlwaysOwnedCards,
    getAlwaysOwnedTowers,
    getTowerRarity
  };
})();