export const TURN_DURATIONS = [0, 15, 30, 60];
export const ROUND_LIMITS = [0, 1, 3, 5, 10];

export const isValidTurnDuration = (seconds) => TURN_DURATIONS.includes(seconds);
export const isValidRoundLimit = (rounds) => ROUND_LIMITS.includes(rounds);
export const isValidGroupScore = (score) => Number.isInteger(score) && score >= 0 && score <= 100;
export const isGroupRatingApproval = (score) => score >= 50;
export const calculateGroupScore = (votes) => {
  const scores = votes
    .map((vote) => (
      isValidGroupScore(vote.score)
        ? vote.score
        : typeof vote.score === 'undefined' && typeof vote.approve === 'boolean'
          ? vote.approve ? 100 : 0
          : null
    ))
    .filter((score) => score !== null);
  if (!scores.length) return null;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
};

export const getTurnPosition = (turnIndex, playerCount) => {
  if (!Number.isInteger(turnIndex) || turnIndex < 0 || !Number.isInteger(playerCount) || playerCount < 1) {
    throw new RangeError('A turn requires a non-negative index and at least one player.');
  }
  return {
    playerIndex: turnIndex % playerCount,
    round: Math.floor(turnIndex / playerCount) + 1,
  };
};

export const isGameComplete = (nextTurnIndex, playerCount, roundLimit) => (
  roundLimit > 0 && nextTurnIndex >= playerCount * roundLimit
);

export const buildTurnTransition = ({
  turnIndex,
  playerCount,
  roundLimit,
  status,
  score = 0,
  resolvedAt = new Date(),
}) => {
  if (!['completed', 'failed', 'timed_out', 'skipped'].includes(status)) {
    throw new Error('A turn can advance only after reaching a terminal state.');
  }
  const current = getTurnPosition(turnIndex, playerCount);
  const nextTurnIndex = turnIndex + 1;
  const next = getTurnPosition(nextTurnIndex, playerCount);
  const completed = isGameComplete(nextTurnIndex, playerCount, roundLimit);
  return {
    currentRound: current.round,
    currentPlayerIndex: current.playerIndex,
    nextTurnIndex,
    nextRound: completed ? roundLimit : next.round,
    nextPlayerIndex: completed ? null : next.playerIndex,
    gameStatus: completed ? 'completed' : 'active',
    // A new turn stays unstarted until its player confirms a live camera feed.
    turnStartedAt: null,
    turnDeadline: null,
    turnRecord: {
      turnIndex,
      round: current.round,
      status,
      score: status === 'completed' ? Math.max(0, score) : 0,
      resolvedAt: new Date(resolvedAt),
    },
  };
};

export const getTurnDeadline = (startedAt, durationSeconds) => (
  durationSeconds === 0 ? null : new Date(new Date(startedAt).getTime() + durationSeconds * 1000)
);

export const canAcceptTurnSubmission = (now, deadline) => !deadline || new Date(now) <= new Date(deadline);

export const shouldExpireTurn = (now, deadline, hasPendingSubmission) => (
  Boolean(deadline) && new Date(now) >= new Date(deadline) && !hasPendingSubmission
);

export const canSubmitForTurn = ({
  playerId,
  activePlayerId,
  turnIndex,
  activeTurnIndex,
  now = new Date(),
  deadline = null,
  hasActiveSubmission = false,
}) => (
  playerId === activePlayerId
  && turnIndex === activeTurnIndex
  && !hasActiveSubmission
  && canAcceptTurnSubmission(now, deadline)
);

export const calculateApprovalThreshold = (eligibleVoterCount) => {
  if (!Number.isFinite(eligibleVoterCount) || eligibleVoterCount <= 0) {
    return 0;
  }

  return Math.ceil((eligibleVoterCount * 2) / 3);
};

export const isApprovalReached = (yesVotes, eligibleVoterCount) => {
  const requiredVotes = calculateApprovalThreshold(eligibleVoterCount);
  return yesVotes >= requiredVotes;
};

export const getVotingDecision = ({ yesVotes, votesCast, eligibleVoterCount }) => {
  const requiredVotes = calculateApprovalThreshold(eligibleVoterCount);
  if (requiredVotes === 0) return 'rejected';
  if (yesVotes >= requiredVotes) return 'approved';
  if (yesVotes + eligibleVoterCount - votesCast < requiredVotes) return 'rejected';
  return 'pending';
};

export const canVote = (submitterId, voterId) => submitterId !== voterId;

export const buildScoreBreakdown = ({
  basePoints = 0,
  photoBonus = 0,
  creativityBonus = 0,
} = {}) => {
  const cappedCreativityBonus = Math.max(0, Math.min(10, creativityBonus));
  const total = basePoints + photoBonus + cappedCreativityBonus;

  return {
    basePoints,
    photoBonus,
    creativityBonus: cappedCreativityBonus,
    total,
  };
};

export const buildApprovedScore = ({ photoBonusEnabled, hasEvidence }) => (
  buildScoreBreakdown({
    basePoints: 100,
    photoBonus: photoBonusEnabled && hasEvidence ? 20 : 0,
  })
);
