import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LearningEngine } from './learningEngine';
import { SpacedRepetition } from './spacedRepetition';
import { SessionRecord, Assessment, Fragment } from '../types/models';

describe('LearningEngine & SpacedRepetition', () => {
  const sampleFragment: Fragment = {
    id: 'frag_1',
    revision: 0,
    previousTexts: [],
    speaker: 'user',
    text: 'Quiero un café con leche por favor.',
    startMS: 1000,
    endMS: 3000,
    receivedAt: new Date().toISOString(),
    meaningVisible: false,
    typed: false,
  };

  const sampleSession: SessionRecord = {
    id: 'session_1',
    languageID: 'es',
    startedAt: new Date('2026-09-01T10:00:00Z').toISOString(),
    endedAt: new Date('2026-09-01T10:15:00Z').toISOString(),
    themeID: 'coffee',
    title: 'Un café en el barrio',
    fragments: [sampleFragment],
    assessments: [],
    translations: {},
    topics: [],
    voiceSeconds: 60,
    inputTokens: 100,
    outputTokens: 150,
  };

  it('validates genuine user vocabulary and accepts independent production', () => {
    const rawAssessment: Assessment = {
      passageID: 'frag_1',
      revisionKey: 'frag_1:0',
      outcome: 'success',
      suggestedLevel: 1,
      nextGoal: 'Practicar pedidos cotidianos',
      capability: 'Can order drinks in a cafe',
      words: [
        {
          lemma: 'el café',
          meaning: 'coffee',
          form: 'café',
          quote: 'un café con leche',
          language: 'es',
          kind: 'independent',
          confidence: 0.95,
          sourceIDs: ['frag_1'],
        },
      ],
      createdAt: new Date('2026-09-01T10:14:00Z').toISOString(),
      context: 'coffee',
    };

    const validated = LearningEngine.validate(rawAssessment, sampleSession);
    assert.ok(validated !== null);
    assert.equal(validated.words.length, 1);
    assert.equal(validated.words[0].lemma, 'el café');
    assert.equal(validated.words[0].kind, 'independent');
  });

  it('demotes independent production to assisted if meaning subtitles were visible', () => {
    const sessionWithSubtitles: SessionRecord = {
      ...sampleSession,
      fragments: [{ ...sampleFragment, meaningVisible: true }],
    };

    const rawAssessment: Assessment = {
      passageID: 'frag_1',
      revisionKey: 'frag_1:0',
      outcome: 'success',
      suggestedLevel: 1,
      nextGoal: 'Practicar pedidos cotidianos',
      capability: 'Can order drinks in a cafe',
      words: [
        {
          lemma: 'el café',
          meaning: 'coffee',
          form: 'café',
          quote: 'un café con leche',
          language: 'es',
          kind: 'independent',
          confidence: 0.95,
          sourceIDs: ['frag_1'],
        },
      ],
      createdAt: new Date('2026-09-01T10:14:00Z').toISOString(),
      context: 'coffee',
    };

    const validated = LearningEngine.validate(rawAssessment, sessionWithSubtitles);
    assert.ok(validated !== null);
    assert.equal(validated.words[0].kind, 'assisted');
  });

  it('rejects hallucinated words not present in the user passage', () => {
    const hallucinatedAssessment: Assessment = {
      passageID: 'frag_1',
      revisionKey: 'frag_1:0',
      outcome: 'success',
      suggestedLevel: 1,
      nextGoal: 'Test',
      capability: 'Test',
      words: [
        {
          lemma: 'la cerveza',
          meaning: 'beer',
          form: 'cerveza',
          quote: 'una cerveza fría', // Not in sampleFragment text
          language: 'es',
          kind: 'independent',
          confidence: 0.9,
          sourceIDs: ['frag_1'],
        },
      ],
      createdAt: new Date().toISOString(),
      context: 'coffee',
    };

    const validated = LearningEngine.validate(hallucinatedAssessment, sampleSession);
    assert.ok(validated !== null);
    assert.equal(validated.words.length, 0); // Rejection of hallucination
  });

  it('correctly calculates 0 to 3 recall bars across spaced sessions', () => {
    // Session 1: Day 1
    const session1: SessionRecord = {
      ...sampleSession,
      id: 's1',
      startedAt: '2026-09-01T10:00:00Z',
      assessments: [
        {
          passageID: 'frag_1',
          revisionKey: 'frag_1:0',
          outcome: 'success',
          suggestedLevel: 1,
          nextGoal: 'Seguir así',
          capability: 'Cafe orders',
          words: [
            {
              lemma: 'el café',
              meaning: 'coffee',
              form: 'café',
              quote: 'un café con leche',
              language: 'es',
              kind: 'independent',
              confidence: 0.95,
              sourceIDs: ['frag_1'],
            },
          ],
          createdAt: '2026-09-01T10:05:00Z',
          context: 'coffee',
        },
      ],
    };

    // After 1 recall -> 1 bar
    const learner1 = SpacedRepetition.project([session1], 'es', new Date('2026-09-01T12:00:00Z'));
    assert.equal(learner1.words[0].bars, 1);

    // Session 2: Day 2 (Different day)
    const session2: SessionRecord = {
      ...session1,
      id: 's2',
      startedAt: '2026-09-02T10:00:00Z',
      assessments: [
        {
          ...session1.assessments[0],
          createdAt: '2026-09-02T10:05:00Z',
        },
      ],
    };

    // After recall on 2 distinct days -> 2 bars
    const learner2 = SpacedRepetition.project([session1, session2], 'es', new Date('2026-09-02T12:00:00Z'));
    assert.equal(learner2.words[0].bars, 2);

    // Session 3: Day 9 (>= 7 days span, 3rd day, 2nd context: 'tapas')
    const session3: SessionRecord = {
      ...session1,
      id: 's3',
      startedAt: '2026-09-09T10:00:00Z',
      assessments: [
        {
          ...session1.assessments[0],
          createdAt: '2026-09-09T10:05:00Z',
          context: 'tapas',
        },
      ],
    };

    // After 3 distinct days, 2 contexts, spanning >= 7 days -> 3 bars (Steady/Mastered)
    const learner3 = SpacedRepetition.project([session1, session2, session3], 'es', new Date('2026-09-09T12:00:00Z'));
    assert.equal(learner3.words[0].bars, 3);
  });
});
