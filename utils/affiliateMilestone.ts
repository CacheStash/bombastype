/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Affiliate Creator Milestone Rewards Engine
 * Calculates non-stacking psychological milestone rewards:
 * $100 Gross -> 10% OFF
 * $300 Gross -> 20% OFF
 * $500 Gross -> 30% OFF
 * $1000 Gross -> 50% OFF (Resets cycle after $1,000)
 */

export interface MilestoneTier {
  threshold: number;
  discountPercent: number;
  label: string;
}

export const MILESTONE_TIERS: MilestoneTier[] = [
  { threshold: 100, discountPercent: 10, label: '10% OFF' },
  { threshold: 300, discountPercent: 20, label: '20% OFF' },
  { threshold: 500, discountPercent: 30, label: '30% OFF' },
  { threshold: 1000, discountPercent: 50, label: '50% OFF' }
];

export interface MilestoneRewardInfo {
  totalGrossSales: number;
  currentCycle: number;
  cycleGrossSales: number;
  activeDiscountPercent: number;
  rawTier: number;
  nextThreshold: number | null;
  nextDiscountPercent: number | null;
  amountNeededForNext: number;
  unlockedTierLabel: string | null;
  warningMessage: string | null;
  claimedInCurrentTier: boolean;
  cycleProgressPercent: number;
}

export function calculateAffiliateMilestone(
  totalGrossSales: number,
  claimedTiersForCycle: number[] = []
): MilestoneRewardInfo {
  const safeGross = Math.max(0, Number(totalGrossSales) || 0);
  const currentCycle = Math.floor(safeGross / 1000);
  const cycleGrossSales = safeGross % 1000;

  let rawTier = 0;
  let nextThreshold: number | null = 100;
  let nextDiscountPercent: number | null = 10;
  let warningMessage: string | null = null;
  let unlockedTierLabel: string | null = null;

  if (safeGross > 0 && cycleGrossSales === 0) {
    // Exactly at $1,000, $2,000, etc.
    rawTier = 50;
    nextThreshold = null;
    nextDiscountPercent = null;
    unlockedTierLabel = '50% OFF (Ultimate Creator Tier)';
    warningMessage = '🏆 50% OFF Maximum Reward Unlocked! Claim your 50% discount before your next referral resets the cycle counter!';
  } else if (cycleGrossSales >= 500) {
    rawTier = 30;
    nextThreshold = 1000;
    nextDiscountPercent = 50;
    unlockedTierLabel = '30% OFF';
    const gap = (1000 - cycleGrossSales).toFixed(2);
    warningMessage = `🔥 You have unlocked 30% OFF! Use it before reaching $1,000 (50% OFF) — previous discounts do not stack! ($${gap} more to 50% OFF)`;
  } else if (cycleGrossSales >= 300) {
    rawTier = 20;
    nextThreshold = 500;
    nextDiscountPercent = 30;
    unlockedTierLabel = '20% OFF';
    const gap = (500 - cycleGrossSales).toFixed(2);
    warningMessage = `🔥 You have unlocked 20% OFF! Use it before reaching $500 (30% OFF) — previous discounts do not stack! ($${gap} more to 30% OFF)`;
  } else if (cycleGrossSales >= 100) {
    rawTier = 10;
    nextThreshold = 300;
    nextDiscountPercent = 20;
    unlockedTierLabel = '10% OFF';
    const gap = (300 - cycleGrossSales).toFixed(2);
    warningMessage = `🔥 You have unlocked 10% OFF! Use it before reaching $300 (20% OFF) — previous discounts do not stack! ($${gap} more to 20% OFF)`;
  } else {
    rawTier = 0;
    nextThreshold = 100;
    nextDiscountPercent = 10;
    const gap = (100 - cycleGrossSales).toFixed(2);
    warningMessage = `Generate $${gap} more in referral sales to unlock your first 10% OFF personal discount reward!`;
  }

  const claimed = claimedTiersForCycle.includes(rawTier);
  const activeDiscountPercent = claimed ? 0 : rawTier;
  const amountNeededForNext = nextThreshold ? Math.max(0, nextThreshold - cycleGrossSales) : 0;
  const cycleProgressPercent = Math.min(100, (cycleGrossSales / 1000) * 100);

  return {
    totalGrossSales: safeGross,
    currentCycle,
    cycleGrossSales,
    activeDiscountPercent,
    rawTier,
    nextThreshold,
    nextDiscountPercent,
    amountNeededForNext,
    unlockedTierLabel,
    warningMessage: claimed ? null : warningMessage,
    claimedInCurrentTier: claimed,
    cycleProgressPercent
  };
}

export function getClaimedMilestones(affiliateId: string, currentCycle: number): number[] {
  try {
    const raw = localStorage.getItem(`aff_reward_claimed_${affiliateId}_cycle_${currentCycle}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export function markMilestoneClaimed(affiliateId: string, currentCycle: number, tier: number): void {
  try {
    const existing = getClaimedMilestones(affiliateId, currentCycle);
    if (!existing.includes(tier)) {
      existing.push(tier);
      localStorage.setItem(`aff_reward_claimed_${affiliateId}_cycle_${currentCycle}`, JSON.stringify(existing));
    }
  } catch (_) {}
}

export interface EarningBadgeInfo {
  level: number;
  label: string;
  minGross: number;
  nextMinGross: number | null;
  hasEarned: boolean;
  totalGrossSales: number;
}

export const EARNING_BADGE_LEVELS = [
  { level: 1, threshold: 100, label: 'Level 1 Creator ($100+ Gross)' },
  { level: 2, threshold: 500, label: 'Level 2 Creator ($500+ Gross)' },
  { level: 3, threshold: 1000, label: 'Level 3 Creator ($1,000+ Gross)' },
  { level: 4, threshold: 2500, label: 'Level 4 Creator ($2,500+ Gross)' },
  { level: 5, threshold: 5000, label: 'Level 5 Creator ($5,000+ Gross)' },
  { level: 6, threshold: 10000, label: 'Level 6 Creator ($10,000+ Gross)' },
  { level: 7, threshold: 25000, label: 'Level 7 Creator ($25,000+ Gross)' },
  { level: 8, threshold: 50000, label: 'Level 8 Creator ($50,000+ Gross)' },
  { level: 9, threshold: 100000, label: 'Level 9 Creator ($100,000+ Gross)' },
  { level: 10, threshold: 250000, label: 'Level 10 Creator ($250,000+ Gross)' }
];

export function getAffiliateEarningBadge(totalGrossSales: number): EarningBadgeInfo {
  const safeGross = Math.max(0, Number(totalGrossSales) || 0);
  let currentLevel = 0;
  let currentLabel = 'New Creator';
  let minGross = 0;
  let nextMinGross: number | null = EARNING_BADGE_LEVELS[0].threshold;

  for (let i = 0; i < EARNING_BADGE_LEVELS.length; i++) {
    if (safeGross >= EARNING_BADGE_LEVELS[i].threshold) {
      currentLevel = EARNING_BADGE_LEVELS[i].level;
      currentLabel = EARNING_BADGE_LEVELS[i].label;
      minGross = EARNING_BADGE_LEVELS[i].threshold;
      nextMinGross = EARNING_BADGE_LEVELS[i + 1]?.threshold || null;
    } else {
      if (currentLevel === 0) {
        nextMinGross = EARNING_BADGE_LEVELS[i].threshold;
      }
      break;
    }
  }

  return {
    level: currentLevel,
    label: currentLabel,
    minGross,
    nextMinGross,
    hasEarned: currentLevel > 0,
    totalGrossSales: safeGross
  };
}
