// PLACEHOLDER DECK — a single sample until the real decks are provided.
// Copy this file to add a deck, then register it in ../decks.js.

import sampleDeckBox from '../../../assets/images/deck-box-sample.png'

export default {
    // Stable and unique: Learning Track progress is saved under it
    // (deck_progress.deckId) — never rename a published deck's id.
    id: 'sample-deck',
    name: 'Name of the deck',
    keywords: ['Leadership', 'Leadership', 'Leadership'],
    cards: 30,
    // SAMPLE ART ONLY — shows third-party (Pokémon) artwork; replace with
    // the real Modus Genius deck images before going live.
    image: sampleDeckBox,
    // Earned when the Learning Track is completed: { name, image }.
    badge: null,
    // Appwrite property ids of the Learning Track, in unlock order.
    // Sample: existing "Agile" cards (OKR first).
    cardIds: [
        '699234fe003d81dfb83f', // OKR: Objectives Key Results
        '6949b8500024529c58c1', // 20/20 Vision
        '6949b850003d44b53892', // The Eisenhower Matrix
    ],
};
