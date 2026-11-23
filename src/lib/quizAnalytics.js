import { supabase } from './supabase';

/**
 * Calculates authentic cohort benchmark analytics strictly from the database.
 * No hardcoded or fabricated candidate numbers.
 * 
 * @param {string} quizId - The actual Supabase quiz UUID
 * @param {number} studentScore - The student's obtained marks
 * @param {number} maxMarks - Total possible marks
 * @param {number} accuracy - Accuracy percentage
 */
export async function getQuizCohortAnalytics(quizId, studentScore, maxMarks, accuracy) {
  const currentScore = parseFloat(studentScore) || 0;
  const max = parseFloat(maxMarks) || 100;

  // Real DB state defaults for first or single candidate
  let scores = [currentScore];
  let totalCandidates = 1;
  let rank = 1;
  let topperScore = currentScore;
  let averageScore = currentScore;
  let percentile = 100;
  let isSingleCandidate = true;

  try {
    if (quizId) {
      // 1. Query quiz_attempts for genuine peer submissions on this test
      const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select('score, score_percent')
        .eq('quiz_id', quizId);

      let realAttempts = [];
      if (!error && attempts && attempts.length > 0) {
        realAttempts = attempts;
      } else {
        // Fallback: check user_quiz_attempts table
        const { data: uAttempts } = await supabase
          .from('user_quiz_attempts')
          .select('score_pct')
          .eq('quiz_id', quizId);
        
        if (uAttempts && uAttempts.length > 0) {
          realAttempts = uAttempts.map(u => ({
            score: (Number(u.score_pct || 0) / 100) * max,
            score_percent: Number(u.score_pct || 0)
          }));
        }
      }

      if (realAttempts.length > 0) {
        const dbScores = realAttempts
          .map(a => Number(a.score ?? (Number(a.score_percent || 0) / 100) * max))
          .filter(s => !isNaN(s) && isFinite(s));

        if (dbScores.length > 0) {
          scores = [...dbScores, currentScore];
          totalCandidates = scores.length;
          isSingleCandidate = false;

          topperScore = Number(Math.max(...scores).toFixed(1));
          const totalSum = scores.reduce((sum, val) => sum + val, 0);
          averageScore = Number((totalSum / scores.length).toFixed(1));

          // Strict competitive rank: count candidates who scored higher + 1
          const higherCount = scores.filter(s => s > currentScore).length;
          rank = higherCount + 1;

          // True Percentile: percentage of candidates who scored below current student
          const scoredBelow = scores.filter(s => s < currentScore).length;
          const tied = scores.filter(s => s === currentScore).length;
          const rawPercentile = ((scoredBelow + 0.5 * tied) / totalCandidates) * 100;
          percentile = Number(Math.min(100, Math.max(1, rawPercentile)).toFixed(1));
        }
      }
    }
  } catch (err) {
    console.warn('Real cohort analytics DB query notice:', err);
  }

  // Generate 5-bucket distribution histogram strictly from real scores
  const bucketCounts = [0, 0, 0, 0, 0];
  scores.forEach(s => {
    const pct = max > 0 ? (s / max) * 100 : 0;
    if (pct < 20) bucketCounts[0]++;
    else if (pct < 40) bucketCounts[1]++;
    else if (pct < 60) bucketCounts[2]++;
    else if (pct < 80) bucketCounts[3]++;
    else bucketCounts[4]++;
  });

  return {
    totalCandidates,
    rank,
    percentile,
    topperScore,
    averageScore,
    isSingleCandidate,
    distribution: bucketCounts,
    totalPeerAttempts: scores.length - 1
  };
}
