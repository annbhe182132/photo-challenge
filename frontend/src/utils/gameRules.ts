export type ScoreBreakdown = {
  basePoints: number;
  photoBonus: number;
  creativityBonus: number;
  total: number;
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
  photoEvidence: 'off' | 'optional' | 'required',
  hasEvidence: boolean,
): ScoreBreakdown => buildScoreBreakdown({
  basePoints: 100,
  photoBonus: photoBonusEnabled && photoEvidence !== 'off' && hasEvidence ? 20 : 0,
});
