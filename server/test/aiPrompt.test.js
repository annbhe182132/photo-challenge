import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeminiPrompt, SNAPDECK_SYSTEM_INSTRUCTION } from '../src/prompts/geminiChallengePrompt.js';
import { validateAndNormalizeAiResult } from '../src/controllers/aiController.js';

test('buildGeminiPrompt generates complete instructions with card details and matchPercentage', () => {
  const prompt = buildGeminiPrompt({
    cardTitle: 'Fashion Model Bàn Ăn',
    mission: 'Người bốc bài chọn 1 phụ kiện trên bàn để tạo dáng.',
    theme: 'Solo Pose & Style',
    difficulty: 3,
    xp: 30,
  });

  assert.ok(prompt.includes('Fashion Model Bàn Ăn'));
  assert.ok(prompt.includes('Solo Pose & Style'));
  assert.ok(prompt.includes('30'));
  assert.ok(prompt.includes('JSON'));
  assert.ok(prompt.includes('matchPercentage'));
  assert.ok(prompt.includes('50'));
});

test('SNAPDECK_SYSTEM_INSTRUCTION defines evaluation criteria and 50% threshold', () => {
  assert.ok(SNAPDECK_SYSTEM_INSTRUCTION.includes('SNAPDECK AI Judge'));
  assert.ok(SNAPDECK_SYSTEM_INSTRUCTION.includes('passed = true'));
  assert.ok(SNAPDECK_SYSTEM_INSTRUCTION.includes('passed = false'));
  assert.ok(SNAPDECK_SYSTEM_INSTRUCTION.includes('matchPercentage'));
  assert.ok(SNAPDECK_SYSTEM_INSTRUCTION.includes('50%'));
});

test('validateAndNormalizeAiResult accurately reflects varying match percentages', () => {
  // Test case 1: 85% -> Passed
  const highMatch = validateAndNormalizeAiResult({
    matchPercentage: 85,
    verdict: 'HOÀN THÀNH XUẤT SẮC',
    score: 85,
  });
  assert.equal(highMatch.matchPercentage, 85);
  assert.equal(highMatch.passed, true);

  // Test case 2: 73% -> Passed
  const customPass = validateAndNormalizeAiResult({
    matchPercentage: 73,
    score: 73,
  });
  assert.equal(customPass.matchPercentage, 73);
  assert.equal(customPass.passed, true);

  // Test case 3: 50% boundary -> Passed
  const boundaryPass = validateAndNormalizeAiResult({
    matchPercentage: 50,
  });
  assert.equal(boundaryPass.matchPercentage, 50);
  assert.equal(boundaryPass.passed, true);

  // Test case 4: 26% -> Failed (< 50%)
  const lowMatch = validateAndNormalizeAiResult({
    matchPercentage: 26,
    verdict: 'HOÀN THÀNH XUẤT SẮC', // Model nhầm lẫn nhưng validator phải sửa
  });
  assert.equal(lowMatch.matchPercentage, 26);
  assert.equal(lowMatch.passed, false);
  assert.equal(lowMatch.verdict, 'CHƯA ĐẠT YÊU CẦU');

  // Test case 5: 49% boundary -> Failed (< 50%)
  const boundaryFail = validateAndNormalizeAiResult({
    matchPercentage: 49,
    passed: true, // validator phải enforce < 50% là false
  });
  assert.equal(boundaryFail.matchPercentage, 49);
  assert.equal(boundaryFail.passed, false);
});
