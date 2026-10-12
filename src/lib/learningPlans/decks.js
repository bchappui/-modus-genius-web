// Deck catalogue, keyed by deck id. Each deck lives in its own file in
// ./decks/ — import it here to make it available to the learning plans.
//   Deck: { id, name, keywords, cards (count), image (box art),
//           badge ({ name, image } or null), cardIds (Learning Track, in unlock order) }

import sampleDeck from './decks/sample-deck.js'

const ALL_DECKS = [
    sampleDeck,
];

export const DECKS = Object.fromEntries(ALL_DECKS.map(deck => [deck.id, deck]));
