import { GameRecords, LevelRecord, WrongItemRecord, ProcessedItem, STORAGE_KEY, ItemCategory } from '../types';
import { LEVELS } from '../data/levels';

const ZONE_LABELS: Record<ItemCategory, string> = {
  allowed: '可入营',
  inspect: '需开箱',
  prohibited: '禁止携带',
};

function createEmptyRecords(): GameRecords {
  return {
    levelRecords: LEVELS.map((level) => ({
      level: level.level,
      bestSafetyScore: 0,
      bestAccuracy: 0,
      bestSupervisorReviews: Infinity,
      playCount: 0,
      stars: 0,
      completed: false,
      lastPlayTime: 0,
      wrongItems: [],
    })),
    totalPlayCount: 0,
    totalCorrectCount: 0,
    totalItemCount: 0,
    lastPlayTime: 0,
  };
}

export function loadRecords(): GameRecords {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyRecords();
    }
    const parsed = JSON.parse(raw) as GameRecords;
    if (!parsed.levelRecords || parsed.levelRecords.length !== LEVELS.length) {
      const records = createEmptyRecords();
      parsed.levelRecords.forEach((lr) => {
        const idx = lr.level - 1;
        if (idx >= 0 && idx < records.levelRecords.length) {
          records.levelRecords[idx] = { ...records.levelRecords[idx], ...lr };
        }
      });
      records.totalPlayCount = parsed.totalPlayCount || 0;
      records.totalCorrectCount = parsed.totalCorrectCount || 0;
      records.totalItemCount = parsed.totalItemCount || 0;
      records.lastPlayTime = parsed.lastPlayTime || 0;
      return records;
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to load game records:', e);
    return createEmptyRecords();
  }
}

export function saveRecords(records: GameRecords): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save game records:', e);
  }
}

export function calculateStars(
  safetyScore: number,
  accuracy: number,
  supervisorReviews: number,
  completed: boolean
): number {
  if (!completed || safetyScore < 40) {
    return 0;
  }
  let stars = 1;
  if (safetyScore >= 70 && accuracy >= 0.8) {
    stars = 2;
  }
  if (safetyScore >= 90 && supervisorReviews === 0) {
    stars = 3;
  }
  return stars;
}

export function updateRecordsWithResult(
  records: GameRecords,
  levelIndex: number,
  safetyScore: number,
  maxSafetyScore: number,
  items: ProcessedItem[],
  supervisorReviews: number
): GameRecords {
  const level = LEVELS[levelIndex];
  if (!level) return records;

  const correctCount = items.filter((i) => i.correct).length;
  const accuracy = items.length > 0 ? correctCount / items.length : 0;
  const completed = safetyScore >= 40 && items.length > 0;
  const now = Date.now();

  const newRecords: GameRecords = {
    ...records,
    totalPlayCount: records.totalPlayCount + 1,
    totalCorrectCount: records.totalCorrectCount + correctCount,
    totalItemCount: records.totalItemCount + items.length,
    lastPlayTime: now,
  };

  const levelRecord = { ...newRecords.levelRecords[levelIndex] };
  levelRecord.playCount += 1;
  levelRecord.lastPlayTime = now;

  if (safetyScore > levelRecord.bestSafetyScore) {
    levelRecord.bestSafetyScore = safetyScore;
  }
  if (accuracy > levelRecord.bestAccuracy) {
    levelRecord.bestAccuracy = accuracy;
  }
  if (completed) {
    levelRecord.completed = true;
    if (supervisorReviews < levelRecord.bestSupervisorReviews) {
      levelRecord.bestSupervisorReviews = supervisorReviews;
    }
  }

  const stars = calculateStars(safetyScore, accuracy, supervisorReviews, completed);
  if (stars > levelRecord.stars) {
    levelRecord.stars = stars;
  }

  const wrongItemsMap = new Map<string, WrongItemRecord>();
  levelRecord.wrongItems.forEach((wi) => {
    wrongItemsMap.set(wi.itemId, { ...wi });
  });

  items
    .filter((i) => !i.correct)
    .forEach((item) => {
      const id = item.def.id;
      const existing = wrongItemsMap.get(id);
      if (existing) {
        existing.wrongCount += 1;
        existing.lastMisclassifiedCategory = ZONE_LABELS[item.assignedCategory];
      } else {
        wrongItemsMap.set(id, {
          itemId: id,
          itemLabel: item.def.label,
          wrongCount: 1,
          lastMisclassifiedCategory: ZONE_LABELS[item.assignedCategory],
        });
      }
    });

  levelRecord.wrongItems = Array.from(wrongItemsMap.values());

  newRecords.levelRecords = [...newRecords.levelRecords];
  newRecords.levelRecords[levelIndex] = levelRecord;

  return newRecords;
}

export function getGlobalAccuracy(records: GameRecords): number {
  if (records.totalItemCount === 0) return 0;
  return records.totalCorrectCount / records.totalItemCount;
}

export function getTopWrongItems(records: GameRecords, topN: number = 5): WrongItemRecord[] {
  const allWrong = new Map<string, WrongItemRecord>();

  records.levelRecords.forEach((lr) => {
    lr.wrongItems.forEach((wi) => {
      const existing = allWrong.get(wi.itemId);
      if (existing) {
        existing.wrongCount += wi.wrongCount;
        existing.lastMisclassifiedCategory = wi.lastMisclassifiedCategory;
      } else {
        allWrong.set(wi.itemId, { ...wi });
      }
    });
  });

  return Array.from(allWrong.values())
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, topN);
}

export function hasWrongItems(records: GameRecords): boolean {
  return records.levelRecords.some((lr) => lr.wrongItems.some((wi) => wi.wrongCount > 0));
}

export function formatTime(timestamp: number): string {
  if (timestamp === 0) return '暂无';
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}
