// Learning Plans: the deck catalogue (./decks.js) and the 16 profiles' plans
// (./plans.js). Pages read them only through getLearningPlan.

import { DECKS } from './decks.js'
import { LEARNING_PLANS } from './plans.js'

export { DECKS, LEARNING_PLANS };

// A profile's plan with its deck ids resolved: { strengths: [deck], weaknesses: [deck] }.
// Unknown ids are skipped (with a warning in dev).
export function getLearningPlan(type) {
    const plan = LEARNING_PLANS[type];
    if (!plan) return null;
    const resolve = (ids) => ids.map(id => {
        if (!DECKS[id] && import.meta.env.DEV) console.warn(`Learning plan ${type}: unknown deck "${id}"`);
        return DECKS[id];
    }).filter(Boolean);
    return { strengths: resolve(plan.strengths), weaknesses: resolve(plan.weaknesses) };
}
