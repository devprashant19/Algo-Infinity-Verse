// backend/services/revision.service.js

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_INTERVALS = [1, 3, 7, 14, 30];
export const MIN_INTERVAL = 1;
export const MAX_INTERVAL = 365;
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;
export const PASS_THRESHOLD = 60;
export const LEECH_THRESHOLD = 5;
export const MIN_EASE_FACTOR = 0.7;
export const MAX_EASE_FACTOR = 1.3;

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DIFFICULTY_MULTIPLIERS = {
  Easy: 1.3,
  Medium: 1.0,
  Hard: 0.7,
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate current stage
 * @param {any} stage - Stage to validate
 * @returns {Object} - { valid: boolean, error: string, value: number }
 */
function validateStage(stage) {
  if (stage === undefined || stage === null) {
    return {
      valid: false,
      error: 'currentStage is required.',
    };
  }

  const numStage = Number(stage);
  if (isNaN(numStage)) {
    return {
      valid: false,
      error: 'currentStage must be a number.',
    };
  }

  if (!Number.isInteger(numStage)) {
    return {
      valid: false,
      error: 'currentStage must be an integer.',
    };
  }

  if (numStage < 0) {
    return {
      valid: false,
      error: `currentStage must be a non-negative integer. Received: ${numStage}`,
    };
  }

  return { valid: true, value: numStage };
}

/**
 * Validate score percentage
 * @param {any} score - Score to validate
 * @returns {Object} - { valid: boolean, error: string, value: number }
 */
function validateScore(score) {
  if (score === undefined || score === null) {
    return {
      valid: true,
      value: 100,
    };
  }

  const numScore = Number(score);
  if (isNaN(numScore)) {
    return {
      valid: false,
      error: 'scorePercentage must be a number.',
    };
  }

  if (numScore < MIN_SCORE || numScore > MAX_SCORE) {
    return {
      valid: false,
      error: `scorePercentage must be between ${MIN_SCORE} and ${MAX_SCORE}. Received: ${numScore}`,
    };
  }

  return { valid: true, value: numScore };
}

/**
 * Validate difficulty
 * @param {any} difficulty - Difficulty to validate
 * @returns {Object} - { valid: boolean, error: string, value: string }
 */
function validateDifficulty(difficulty) {
  if (!difficulty) {
    return {
      valid: true,
      value: 'Medium',
    };
  }

  const normalized = String(difficulty).toLowerCase();
  const found = VALID_DIFFICULTIES.find((d) => d.toLowerCase() === normalized);

  if (!found) {
    return {
      valid: false,
      error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}. Received: ${difficulty}`,
    };
  }

  return { valid: true, value: found };
}

/**
 * Validate boolean flags
 * @param {any} value - Value to validate as boolean
 * @param {string} name - Field name for error message
 * @returns {Object} - { valid: boolean, error: string, value: boolean }
 */
function validateBoolean(value, name) {
  if (value === undefined || value === null) {
    return { valid: true, value: false };
  }

  if (typeof value !== 'boolean') {
    return {
      valid: false,
      error: `${name} must be a boolean. Received: ${typeof value}`,
    };
  }

  return { valid: true, value: value };
}

/**
 * Validate intervals array
 * @param {Array} intervals - Intervals to validate
 * @returns {Object} - { valid: boolean, error: string, value: Array }
 */
function validateIntervals(intervals) {
  if (!Array.isArray(intervals) || intervals.length === 0) {
    return {
      valid: false,
      error: 'Intervals must be a non-empty array.',
    };
  }

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    if (typeof interval !== 'number' || !Number.isInteger(interval) || interval < MIN_INTERVAL) {
      return {
        valid: false,
        error: `Interval at index ${i} must be a positive integer. Received: ${interval}`,
      };
    }
    if (interval > MAX_INTERVAL) {
      return {
        valid: false,
        error: `Interval at index ${i} cannot exceed ${MAX_INTERVAL}. Received: ${interval}`,
      };
    }
  }

  return { valid: true, value: intervals };
}

// ============================================
// REVISION SERVICE CLASS
// ============================================

export class RevisionService {
  constructor(intervals = DEFAULT_INTERVALS) {
    const validation = validateIntervals(intervals);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    this.intervals = validation.value;

    this.stats = {
      totalReviews: 0,
      correctReviews: 0,
      incorrectReviews: 0,
      skippedReviews: 0,
      totalScore: 0,
      difficultyBreakdown: {
        Easy: 0,
        Medium: 0,
        Hard: 0,
      },
    };

    this.leechMap = new Map();
  }

  calculateNext(currentSchedule = {}, options = {}) {
    try {
      const stageValidation = validateStage(currentSchedule.currentStage);
      if (!stageValidation.valid) {
        throw new Error(stageValidation.error);
      }
      const stage = stageValidation.value;

      const scoreValidation = validateScore(options.scorePercentage);
      if (!scoreValidation.valid) {
        throw new Error(scoreValidation.error);
      }
      const scorePercentage = scoreValidation.value;

      const difficultyValidation = validateDifficulty(options.difficulty);
      if (!difficultyValidation.valid) {
        throw new Error(difficultyValidation.error);
      }
      const difficulty = difficultyValidation.value;

      const isIncorrectValidation = validateBoolean(options.isIncorrect, 'isIncorrect');
      if (!isIncorrectValidation.valid) {
        throw new Error(isIncorrectValidation.error);
      }
      const isIncorrect = isIncorrectValidation.value;

      const isSkipValidation = validateBoolean(options.isSkip, 'isSkip');
      if (!isSkipValidation.valid) {
        throw new Error(isSkipValidation.error);
      }
      const isSkip = isSkipValidation.value;

      this.stats.totalReviews++;
      this.stats.totalScore += scorePercentage;
      this.stats.difficultyBreakdown[difficulty] =
        (this.stats.difficultyBreakdown[difficulty] || 0) + 1;

      if (isSkip) {
        this.stats.skippedReviews++;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 1);
        return {
          nextStage: stage,
          intervalDays: 1,
          nextReviewDate: nextDate.toISOString(),
          isLeech: false,
        };
      }

      if (isIncorrect || scorePercentage < PASS_THRESHOLD) {
        this.stats.incorrectReviews++;

        const topic = currentSchedule.topic || 'unknown';
        const failures = (this.leechMap.get(topic) || 0) + 1;
        this.leechMap.set(topic, failures);

        const isLeech = failures >= LEECH_THRESHOLD;

        if (isLeech) {
          console.log(
            `[RevisionService] Leech detected for topic: ${topic} (${failures} failures)`
          );
        }

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 1);
        return {
          nextStage: isLeech ? 0 : stage,
          intervalDays: 1,
          nextReviewDate: nextDate.toISOString(),
          isLeech: isLeech,
        };
      }

      this.stats.correctReviews++;

      const nextStage = Math.min(this.intervals.length - 1, stage + 1);
      let baseInterval = this.intervals[nextStage] || 1;

      let difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;

      let scoreMultiplier = 1.0;
      if (scorePercentage >= 90) {
        scoreMultiplier = 1.5;
      } else if (scorePercentage >= 80) {
        scoreMultiplier = 1.2;
      } else if (scorePercentage >= 70) {
        scoreMultiplier = 1.0;
      } else if (scorePercentage >= 60) {
        scoreMultiplier = 0.8;
      }

      let intervalDays = Math.round(baseInterval * difficultyMultiplier * scoreMultiplier);
      intervalDays = Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, intervalDays));

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + intervalDays);

      return {
        nextStage,
        intervalDays,
        nextReviewDate: nextDate.toISOString(),
        isLeech: false,
      };
    } catch (error) {
      console.error('[RevisionService] Error in calculateNext:', error);
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 1);
      return {
        nextStage: 0,
        intervalDays: 1,
        nextReviewDate: nextDate.toISOString(),
        isLeech: false,
        error: error.message,
      };
    }
  }

  calculateBatch(cards, options = {}) {
    if (!Array.isArray(cards) || cards.length === 0) {
      return [];
    }

    return cards.map((card, index) => {
      try {
        const result = this.calculateNext(card, options);
        return {
          index,
          ...card,
          ...result,
          success: true,
        };
      } catch (error) {
        console.error(`[RevisionService] Batch error at index ${index}:`, error);
        return {
          index,
          ...card,
          nextStage: 0,
          intervalDays: 1,
          nextReviewDate: new Date().toISOString(),
          isLeech: false,
          success: false,
          error: error.message,
        };
      }
    });
  }

  getStats() {
    const total = this.stats.totalReviews || 0;
    const correct = this.stats.correctReviews || 0;
    const incorrect = this.stats.incorrectReviews || 0;

    const leecherTopics = [];
    const entries = this.leechMap.entries();
    for (const entry of entries) {
      if (entry[1] >= LEECH_THRESHOLD) {
        leecherTopics.push(entry[0]);
      }
    }

    return {
      ...this.stats,
      accuracy: total > 0 ? (correct / total) * 100 : 0,
      retention: total > 0 ? ((total - incorrect) / total) * 100 : 0,
      totalLeechers: this.leechMap.size,
      leecherTopics: leecherTopics,
      averageScore: total > 0 ? this.stats.totalScore / total : 0,
    };
  }

  getLeechMap() {
    return new Map(this.leechMap);
  }

  resetLeechCounter(topic) {
    if (this.leechMap.has(topic)) {
      this.leechMap.delete(topic);
      console.log(`[RevisionService] Reset leech counter for topic: ${topic}`);
    }
  }

  resetStats() {
    this.stats = {
      totalReviews: 0,
      correctReviews: 0,
      incorrectReviews: 0,
      skippedReviews: 0,
      totalScore: 0,
      difficultyBreakdown: {
        Easy: 0,
        Medium: 0,
        Hard: 0,
      },
    };
    this.leechMap.clear();
    console.log('[RevisionService] Stats reset successfully');
  }

  getIntervals() {
    return [...this.intervals];
  }

  setIntervals(intervals) {
    const validation = validateIntervals(intervals);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    this.intervals = validation.value;
    console.log('[RevisionService] Intervals updated:', this.intervals);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const defaultRevisionService = new RevisionService();

export function calculateNextRevision(currentSchedule, options) {
  return defaultRevisionService.calculateNext(currentSchedule, options);
}

export function calculateBatchRevisions(cards, options) {
  return defaultRevisionService.calculateBatch(cards, options);
}

export function getRevisionStats() {
  return defaultRevisionService.getStats();
}

export default {
  RevisionService,
  defaultRevisionService,
  calculateNextRevision,
  calculateBatchRevisions,
  getRevisionStats,
  VALID_DIFFICULTIES,
  DIFFICULTY_MULTIPLIERS,
  DEFAULT_INTERVALS,
};
