import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeminiPrompt, SNAPDECK_SYSTEM_INSTRUCTION } from '../src/prompts/geminiChallengePrompt.js';

test('buildGeminiPrompt generates complete instructions with card details', () => {
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
});

test('SNAPDECK_SYSTEM_INSTRUCTION defines evaluation criteria', () => {
  assert.ok(SNAPDECK_SYSTEM_INSTRUCTION.includes('SNAPDECK AI Judge'));
  assert.ok(SNAPDECK_SYSTEM_INSTRUCTION.includes('passed = true'));
  assert.ok(SNAPDECK_SYSTEM_INSTRUCTION.includes('passed = false'));
});
