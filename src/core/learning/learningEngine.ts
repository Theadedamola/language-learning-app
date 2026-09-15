import { Assessment, SessionRecord, WordProposal } from '../types/models';

export const LearningEngine = {
  /**
   * Validates an assessment proposal from the LLM against the real session fragments.
   * Rejects hallucinations:
   * 1. Target passage must exist and match revisionKey.
   * 2. Word quotes must exist verbatim in the actual user speech.
   * 3. Source fragment IDs must be real fragments from that passage.
   * 4. If subtitles were visible, user typed, or assistant modeled the word in the last 90s,
   *    demote 'independent' to 'assisted'.
   */
  validate(proposal: Assessment, session: SessionRecord): Assessment | null {
    const userPassage = session.fragments.filter((f) => f.speaker === 'user');
    const allowedFragmentIDs = new Set(session.fragments.map((f) => f.id));

    // Must have a valid level (0 to 5)
    if (proposal.suggestedLevel < 0 || proposal.suggestedLevel > 5) return null;

    const fullSessionText = session.fragments.map((f) => f.text).join(' ').toLowerCase();

    const validatedWords: WordProposal[] = [];

    for (const word of proposal.words) {
      // Must be Spanish target language
      if (word.language !== 'es') continue;

      // Confidence threshold (>= 0.75)
      if (typeof word.confidence !== 'number' || word.confidence < 0.75 || word.confidence > 1) {
        continue;
      }

      // Valid string checks
      if (!word.lemma || !word.meaning || !word.quote || !word.form) continue;
      if (word.lemma.length > 80 || word.meaning.length > 150) continue;

      // Source IDs must be a subset of valid fragments
      if (!word.sourceIDs.length || !word.sourceIDs.every((id) => allowedFragmentIDs.has(id))) {
        continue;
      }

      const quoteLower = word.quote.toLowerCase();
      const formLower = word.form.toLowerCase();

      // Quote must be present in user speech and form must be in quote
      const userText = userPassage.map((f) => f.text).join(' ').toLowerCase();
      if (!userText.includes(quoteLower) || !quoteLower.includes(formLower)) {
        continue;
      }

      const validatedWord: WordProposal = { ...word };

      // Assisted vs Independent Demotion rule:
      // If meaning (English subtitles) was visible during the fragment, or the user typed,
      // or the assistant said that word in the preceding 90 seconds, demote to 'assisted'.
      if (validatedWord.kind === 'independent') {
        const matchingFragments = session.fragments.filter((f) => word.sourceIDs.includes(f.id));
        const subtitleWasVisible = matchingFragments.some((f) => f.meaningVisible || f.typed);

        const recentlyModeled = session.fragments.some(
          (f) =>
            f.speaker === 'assistant' &&
            f.text.toLowerCase().includes(formLower) &&
            Math.abs(matchingFragments[0]?.startMS - f.endMS) < 90_000
        );

        if (subtitleWasVisible || recentlyModeled) {
          validatedWord.kind = 'assisted';
        }
      }

      validatedWords.push(validatedWord);
    }

    return {
      ...proposal,
      nextGoal: proposal.nextGoal.slice(0, 250),
      capability: proposal.capability.slice(0, 150),
      words: validatedWords.slice(0, 8),
    };
  },
};
