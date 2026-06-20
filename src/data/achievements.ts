import { AchievementDef, GameRecords, LevelResult } from '../types';
import { LEVELS } from './levels';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_camp_elementary',
    title: '初出茅庐',
    description: '首次完成启蒙营挑战',
    icon: '🎈',
    category: 'camp',
    condition: (records: GameRecords) => {
      const lr = records.levelRecords[0];
      return lr && lr.completed && lr.playCount >= 1;
    },
  },
  {
    id: 'first_camp_middle',
    title: '渐入佳境',
    description: '首次完成探索营挑战',
    icon: '🔭',
    category: 'camp',
    condition: (records: GameRecords) => {
      const lr = records.levelRecords[1];
      return lr && lr.completed && lr.playCount >= 1;
    },
  },
  {
    id: 'first_camp_international',
    title: '环球旅行家',
    description: '首次完成环球营挑战',
    icon: '🌍',
    category: 'camp',
    condition: (records: GameRecords) => {
      const lr = records.levelRecords[2];
      return lr && lr.completed && lr.playCount >= 1;
    },
  },
  {
    id: 'perfect_inspection',
    title: '火眼金睛',
    description: '单局零主管复核且安全分≥90',
    icon: '👁️',
    category: 'skill',
    condition: (records: GameRecords, currentResult) => {
      if (!currentResult || currentResult.isWrongPractice) return false;
      return currentResult.supervisorReviews === 0 && currentResult.safetyScore >= 90;
    },
  },
  {
    id: 'accuracy_master',
    title: '精准达人',
    description: '全局准确率≥85%（累计30件以上）',
    icon: '🎯',
    category: 'skill',
    condition: (records: GameRecords) => {
      if (records.totalItemCount < 30) return false;
      if (records.totalItemCount === 0) return false;
      return records.totalCorrectCount / records.totalItemCount >= 0.85;
    },
  },
  {
    id: 'zero_mistakes',
    title: '错题清零',
    description: '所有物品的错题计数均为0',
    icon: '✅',
    category: 'collection',
    condition: (records: GameRecords) => {
      return records.levelRecords.every((lr) =>
        lr.wrongItems.every((wi) => wi.wrongCount === 0)
      );
    },
  },
  {
    id: 'player_20',
    title: '勤奋学员',
    description: '累计完成20场挑战',
    icon: '🏃',
    category: 'collection',
    condition: (records: GameRecords) => {
      return records.totalPlayCount >= 20;
    },
  },
  {
    id: 'player_50',
    title: '训练狂人',
    description: '累计完成50场挑战',
    icon: '💪',
    category: 'collection',
    condition: (records: GameRecords) => {
      return records.totalPlayCount >= 50;
    },
  },
  {
    id: 'quick_judge',
    title: '闪电快判',
    description: '单局速判（2秒内正确）≥8次',
    icon: '⚡',
    category: 'skill',
    condition: (records: GameRecords, currentResult) => {
      if (!currentResult || currentResult.isWrongPractice) return false;
      return (currentResult as any).quickJudgments >= 8;
    },
  },
  {
    id: 'all_two_stars',
    title: '三星预备役',
    description: '三个关卡均达到★★评价',
    icon: '⭐',
    category: 'special',
    condition: (records: GameRecords) => {
      return records.levelRecords.every((lr) => lr.stars >= 2);
    },
  },
  {
    id: 'single_three_star',
    title: '初露锋芒',
    description: '任意关卡达到★★★评价',
    icon: '🌟',
    category: 'special',
    condition: (records: GameRecords) => {
      return records.levelRecords.some((lr) => lr.stars >= 3);
    },
  },
  {
    id: 'item_100',
    title: '百物通',
    description: '累计检查100件物品',
    icon: '📦',
    category: 'collection',
    condition: (records: GameRecords) => {
      return records.totalItemCount >= 100;
    },
  },
  {
    id: 'all_three_stars',
    title: '全三星大师',
    description: '三个关卡全部达到★★★评价',
    icon: '🏆',
    category: 'special',
    condition: (records: GameRecords) => {
      return records.levelRecords.every((lr) => lr.stars >= 3);
    },
  },
];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<string, string> = {
  camp: '营地徽章',
  skill: '技能徽章',
  collection: '收集徽章',
  special: '特殊徽章',
};
