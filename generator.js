const TOWER_TROOPS = {
  "Tower Princess": 159000000,
  "Cannoneer": 159000001,
  "Dagger Duchess": 159000002,
  "Royal Chef": 159000003,
};

const EXCLUDED_KEYS = new Set([
  "santa-hog-rider",
  "super-lava-hound",
  "super-magic-archer",
  "super-ice-golem",
]);

const EXCLUDED_NAME_PARTS = ["santa ", "super "];
// Локальный путь к файлу с данными (относительно корня сайта или текущей директории)
const CARDS_URL = "./cards.json"; // При необходимости измените на корректный путь

function isSpecialCard(card) {
  const key = String(card.key ?? "").trim().toLowerCase();
  const name = String(card.name ?? "").trim().toLowerCase();

  if (EXCLUDED_KEYS.has(key)) return true;
  return EXCLUDED_NAME_PARTS.some(part => name.startsWith(part));
}

function prepareCards(rawCards) {
  const result = new Map();

  for (const card of rawCards) {
    if (!["id", "name", "type", "rarity"].every(field => field in card)) continue;

    const cardId = Number(card.id);
    if (!Number.isFinite(cardId)) continue;

    if (Object.values(TOWER_TROOPS).includes(cardId)) continue;
    if (card.is_evolved === true) continue;
    if (isSpecialCard(card)) continue;

    const cardType = String(card.type ?? "").toLowerCase();
    if (cardType.includes("tower")) continue;

    result.set(cardId, card);
  }

  return [...result.values()];
}

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function choice(items) {
  return items[randomInt(items.length)];
}

function sample(items, count) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function shuffle(items) {
  return sample(items, items.length);
}

function generateDeck(cards) {
  if (cards.length < 8) {
    throw new Error(`Недостаточно карт для генерации колоды: ${cards.length}`);
  }

  // 1. Случайно выбираем 8 карт из всего доступного пула
  const selected = sample(cards, 8);

  // 2. Определяем, сколько среди них чемпионов
  let championIndices = [];
  for (let i = 0; i < selected.length; i++) {
    if (String(selected[i].rarity).toLowerCase() === "champion") {
      championIndices.push(i);
    }
  }

  // 3. Если чемпионов оказалось больше двух (редкий случай), заменяем лишних на случайных не‑чемпионов
  if (championIndices.length > 2) {
    const nonChampionPool = cards.filter(
      card => String(card.rarity).toLowerCase() !== "champion"
    );
    const replacements = sample(nonChampionPool, championIndices.length - 2);
    let replIdx = 0;
    for (let i = 2; i < championIndices.length; i++) {
      selected[championIndices[i]] = replacements[replIdx++];
    }
    championIndices = championIndices.slice(0, 2);
  }

  const championCount = championIndices.length;
  const deck = Array(8).fill(null);

  if (championCount === 0) {
    // Нет чемпионов – просто перемешиваем выбранные карты
    const shuffled = shuffle(selected);
    for (let i = 0; i < 8; i++) {
      deck[i] = shuffled[i];
    }
  } else if (championCount === 1) {
    // Один чемпион – помещаем его на случайный допустимый слот (1 или 2)
    const championCard = selected[championIndices[0]];
    const championSlot = choice([1, 2]); // 50/50, как и раньше
    deck[championSlot] = championCard;

    // Остальные карты занимают оставшиеся слоты
    const otherCards = selected.filter((_, idx) => idx !== championIndices[0]);
    const normalSlots = [0, 1, 2, 3, 4, 5, 6, 7].filter(i => i !== championSlot);
    const shuffledOthers = shuffle(otherCards);
    for (let i = 0; i < normalSlots.length; i++) {
      deck[normalSlots[i]] = shuffledOthers[i];
    }
  } else {
    // Два чемпиона – занимают оба допустимых слота (1 и 2)
    const championCards = championIndices.map(i => selected[i]);
    const shuffledChampions = shuffle(championCards);
    deck[1] = shuffledChampions[0];
    deck[2] = shuffledChampions[1];

    // Обычные карты – на остальные шесть позиций
    const normalSlots = [0, 3, 4, 5, 6, 7];
    const otherCards = selected.filter((_, idx) => !championIndices.includes(idx));
    const shuffledOthers = shuffle(otherCards);
    for (let i = 0; i < normalSlots.length; i++) {
      deck[normalSlots[i]] = shuffledOthers[i];
    }
  }

  // Финальные проверки
  if (deck.some(card => card === null)) {
    throw new Error("Внутренняя ошибка: генератор создал пустой слот.");
  }

  const ids = deck.map(card => card.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Внутренняя ошибка: в колоде есть повторяющиеся карты.");
  }

  return deck;
}

function makeSlots(deck) {
  return deck.map(() => "0").join(";");
}

function makeDeckUrl(deck, towerId, language = "ru") {
  const deckIds = deck.map(card => String(card.id)).join(";");
  return `https://link.clashroyale.com/${language}?clashroyale://copyDeck?deck=${deckIds}&slots=${makeSlots(deck)}&tt=${towerId}`;
}

async function loadCards() {
  // Загрузка из локального файла (кэширование удалено)
  const response = await fetch(CARDS_URL, {
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить cards.json: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("cards.json имеет неожиданный формат.");

  return data;
}

window.ClashRoyaleGenerator = {
  loadCards,
  prepareCards,
  generateDeck,
  makeDeckUrl,
  TOWER_TROOPS,
};
