// Self-assessment scoring: Likert answers (1..5) → one of the 16 profiles
// (E/I, S/N, T/F, J/P) + Four Elements percentages, strengths, weaknesses.
//
// 24 of the 30 questions each measure one axis and lean toward one pole of
// it ("Agree" pushes toward that pole) — 6 per axis. The other 6 (q8, q13,
// q15, q23, q24, q27: self-doubt, mood, self-control) measure confidence
// rather than a letter, so they're asked but don't count toward the profile.
import { REPORTS } from './selfAssessmentReports.js'
// Likert → points: Strongly Disagree −2 … Neutral 0 … Strongly Agree +2.

export const AXES = {
    EI: ['E', 'I'],
    SN: ['S', 'N'],
    TF: ['T', 'F'],
    JP: ['J', 'P'],
};

// questionId → [axis, pole that "Agree" points to]
export const QUESTION_KEYS = {
    q1:  ['EI', 'I'], // don't like drawing attention, keep in the background
    q2:  ['JP', 'J'], // careful and methodical approach
    q3:  ['JP', 'J'], // chores done right away
    q4:  ['SN', 'S'], // lose interest when it gets philosophical
    q5:  ['JP', 'P'], // forget to put things back
    q6:  ['TF', 'T'], // hard to relate to people led by emotions
    q7:  ['TF', 'F'], // support a sad friend emotionally first
    q9:  ['TF', 'F'], // life choices: heart over head
    q10: ['TF', 'T'], // straightforward over protecting feelings
    q11: ['SN', 'N'], // exploring ideas even if unrealistic
    q12: ['SN', 'N'], // meaning of life
    q14: ['JP', 'P'], // rough list rather than detailed plan
    q16: ['JP', 'P'], // decisions on a whim
    q17: ['EI', 'I'], // avoid bustling, crowded events
    q18: ['SN', 'N'], // daydream, lost in thoughts
    q19: ['EI', 'E'], // initiate conversations
    q20: ['EI', 'I'], // keep others at a distance
    q21: ['TF', 'F'], // diplomatic to protect feelings
    q22: ['EI', 'E'], // bored by a weekend alone
    q25: ['SN', 'S'], // realist rather than visionary
    q26: ['EI', 'E'], // talk to many people at parties
    q28: ['JP', 'P'], // spontaneous bursts over organized effort
    q29: ['TF', 'T'], // rarely talk about feelings
    q30: ['SN', 'S'], // see things as they are
};

// On an exact tie (sum 0) the axis falls back to this pole.
const TIE_BREAK = { EI: 'I', SN: 'N', TF: 'F', JP: 'P' };

export const PERSONALITIES = {
    INTJ: 'Mastermind', INTP: 'Genius',    ENTJ: 'Commander',  ENTP: 'Challenger',
    INFJ: 'Guardian',   INFP: 'Peacemaker', ENFJ: 'Hero',      ENFP: 'Crusader',
    ISTJ: 'Realist',    ISFJ: 'Protector', ESTJ: 'Executive',  ESFJ: 'Ambassador',
    ISTP: 'Artisan',    ISFP: 'Artist',    ESTP: 'Rebel',      ESFP: 'Performer',
};

// Four Elements: each is made of two letters; 2 present = 100%, 1 = 50%, 0 = 0%.
export const ELEMENTS = {
    fire:  { name: 'Fire',  color: 'red',    letters: ['E', 'T'], description: 'Tends to be highly driven, formal, efficient, and structured.' },
    earth: { name: 'Earth', color: 'green',  letters: ['S', 'F'], description: 'Tends to value personal relationships, with a relaxed, friendly, and informal style.' },
    wind:  { name: 'Wind',  color: 'yellow', letters: ['F', 'N'], description: 'Tends to be energetic, innovative, and friendly.' },
    water: { name: 'Water', color: 'blue',   letters: ['I', 'T'], description: 'Tends to be structured, organized, functional, and formal.' },
};

export const ELEMENT_TRAITS = {
    fire: {
        strengths: ['Confident', 'Determined', 'Thrives on challenges', 'Focused', 'Influential'],
        weaknesses: ['Poor listening skills', 'Sometimes perceived as arrogant', 'Expects too much from others', 'Does not seek others’ opinions'],
    },
    earth: {
        strengths: ['Builds genuine and lasting relationships', 'Attentive, supportive, warm, and dependable'],
        weaknesses: ['Slow to adapt', 'Struggles to make decisions', 'Finds it difficult to say no', 'Too sensitive to others’ difficulties'],
    },
    wind: {
        strengths: ['Builds relationships quickly', 'Friendly and sociable', 'Adaptable and imaginative', 'A talented speaker'],
        weaknesses: ['Too easily distracted', 'Sometimes too laid-back', 'Weak planning and follow-through', 'Sometimes struggles to turn ideas into action'],
    },
    water: {
        strengths: ['Well-informed', 'Attention to detail', 'Impression of competence', 'Relevant questions', 'Thorough project follow-up'],
        weaknesses: ['Difficult initial contact', 'Sometimes blunt questioning', 'Does not always consider others’ feelings', 'Sometimes focuses too much on unimportant details'],
    },
};

export function getElementPercentages(type) {
    return Object.fromEntries(Object.entries(ELEMENTS).map(([key, el]) => {
        const matches = el.letters.filter(l => type.includes(l)).length;
        return [key, (matches / el.letters.length) * 100];
    }));
}

// Answers that land exactly on `type` (Strongly Agree toward its letters,
// Strongly Disagree otherwise) — used by the dev results preview.
export function answersForType(type) {
    return Object.fromEntries(Object.entries(QUESTION_KEYS)
        .map(([qid, [, pole]]) => [qid, type.includes(pole) ? 5 : 1]));
}

// answers: { q1..q30: 1..5 } → full result.
export function scoreSelfAssessment(answers) {
    const sums = Object.fromEntries(Object.keys(AXES).map(axis => [axis, 0]));
    const counts = { ...sums };

    Object.entries(QUESTION_KEYS).forEach(([qid, [axis, pole]]) => {
        const value = answers[qid];
        if (value == null) return;
        const points = value - 3; // −2..+2 toward `pole`
        sums[axis] += pole === AXES[axis][0] ? points : -points;
        counts[axis] += 1;
    });

    // Per axis: winning letter + how strongly (50..100%) it won.
    const axes = Object.fromEntries(Object.entries(AXES).map(([axis, [first, second]]) => {
        const sum = sums[axis];
        const max = counts[axis] * 2 || 1;
        const letter = sum > 0 ? first : sum < 0 ? second : TIE_BREAK[axis];
        const percent = Math.round(50 + (Math.abs(sum) / max) * 50);
        return [axis, { letter, percent }];
    }));

    const type = Object.keys(AXES).map(axis => axes[axis].letter).join('');
    const elements = getElementPercentages(type);
    // Every type has exactly one element at 100% — its headline element
    // (e.g. "Guardian (Wind)"), which also gives its strengths and weaknesses.
    const mainElement = Object.keys(elements).find(key => elements[key] === 100);

    return {
        type,                               // e.g. 'INFJ'
        name: PERSONALITIES[type],          // e.g. 'Guardian'
        axes,                               // { EI: { letter, percent }, … }
        elements,                           // { fire: 0, earth: 50, wind: 100, water: 50 }
        mainElement,                        // 'wind'
        strengths: ELEMENT_TRAITS[mainElement].strengths,
        weaknesses: ELEMENT_TRAITS[mainElement].weaknesses,
        report: REPORTS[type],              // { about, do, dont, conflicts, stereotype, communication }
    };
}
