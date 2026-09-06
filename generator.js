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
