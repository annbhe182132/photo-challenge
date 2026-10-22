export type ScoreBreakdown = {
  basePoints: number;
  photoBonus: number;
  creativityBonus: number;
  total: number;
};

export const isValidGroupScore = (score: unknown): score is number => (
  typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 100
);

export const isGroupRatingApproval = (score: number): boolean => score >= 50;

export const calculateGroupScore = (votes: Array<{ score?: number; approve?: boolean }>): number | null => {
  const scores = votes
    .map((vote) => (
      isValidGroupScore(vote.score)
        ? vote.score
        : typeof vote.score === 'undefined' && typeof vote.approve === 'boolean'
          ? vote.approve ? 100 : 0
          : null
    ))
    .filter((score): score is number => score !== null);
  if (!scores.length) return null;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
};

export const calculateApprovalThreshold = (eligibleVoterCount: number): number => {
  if (!Number.isFinite(eligibleVoterCount) || eligibleVoterCount <= 0) {
    return 0;
  }

  return Math.ceil((eligibleVoterCount * 2) / 3);
};

export const isApprovalReached = (yesVotes: number, eligibleVoterCount: number): boolean => {
  const requiredVotes = calculateApprovalThreshold(eligibleVoterCount);
  return yesVotes >= requiredVotes;
};

export const getVotingDecision = ({
  yesVotes,
  votesCast,
  eligibleVoterCount,
}: {
  yesVotes: number;
  votesCast: number;
  eligibleVoterCount: number;
}): 'pending' | 'approved' | 'rejected' => {
  const requiredVotes = calculateApprovalThreshold(eligibleVoterCount);
  if (requiredVotes === 0) return 'rejected';
  if (yesVotes >= requiredVotes) return 'approved';
  if (yesVotes + eligibleVoterCount - votesCast < requiredVotes) return 'rejected';
  return 'pending';
};

export const canVote = (submitterId: string, voterId: string): boolean => submitterId !== voterId;

export const buildScoreBreakdown = ({
  basePoints = 0,
  photoBonus = 0,
  creativityBonus = 0,
}: {
  basePoints?: number;
  photoBonus?: number;
  creativityBonus?: number;
} = {}): ScoreBreakdown => {
  const cappedCreativityBonus = Math.max(0, Math.min(10, creativityBonus));
  const total = basePoints + photoBonus + cappedCreativityBonus;

  return {
    basePoints,
    photoBonus,
    creativityBonus: cappedCreativityBonus,
    total,
  };
};

export const buildApprovedScore = (
  photoBonusEnabled: boolean,
  hasEvidence: boolean,
): ScoreBreakdown => buildScoreBreakdown({
  basePoints: 100,
  photoBonus: photoBonusEnabled && hasEvidence ? 20 : 0,
});
