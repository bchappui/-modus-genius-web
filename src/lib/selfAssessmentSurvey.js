// Self-assessment survey content. Each step is one of:
//   { type: 'instruction', id, text }  — shown once at the start, practice pick on the scale
//   { type: 'question', id, text }     — answered on the 5-point LIKERT scale
//   { type: 'choice', id, text, options }  — pick one option (not counted in %)
//   { type: 'report', id }             — fake "creating your report" loader (auto-advances)
//   { type: 'email', id, text }        — email capture, pre-filled with the account's email
//   { type: 'interlude', id, slides }  — "Pub" break between blocks, one screen
//                                        per slide; skipped while it has none.
//                                        Slide kinds: 'message' { lines },
//                                        'quote' { text, author },
//                                        'fact' { number, text } and
//                                        'promo' { review } (see SelfAssessmentSurvey);
//                                        any slide can set hideProgress
// Completion % only counts questions (see getSurveyProgress).

const iconUrl = (id) => `https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/${id}/view?project=693e8acd001582e2562a`;

// Gold icons shared by SelfAssessmentPage's "What You Will Receive" and the
// survey's report loader. The plan (fist) PNG has much more transparent
// padding than the other two (art fills ~69% of its height vs ~94%), hence
// its scale to look the same size.
export const SA_ICONS = {
    report: { src: iconUrl('6ac2759c00095af83030') },
    plan:   { src: iconUrl('6ac2759c0009693424d0'), scale: 1.36 },
    badge:  { src: iconUrl('6ac2759c0009661ea125') },
};

// Gold icons for the results page. Each PNG has a different amount of
// transparent padding, so `scale` evens out their visible size in a tile.
export const SA_RESULT_ICONS = {
    fire:          { src: iconUrl('6ac3fef9001d17130851'), scale: 0.95 },
    earth:         { src: iconUrl('6ac3fef9001d1d950c6e'), scale: 1.05 },
    wind:          { src: iconUrl('6ac3fef9001d18994a03'), scale: 1.0 },
    water:         { src: iconUrl('6ac3fef9001d1344dc33'), scale: 1.0 },
    plus:          { src: iconUrl('6ac406a000129ea8dc45'), scale: 1.3 },
    minus:         { src: iconUrl('6ac400ca001c426402c1'), scale: 1.65 },
    check:         { src: iconUrl('6ac4034f000ab657d454'), scale: 1.35 },
    cross:         { src: iconUrl('6ac4034f000ab5b0f02d'), scale: 0.95 },
    conflicts:     { src: iconUrl('6ac403d900114bd07239'), scale: 1.75 }, // bomb
    stereotype:    { src: iconUrl('6ac403d9001142d8cc36'), scale: 2.0 },  // eye
    communication: { src: iconUrl('6ac403d90011449b392f'), scale: 1.8 },  // envelope
};

// One card illustration per profile (portrait 9:16, like the pop-up cards),
// shown above the profile title on the results page. Profiles without one
// yet show their element icon instead.
export const SA_CHARACTER_IMAGES = {
    INTJ: iconUrl('6ac7eda00029391aa264'),
};

// Curved arrow (pointing up-right) for the report loader's cycle, used as a
// CSS mask (so it can be painted gold). Masks are fetched in CORS mode; the
// extra `mask=1` param keeps that URL distinct from any plain <img> load of
// the same file, whose cached non-CORS copy would otherwise make the mask fail.
export const SA_ARROW_MASK_URL = `${iconUrl('6ac2aaa1002951846057')}&mask=1`;

export const LIKERT = [
    { value: 1, label: 'Strongly Disagree', fill: 'rgb(248,222,226)', ring: 'rgb(240,130,130)' },
    { value: 2, label: 'Disagree',          fill: 'rgb(248,230,224)', ring: 'rgb(245,170,120)' },
    { value: 3, label: 'Neutral',           fill: 'rgb(240,242,245)', ring: 'rgb(190,195,205)' },
    { value: 4, label: 'Agree',             fill: 'rgb(220,240,224)', ring: 'rgb(110,215,120)' },
    { value: 5, label: 'Strongly Agree',    fill: 'rgb(200,238,230)', ring: 'rgb(40,200,160)' },
];

export const SURVEY_STEPS = [
    { type: 'instruction', id: 'instructions', text: 'Choose how accurately each statement reflects you.' },
    { type: 'question', id: 'q1', text: 'You don’t like to draw attention to yourself and keep in the background.' },
    { type: 'question', id: 'q2', text: 'You have a careful and methodical approach to life.' },
    { type: 'question', id: 'q3', text: 'You like to get chores done right away rather than waiting.' },
    { type: 'question', id: 'q4', text: 'You lose interest in a conversation when it gets philosophical.' },
    { type: 'question', id: 'q5', text: 'You often forget to put things back in their proper place.' },
    { type: 'question', id: 'q6', text: 'You often have difficulty relating to people who let their emotions guide them.' },
    { type: 'question', id: 'q7', text: 'If your friend is sad, your first instinct is to support them emotionally, not try to solve their problem.' },
    { type: 'question', id: 'q8', text: 'If you make a mistake, you tend to start doubting yourself, your abilities, or your knowledge.' },
    {
        type: 'interlude', id: 'pub1', slides: [
            { kind: 'message', lines: ['A mistake isn’t a failure. It’s the beginning of learning.'] },
            {
                kind: 'promo',
                review: {
                    name: 'William F.',
                    // Unsplash License (free to use).
                    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=faces',
                    rating: 5,
                    title: 'Finally, I feel in control.',
                    text: 'I used to see mistakes as proof that I wasn’t good enough or didn’t know what I was doing. Modus Genius helped me step back and question that way of thinking. It’s made me much more confident in my ability to learn and improve.',
                },
            },
        ],
    },
    { type: 'question', id: 'q9', text: 'When it comes to making life-changing choices, you mostly listen to your heart rather than your head.' },
    { type: 'question', id: 'q10', text: 'You believe being straightforward is more important than protecting someone’s feelings.' },
    { type: 'question', id: 'q11', text: 'You often spend time exploring interesting ideas even if unrealistic.' },
    { type: 'question', id: 'q12', text: 'You often think about the meaning of life.' },
    { type: 'question', id: 'q13', text: 'You often think about what you should have said in a conversation long after it has taken place.' },
    { type: 'question', id: 'q14', text: 'You prefer having a rough list of ideas when traveling rather than planning out all the details.' },
    { type: 'question', id: 'q15', text: 'You rarely spend a lot of time thinking about past mistakes.' },
    { type: 'question', id: 'q16', text: 'You often make decisions on a whim.' },
    {
        type: 'interlude', id: 'pub2', slides: [
            { kind: 'fact', number: '77%', text: 'of decision-making scenarios were associated with cognitive biases that led to inaccurate decisions' },
            {
                kind: 'promo',
                review: {
                    name: 'Alicia S',
                    // Unsplash License (free to use) — photo by Jake Nackos.
                    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=96&h=96&fit=crop&crop=faces',
                    rating: 5,
                    title: 'So Useful!',
                    text: 'Modus Genius has completely changed the way I approach everyday decisions. The techniques are simple, practical, and actually help me think things through instead of just going with my gut. I use it all the time!',
                },
            },
        ],
    },
    { type: 'question', id: 'q17', text: 'You tend to avoid bustling and crowded events.' },
    { type: 'question', id: 'q18', text: 'You tend to daydream and get lost in your thoughts.' },
    { type: 'question', id: 'q19', text: 'You tend to initiate conversations and keep them going rather than rely on others.' },
    { type: 'question', id: 'q20', text: 'You tend to keep others at a distance and are hard to get to know.' },
    { type: 'question', id: 'q21', text: 'You would rather be diplomatic to protect someone’s feelings than upset them with the truth.' },
    { type: 'question', id: 'q22', text: 'You’d be bored if you spent the weekend by yourself.' },
    { type: 'question', id: 'q23', text: 'You’re able to control your cravings.' },
    { type: 'question', id: 'q24', text: 'Your emotions control you more than you control them.' },
    {
        type: 'interlude', id: 'pub3', slides: [
            { kind: 'message', lines: ['You’re in the right place!', 'Join 1,000+ people using Modus Genius to learn how to lead themselves and manage their emotions.'] },
            {
                kind: 'promo',
                review: {
                    name: 'Bruno K.',
                    // Unsplash License (free to use).
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces',
                    rating: 5,
                    title: 'Finally, I feel in control.',
                    text: 'I used to react to my emotions without even realizing it. Stress, frustration, and doubt would take over before I had a chance to think. Modus Genius helped me step back, understand what I was feeling, and choose how I wanted to respond.',
                },
            },
        ],
    },
    { type: 'question', id: 'q25', text: 'You see yourself as more of a realist than a visionary.' },
    { type: 'question', id: 'q26', text: 'You talk to a lot of different people at parties.' },
    { type: 'question', id: 'q27', text: 'Your mood can change very quickly.' },
    { type: 'question', id: 'q28', text: 'Your personal work style is closer to spontaneous bursts of energy than to organized and consistent efforts.' },
    { type: 'question', id: 'q29', text: 'You rarely talk about your feelings and emotions.' },
    { type: 'question', id: 'q30', text: 'You see things for what they realistically are rather than imagine what they could be.' },
    { type: 'interlude', id: 'outro', slides: [{ kind: 'message', lines: ['We’re almost there…'], hideProgress: true }] },
    {
        type: 'choice', id: 'goal', text: 'What do you hope to get out of this journey?', options: [
            'Connect with like-minded people',
            'Get certified and showcase my growth',
            'Become a better version of myself',
        ],
    },
    { type: 'report', id: 'report' },
    { type: 'email', id: 'email', text: 'Your Personal Profile Summary is ready!' },
    {
        type: 'interlude', id: 'closing', slides: [{
            kind: 'quote', hideProgress: true,
            text: 'Live as you were to die tomorrow. Learn as if you were to live forever.',
            author: 'Mahatma Gandhi.',
        }],
    },
];

// The screens actually shown, in order: each interlude slide becomes its own
// { type: 'slide' } screen, and slide-less interludes disappear.
export const SURVEY_SCREENS = SURVEY_STEPS.flatMap(step => step.type === 'interlude'
    ? step.slides.map((slide, i) => ({ type: 'slide', id: `${step.id}-${i}`, slide }))
    : [step]);

export function getSurveyProgress(answers) {
    const questions = SURVEY_STEPS.filter(s => s.type === 'question');
    if (!questions.length) return 0;
    const answered = questions.filter(q => answers[q.id] != null).length;
    return Math.round((answered / questions.length) * 100);
}
