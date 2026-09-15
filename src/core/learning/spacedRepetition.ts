import { SessionRecord, WordProposal } from '../types/models';
import { LearnerState, WordState } from '../types/vocabulary';
import { LearningEngine } from './learningEngine';

export const SpacedRepetition = {
  /**
   * Projects the aggregate LearnerState from all historical sessions for a given language.
   */
  project(sessions: SessionRecord[], languageID: string = 'es', now: Date = new Date()): LearnerState {
    let challenge = 0;
    let observationCount = 0;
    let consecutiveSuccesses = 0;
    let nextGoal = 'Empieza saludando amablemente y haz una pregunta corta para escuchar al usuario.';
    const capabilitiesMap: Record<string, Set<string>> = {};
    const wordObservations: Record<string, Array<{ word: WordProposal; date: Date; context: string }>> = {};

    const filteredSessions = sessions
      .filter((s) => s.languageID === languageID)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    for (const session of filteredSessions) {
      const seenPassages = new Set<string>();

      for (const rawAssessment of session.assessments) {
        if (seenPassages.has(rawAssessment.passageID)) continue;
        seenPassages.add(rawAssessment.passageID);

        const assessment = LearningEngine.validate(rawAssessment, session);
        if (!assessment) continue;

        observationCount += 1;

        // Challenge level adjustments
        if (assessment.outcome === 'breakdown') {
          challenge = Math.max(0, challenge - 1);
          consecutiveSuccesses = 0;
        } else if (assessment.outcome === 'success') {
          consecutiveSuccesses += 1;
          if (consecutiveSuccesses >= 2) {
            challenge = Math.min(5, Math.max(challenge, Math.min(challenge + 1, assessment.suggestedLevel)));
            consecutiveSuccesses = 0;
          }
        } else {
          consecutiveSuccesses = 0;
        }

        if (assessment.nextGoal) {
          nextGoal = assessment.nextGoal;
        }

        const dateObj = new Date(assessment.createdAt);
        const dayStr = dateObj.toISOString().split('T')[0];

        if (assessment.outcome === 'success' && assessment.capability) {
          if (!capabilitiesMap[assessment.capability]) {
            capabilitiesMap[assessment.capability] = new Set();
          }
          capabilitiesMap[assessment.capability].add(`${dayStr}|${assessment.context}`);
        }

        const seenWordsThisTurn = new Set<string>();
        for (const word of assessment.words) {
          const key = `${word.language}|${word.lemma.trim().toLowerCase()}|${word.meaning.trim().toLowerCase()}`;
          if (seenWordsThisTurn.has(key)) continue;
          seenWordsThisTurn.add(key);

          if (!wordObservations[key]) {
            wordObservations[key] = [];
          }
          wordObservations[key].push({
            word,
            date: dateObj,
            context: assessment.context || 'general',
          });
        }
      }
    }

    // Compute WordStates with Recall Bars (0 to 3)
    const words: WordState[] = Object.entries(wordObservations).map(([key, observations]) => {
      const latest = observations[observations.length - 1];
      const independentObs = observations.filter((o) => o.word.kind === 'independent');
      const uniqueDays = new Set(independentObs.map((o) => o.date.toISOString().split('T')[0])).size;
      const uniqueContexts = new Set(independentObs.map((o) => o.context)).size;

      const firstRecallDate = independentObs[0]?.date;
      const lastRecallDate = independentObs[independentObs.length - 1]?.date;

      let bars = independentObs.length === 0 ? 0 : 1;

      // 2 bars: recalled on at least 2 distinct days
      if (uniqueDays >= 2) {
        bars = 2;
      }

      // 3 bars: recalled across >= 3 distinct days in >= 2 different contexts, spanning >= 7 days
      if (
        uniqueDays >= 3 &&
        uniqueContexts >= 2 &&
        firstRecallDate &&
        lastRecallDate &&
        lastRecallDate.getTime() - firstRecallDate.getTime() >= 7 * 86400 * 1000
      ) {
        bars = 3;
      }

      // Decay intervals in seconds: [1 day, 1 day, 4 days, 14 days]
      const intervalDays = [1, 1, 4, 14][bars];
      const baselineDate = lastRecallDate ?? latest.date;
      const dueAt = new Date(baselineDate.getTime() + intervalDays * 86400 * 1000);

      // If overdue and bars > 1, decay by 1 bar
      if (now.getTime() > dueAt.getTime() && bars > 1) {
        bars -= 1;
      }

      // If a lapse occurred after the last independent recall, cap at 1 bar
      const latestLapse = observations
        .filter((o) => o.word.kind === 'lapse')
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

      if (latestLapse && latestLapse.date.getTime() > (lastRecallDate?.getTime() ?? 0)) {
        bars = Math.min(bars, 1);
      }

      return {
        id: key,
        lemma: latest.word.lemma,
        meaning: latest.word.meaning,
        form: latest.word.form,
        example: latest.word.quote,
        bars,
        understandingCount: observations.filter((o) => o.word.kind === 'understanding').length,
        independentCount: independentObs.length,
        lastSeen: latest.date.toISOString(),
        dueAt: dueAt.toISOString(),
      };
    });

    // Sort words by most recently seen
    words.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    const capabilities = Object.entries(capabilitiesMap)
      .filter(([, evidenceSet]) => evidenceSet.size >= 3)
      .map(([cap]) => cap)
      .sort();

    return {
      challenge,
      observationCount,
      nextGoal,
      capabilities,
      words,
    };
  },
};
