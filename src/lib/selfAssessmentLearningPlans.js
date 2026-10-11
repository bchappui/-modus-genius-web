// Learning Plan decks and the 16 learning plans that use them.
//
// DECKS is the deck catalogue, keyed by a stable, unique deck id — the id
// Learning Track progress is saved under (deck_progress.deckId), so a deck
// keeps the same progress whichever profile's plan it's opened from.
//   Deck: { id, name, tags (3 skills), cards (count), image (box art),
//           cardIds (Appwrite property ids of its Learning Track, in unlock order) }
//
// LEARNING_PLANS maps each profile to the deck ids it recommends: any number
// of decks to reinforce its strengths and to work on its weaknesses.
//
// PLACEHOLDER CONTENT — a single sample deck until the real decks and each
// profile's selection are provided.

import sampleDeckBox from '../assets/images/deck-box-sample.png'

// Sample Learning Track: existing "Agile" cards (OKR first).
const SAMPLE_CARD_IDS = [
    '699234fe003d81dfb83f', // OKR: Objectives Key Results
    '6949b8500024529c58c1', // 20/20 Vision
    '6949b850003d44b53892', // The Eisenhower Matrix
];

export const DECKS = {
    'sample-deck': {
        id: 'sample-deck',
        name: 'Name of the deck',
        tags: ['Leadership', 'Leadership', 'Leadership'],
        cards: 30,
        // SAMPLE ART ONLY — shows third-party (Pokémon) artwork; replace with
        // the real Modus Genius deck images before going live.
        image: sampleDeckBox,
        cardIds: SAMPLE_CARD_IDS,
    },
};

const placeholderPlan = () => ({ strengths: ['sample-deck'], weaknesses: ['sample-deck'] });

export const LEARNING_PLANS = {
    INTJ: placeholderPlan(), INTP: placeholderPlan(), ENTJ: placeholderPlan(), ENTP: placeholderPlan(),
    INFJ: placeholderPlan(), INFP: placeholderPlan(), ENFJ: placeholderPlan(), ENFP: placeholderPlan(),
    ISTJ: placeholderPlan(), ISFJ: placeholderPlan(), ESTJ: placeholderPlan(), ESFJ: placeholderPlan(),
    ISTP: placeholderPlan(), ISFP: placeholderPlan(), ESTP: placeholderPlan(), ESFP: placeholderPlan(),
};

// A profile's plan with its deck ids resolved: { strengths: [deck], weaknesses: [deck] }.
export function getLearningPlan(type) {
    const plan = LEARNING_PLANS[type];
    if (!plan) return null;
    const resolve = (ids) => ids.map(id => DECKS[id]).filter(Boolean);
    return { strengths: resolve(plan.strengths), weaknesses: resolve(plan.weaknesses) };
}
