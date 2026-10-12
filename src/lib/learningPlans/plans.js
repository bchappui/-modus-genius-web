// The 16 learning plans: each profile's recommended deck ids, any number of
// decks to reinforce its strengths and to work on its weaknesses.
// A deck can appear in several plans (and in both lists) — its progress is shared.
//
// PLACEHOLDER — every profile uses the sample deck until each selection is provided.

const placeholderPlan = () => ({ strengths: ['sample-deck'], weaknesses: ['sample-deck'] });

export const LEARNING_PLANS = {
    INTJ: placeholderPlan(), INTP: placeholderPlan(), ENTJ: placeholderPlan(), ENTP: placeholderPlan(),
    INFJ: placeholderPlan(), INFP: placeholderPlan(), ENFJ: placeholderPlan(), ENFP: placeholderPlan(),
    ISTJ: placeholderPlan(), ISFJ: placeholderPlan(), ESTJ: placeholderPlan(), ESFJ: placeholderPlan(),
    ISTP: placeholderPlan(), ISFP: placeholderPlan(), ESTP: placeholderPlan(), ESFP: placeholderPlan(),
};
