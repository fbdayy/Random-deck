const TOWER_TROOPS = {
  "Tower Princess": 159000000,
  "Cannoneer": 159000001,
  "Dagger Duchess": 159000002,
  "Royal Chef": 159000004,
};

const EXCLUDED_KEYS = new Set([
  "santa-hog-rider",
  "super-lava-hound",
  "super-magic-archer",
  "super-ice-golem",
]);

const EXCLUDED_NAME_PARTS = ["santa ", "super "];
const CARDS_URL = "./cards.json";

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

  const selected = sample(cards, 8);

  let championIndices = [];
  for (let i = 0; i < selected.length; i++) {
    if (String(selected[i].rarity).toLowerCase() === "champion") {
      championIndices.push(i);
    }
  }

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
    const shuffled = shuffle(selected);
    for (let i = 0; i < 8; i++) {
      deck[i] = shuffled[i];
    }
  } else if (championCount === 1) {
    const championCard = selected[championIndices[0]];
    const championSlot = choice([1, 2]);
    deck[championSlot] = championCard;

    const otherCards = selected.filter((_, idx) => idx !== championIndices[0]);
    const normalSlots = [0, 1, 2, 3, 4, 5, 6, 7].filter(i => i !== championSlot);
    const shuffledOthers = shuffle(otherCards);
    for (let i = 0; i < normalSlots.length; i++) {
      deck[normalSlots[i]] = shuffledOthers[i];
    }
  } else {
    const championCards = championIndices.map(i => selected[i]);
    const shuffledChampions = shuffle(championCards);
    deck[1] = shuffledChampions[0];
    deck[2] = shuffledChampions[1];

    const normalSlots = [0, 3, 4, 5, 6, 7];
    const otherCards = selected.filter((_, idx) => !championIndices.includes(idx));
    const shuffledOthers = shuffle(otherCards);
    for (let i = 0; i < normalSlots.length; i++) {
      deck[normalSlots[i]] = shuffledOthers[i];
    }
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

function getCardKey(card) {
  return String(card?.key ?? card?.id ?? "");
}

function hasEvolution(card, evoOwned = {}) {
  if (!card || !card.has_evolution) return false;
  return Boolean(evoOwned[getCardKey(card)]);
}

function hasHeroism(card, heroismOwned = {}) {
  if (!card || !card.has_heroism) return false;
  return Boolean(heroismOwned[getCardKey(card)]);
}

function isChampion(card) {
  return String(card?.rarity ?? "").toLowerCase() === "champion";
}

// Логика сортировки колоды по способностям с учётом купленных/отмеченных способностей
function applyEvoSort(deck, evoOwned = {}, heroismOwned = {}) {
  if (!Array.isArray(deck) || deck.length < 8) return deck;

  const result = new Array(8).fill(null);

  const champions = [];
  const nonChampions = [];

  for (const card of deck) {
    if (isChampion(card)) {
      champions.push(card);
    } else {
      nonChampions.push(card);
    }
  }

  const champCount = champions.length;

  if (champCount >= 2) {
    // 2 Героя: ставятся во 2 и 3 клетки (индексы 1 и 2)
    const shuffledChamps = shuffle(champions);
    result[1] = shuffledChamps[0];
    result[2] = shuffledChamps[1];

    for (let i = 2; i < shuffledChamps.length; i++) {
      nonChampions.push(shuffledChamps[i]);
    }

    // В клетку 1 (индекс 0) ищем имеющуюся эволюцию
    let bestScore = -1;
    let candidates = [];

    for (let i = 0; i < nonChampions.length; i++) {
      const card = nonChampions[i];
      const score = hasEvolution(card, evoOwned) ? 1 : 0;
      if (score > bestScore) {
        bestScore = score;
        candidates = [{ cardIndex: i }];
      } else if (score === bestScore) {
        candidates.push({ cardIndex: i });
      }
    }

    const chosen = choice(candidates);
    result[0] = nonChampions[chosen.cardIndex];

    const remaining = nonChampions.filter((_, idx) => idx !== chosen.cardIndex);
    const shuffledRemaining = shuffle(remaining);
    const normalSlots = [3, 4, 5, 6, 7];
    for (let i = 0; i < normalSlots.length; i++) {
      result[normalSlots[i]] = shuffledRemaining[i];
    }
  } else if (champCount === 1) {
    // 1 Герой: ставится во 2 клетку (индекс 1)
    result[1] = champions[0];

    // Клетка 1 (индекс 0): нужна Эволюция
    // Клетка 3 (индекс 2): может быть Эволюция или Героизм
    let bestScore = -1;
    let bestTuples = [];

    for (let i = 0; i < nonChampions.length; i++) {
      for (let j = 0; j < nonChampions.length; j++) {
        if (i === j) continue;
        const card0 = nonChampions[i];
        const card2 = nonChampions[j];

        for (const role2 of ["EVO", "HEROISM"]) {
          let score = 0;
          if (hasEvolution(card0, evoOwned)) score += 1;
          if (role2 === "EVO" && hasEvolution(card2, evoOwned)) score += 1;
          if (role2 === "HEROISM" && hasHeroism(card2, heroismOwned)) score += 1;

          if (score > bestScore) {
            bestScore = score;
            bestTuples = [{ i, j, role2 }];
          } else if (score === bestScore) {
            bestTuples.push({ i, j, role2 });
          }
        }
      }
    }

    const chosen = choice(bestTuples);
    result[0] = nonChampions[chosen.i];
    result[2] = nonChampions[chosen.j];

    const remaining = nonChampions.filter((_, idx) => idx !== chosen.i && idx !== chosen.j);
    const shuffledRemaining = shuffle(remaining);
    const normalSlots = [3, 4, 5, 6, 7];
    for (let i = 0; i < normalSlots.length; i++) {
      result[normalSlots[i]] = shuffledRemaining[i];
    }
  } else {
    // 0 Героев:
    // Клетка 1 (индекс 0): Эволюция
    // Клетка 2 (индекс 1): Героизм
    // Клетка 3 (индекс 2): Эволюция или Героизм
    let bestScore = -1;
    let bestTuples = [];

    for (let i = 0; i < nonChampions.length; i++) {
      for (let j = 0; j < nonChampions.length; j++) {
        if (i === j) continue;
        for (let k = 0; k < nonChampions.length; k++) {
          if (k === i || k === j) continue;

          const card0 = nonChampions[i];
          const card1 = nonChampions[j];
          const card2 = nonChampions[k];

          for (const role2 of ["EVO", "HEROISM"]) {
            let score = 0;
            if (hasEvolution(card0, evoOwned)) score += 1;
            if (hasHeroism(card1, heroismOwned)) score += 1;
            if (role2 === "EVO" && hasEvolution(card2, evoOwned)) score += 1;
            if (role2 === "HEROISM" && hasHeroism(card2, heroismOwned)) score += 1;

            if (score > bestScore) {
              bestScore = score;
              bestTuples = [{ i, j, k, role2 }];
            } else if (score === bestScore) {
              bestTuples.push({ i, j, k, role2 });
            }
          }
        }
      }
    }

    const chosen = choice(bestTuples);
    result[0] = nonChampions[chosen.i];
    result[1] = nonChampions[chosen.j];
    result[2] = nonChampions[chosen.k];

    const remaining = nonChampions.filter((_, idx) => idx !== chosen.i && idx !== chosen.j && idx !== chosen.k);
    const shuffledRemaining = shuffle(remaining);
    const normalSlots = [3, 4, 5, 6, 7];
    for (let i = 0; i < normalSlots.length; i++) {
      result[normalSlots[i]] = shuffledRemaining[i];
    }
  }

  return result;
}

function makeSlots(deck) {
  return deck.map(() => "0").join(";");
}

function makeDeckUrl(deck, towerId, language = "ru") {
  const deckIds = deck.map(card => String(card.id)).join(";");
  return `https://link.clashroyale.com/${language}?clashroyale://copyDeck?deck=${deckIds}&slots=${makeSlots(deck)}&tt=${towerId}`;
}

async function loadCards() {
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
  applyEvoSort,
  makeDeckUrl,
  TOWER_TROOPS
};
