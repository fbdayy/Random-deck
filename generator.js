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

  const champions = cards.filter(
    card => String(card.rarity).toLowerCase() === "champion"
  );
  const nonChampions = cards.filter(
    card => String(card.rarity).toLowerCase() !== "champion"
  );

  const championCount = randomInt(Math.min(2, champions.length) + 1);
  const selectedChampions = championCount > 0
    ? sample(champions, championCount)
    : [];
  const selectedNormal = sample(nonChampions, 8 - championCount);

  const deck = Array(8).fill(null);

  if (championCount === 0) {
    shuffle(selectedNormal).forEach((card, i) => deck[i] = card);
  } else if (championCount === 1) {
    const championSlot = choice([1, 2]); // 2-й или 3-й слот
    deck[championSlot] = selectedChampions[0];

    const normalSlots = [...Array(8).keys()].filter(i => i !== championSlot);
    shuffle(selectedNormal).forEach((card, i) => deck[normalSlots[i]] = card);
  } else {
    const championSlots = [1, 2];
    shuffle(selectedChampions).forEach((card, i) => deck[championSlots[i]] = card);

    const normalSlots = [0, 3, 4, 5, 6, 7];
    shuffle(selectedNormal).forEach((card, i) => deck[normalSlots[i]] = card);
  }

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