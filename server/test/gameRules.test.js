import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApprovedScore,
  buildScoreBreakdown,
  buildTurnTransition,
  canSubmitForTurn,
  canAcceptTurnSubmission,
  calculateApprovalThreshold,
  calculateGroupScore,
  canVote,
  getTurnDeadline,
  getTurnPosition,
  isGameComplete,
  isValidRoundLimit,
  isValidTurnDuration,
  getVotingDecision,
  isGroupRatingApproval,
  isValidGroupScore,
  shouldExpireTurn,
} from '../src/utils/gameRules.js';
import { createPlayerToken, hashPlayerToken, verifyPlayerToken } from '../src/utils/playerAuth.js';

test('two-thirds approval threshold rounds up and handles two-player groups', () => {
  assert.equal(calculateApprovalThreshold(0), 0);
  assert.equal(calculateApprovalThreshold(1), 1);
  assert.equal(calculateApprovalThreshold(2), 2);
  assert.equal(calculateApprovalThreshold(3), 2);
  assert.equal(calculateApprovalThreshold(4), 3);
});

test('a two-player submission is decided by its only eligible reviewer', () => {
  assert.equal(getVotingDecision({ yesVotes: 1, votesCast: 1, eligibleVoterCount: 1 }), 'approved');
  assert.equal(getVotingDecision({ yesVotes: 0, votesCast: 1, eligibleVoterCount: 1 }), 'rejected');
});

test('voting rejects self-review and waits while approval remains possible', () => {
  assert.equal(canVote('author', 'reviewer'), true);
  assert.equal(canVote('author', 'author'), false);
  assert.equal(getVotingDecision({ yesVotes: 1, votesCast: 2, eligibleVoterCount: 3 }), 'pending');
  assert.equal(getVotingDecision({ yesVotes: 1, votesCast: 3, eligibleVoterCount: 3 }), 'rejected');
  assert.equal(getVotingDecision({ yesVotes: 2, votesCast: 2, eligibleVoterCount: 3 }), 'approved');
});

test('group ratings accept only whole-number scores from 0 through 100', () => {
  for (const score of [0, 50, 80, 100]) assert.equal(isValidGroupScore(score), true);
  for (const score of [-1, 101, 50.5, '50']) assert.equal(isValidGroupScore(score), false);
  assert.equal(isGroupRatingApproval(49), false);
  assert.equal(isGroupRatingApproval(50), true);
});

test('group score averages new ratings and reads legacy approve votes without migration', () => {
  assert.equal(calculateGroupScore([]), null);
  assert.equal(calculateGroupScore([{ score: 0 }, { score: 100 }]), 50);
  assert.equal(calculateGroupScore([{ approve: true }, { approve: false }]), 50);
  assert.equal(calculateGroupScore([{ approve: true }, { score: 80 }]), 90);
});

test('score breakdown caps creativity and does not add absent photo bonuses', () => {
  assert.deepEqual(buildScoreBreakdown({ basePoints: 100 }), {
    basePoints: 100,
    photoBonus: 0,
    creativityBonus: 0,
    total: 100,
  });
  assert.deepEqual(buildScoreBreakdown({ basePoints: 100, photoBonus: 20, creativityBonus: 30 }), {
    basePoints: 100,
    photoBonus: 20,
    creativityBonus: 10,
    total: 130,
  });
});

test('player tokens authenticate only the player who holds the secret', () => {
  const token = createPlayerToken();
  const storedHash = hashPlayerToken(token);

  assert.equal(verifyPlayerToken(token, storedHash), true);
  assert.equal(verifyPlayerToken(createPlayerToken(), storedHash), false);
  assert.equal(verifyPlayerToken(undefined, storedHash), false);
});

test('photo bonus depends only on the enabled bonus and an actual evidence photo', () => {
  const score = (hasEvidence, photoBonusEnabled = true) => buildApprovedScore({ photoBonusEnabled, hasEvidence });
  assert.equal(score(false).total, 100);
  assert.equal(score(true).total, 120);
  assert.equal(score(true, false).total, 100);
});

test('turn timer and round presets accept only supported choices including unlimited', () => {
  for (const seconds of [0, 15, 30, 60]) assert.equal(isValidTurnDuration(seconds), true);
  for (const seconds of [-1, 10, 45, '30']) assert.equal(isValidTurnDuration(seconds), false);
  for (const rounds of [0, 3, 5, 10]) assert.equal(isValidRoundLimit(rounds), true);
  for (const rounds of [1, 4, 24, '5']) assert.equal(isValidRoundLimit(rounds), false);
});

test('round-robin turn order gives every player one turn before repeating', () => {
  const playerIds = ['an', 'binh', 'chi', 'dung'];
  const order = Array.from({ length: 8 }, (_, turnIndex) => {
    const { playerIndex, round } = getTurnPosition(turnIndex, playerIds.length);
    return `${round}:${playerIds[playerIndex]}`;
  });

  assert.deepEqual(order, [
    '1:an', '1:binh', '1:chi', '1:dung',
    '2:an', '2:binh', '2:chi', '2:dung',
  ]);
  assert.throws(() => getTurnPosition(-1, 4), RangeError);
});

test('finite games end after all player turns; unlimited games do not end by turn count', () => {
  assert.equal(isGameComplete(11, 2, 5), true);
  assert.equal(isGameComplete(9, 2, 5), false);
  assert.equal(isGameComplete(10, 2, 5), true);
  assert.equal(isGameComplete(1000, 2, 0), false);
});

test('turn deadlines accept timely submissions and never discard accepted pending verification', () => {
  const startedAt = new Date('2026-01-01T00:00:00Z');
  const deadline = getTurnDeadline(startedAt, 30);
  assert.equal(deadline.toISOString(), '2026-01-01T00:00:30.000Z');
  assert.equal(getTurnDeadline(startedAt, 0), null);
  assert.equal(canAcceptTurnSubmission('2026-01-01T00:00:29Z', deadline), true);
  assert.equal(canAcceptTurnSubmission('2026-01-01T00:00:31Z', deadline), false);
  assert.equal(shouldExpireTurn('2026-01-01T00:00:31Z', deadline, false), true);
  assert.equal(shouldExpireTurn('2026-01-01T00:00:31Z', deadline, true), false);
});

test('timed-out turns award no completion points', () => {
  assert.equal(buildScoreBreakdown({ basePoints: 0 }).total, 0);
});

test('turn submissions require the active player, matching turn index, available slot, and valid deadline', () => {
  const valid = {
    playerId: 'an',
    activePlayerId: 'an',
    turnIndex: 4,
    activeTurnIndex: 4,
    now: '2026-01-01T00:00:10Z',
    deadline: '2026-01-01T00:00:30Z',
  };
  assert.equal(canSubmitForTurn(valid), true);
  assert.equal(canSubmitForTurn({ ...valid, playerId: 'binh' }), false);
  assert.equal(canSubmitForTurn({ ...valid, turnIndex: 3 }), false);
  assert.equal(canSubmitForTurn({ ...valid, hasActiveSubmission: true }), false);
  assert.equal(canSubmitForTurn({ ...valid, now: '2026-01-01T00:00:31Z' }), false);
});

test('turn transition records the resolved turn and leaves the next turn unstarted', () => {
  const beforeRoundEnd = buildTurnTransition({
    turnIndex: 2,
    playerCount: 4,
    roundLimit: 5,
    turnDurationSeconds: 30,
    status: 'completed',
    score: 120,
    resolvedAt: '2026-01-01T00:00:00Z',
  });
  assert.equal(beforeRoundEnd.turnRecord.round, 1);
  assert.equal(beforeRoundEnd.turnRecord.score, 120);
  assert.equal(beforeRoundEnd.nextTurnIndex, 3);
  assert.equal(beforeRoundEnd.nextRound, 1);
  assert.equal(beforeRoundEnd.nextPlayerIndex, 3);
  assert.equal(beforeRoundEnd.turnStartedAt, null);
  assert.equal(beforeRoundEnd.turnDeadline, null);

  const afterRoundEnd = buildTurnTransition({
    turnIndex: 3,
    playerCount: 4,
    roundLimit: 5,
    turnDurationSeconds: 30,
    status: 'failed',
  });
  assert.equal(afterRoundEnd.turnRecord.score, 0);
  assert.equal(afterRoundEnd.nextRound, 2);
  assert.equal(afterRoundEnd.nextPlayerIndex, 0);
  assert.equal(afterRoundEnd.turnStartedAt, null);
  assert.equal(afterRoundEnd.turnDeadline, null);
});

test('pending verification cannot be advanced as a terminal turn state', () => {
  assert.throws(() => buildTurnTransition({
    turnIndex: 0,
    playerCount: 2,
    roundLimit: 5,
    turnDurationSeconds: 30,
    status: 'pending',
  }), /terminal state/);
});
