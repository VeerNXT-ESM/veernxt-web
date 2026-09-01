/**
 * src/components/quiz/scoring.js
 *
 * Scoring utilities ported from QuizMaster
 */

/**
 * Calculates points for a single answered question
 */
export function calculateQuestionScore(
  isCorrect,
  difficulty,
  timeSpent,
  timeLimit,
  currentStreak
) {
  if (!isCorrect) {
    return {
      basePoints: 0,
      speedBonus: 0,
      streakBonus: 0,
      totalPoints: 0,
    };
  }

  // Base points by difficulty
  let basePoints = 100;
  const diffClean = (difficulty || 'medium').toLowerCase();
  if (diffClean === 'medium') basePoints = 150;
  if (diffClean === 'hard') basePoints = 220;

  // Speed bonus: if timed mode, award up to 50% extra based on how quickly answered
  let speedBonus = 0;
  if (timeLimit > 0 && timeSpent < timeLimit) {
    const timeRatio = (timeLimit - timeSpent) / timeLimit;
    speedBonus = Math.round(basePoints * 0.5 * Math.max(0, Math.min(1, timeRatio)));
  }

  // Streak bonus: 10% bonus per streak point (capped at 50%)
  const streakMultiplier = Math.min(currentStreak * 0.1, 0.5);
  const streakBonus = Math.round(basePoints * streakMultiplier);

  const totalPoints = basePoints + speedBonus + streakBonus;

  return {
    basePoints,
    speedBonus,
    streakBonus,
    totalPoints,
  };
}

export function getRankTier(accuracy, score, totalQuestions) {
  const averagePointsPerQ = score / (totalQuestions || 1);

  if (accuracy >= 95 && averagePointsPerQ >= 150) {
    return {
      title: 'Grandmaster',
      badge: 'SS',
      description: 'Flawless precision & lightning speed execution.',
    };
  }
  if (accuracy >= 85) {
    return {
      title: 'Master',
      badge: 'S',
      description: 'Exceptional command over the subject matter.',
    };
  }
  if (accuracy >= 70) {
    return {
      title: 'Adept',
      badge: 'A',
      description: 'Strong foundation with sharp problem-solving instincts.',
    };
  }
  if (accuracy >= 50) {
    return {
      title: 'Scholar',
      badge: 'B',
      description: 'Solid knowledge base with clear potential for growth.',
    };
  }
  return {
    title: 'Apprentice',
    badge: 'C',
    description: 'Keep practicing to master these core concepts.',
  };
}
