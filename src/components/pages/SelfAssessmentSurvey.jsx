import React, { useState, useEffect } from 'react'
import { FiCheck } from 'react-icons/fi'
import { FaExclamation, FaCertificate, FaStar } from 'react-icons/fa'
import { LIKERT, SA_ICONS, SA_ARROW_MASK_URL, SURVEY_SCREENS, getSurveyProgress } from '../../lib/selfAssessmentSurvey.js'
import { sendSelfAssessmentToWebhook } from '../../lib/selfAssessmentWebhook.js'
import { fireFullPageConfetti, stopConfetti } from '../../lib/confetti.js'

// No real deck art for the promo slot yet — same placeholder-gradient
// convention as SelfAssessmentPage's PREVIEW_CARDS.
const PROMO_CARDS = [
    'linear-gradient(160deg, rgb(230,90,120) 0%, rgb(120,60,140) 100%)',
    'linear-gradient(160deg, rgb(60,190,170) 0%, rgb(30,90,120) 100%)',
    'linear-gradient(160deg, rgb(90,110,220) 0%, rgb(40,40,110) 100%)',
];

// Same stops as the .sa-rainbow text gradient, for filling SVG icons
// (referenced from CSS as url(#sa-rainbow-gradient)).
const RAINBOW_STOPS = ['#e8412c', '#f5941f', '#f7d038', '#6fbf4a', '#29c3c8', '#3f8ce8', '#9b6fe0', '#e15fc0'];
const RainbowGradientDef = () => (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
            <linearGradient id="sa-rainbow-gradient" x1="0" y1="0" x2="1" y2="1">
                {RAINBOW_STOPS.map((c, i) => (
                    <stop key={c} offset={`${(i / (RAINBOW_STOPS.length - 1)) * 100}%`} stopColor={c} />
                ))}
            </linearGradient>
        </defs>
    </svg>
);

const MessageSlide = ({ slide }) => (
    <h1 className="ep-headline sa-message">
        {slide.lines.map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>)}
    </h1>
);

const ChoiceStep = ({ screen, value, onChange }) => (
    <>
        <h1 className="ep-headline sa-survey-question sa-choice-question">{screen.text}</h1>
        <div className="sa-choices" role="radiogroup">
            {screen.options.map(option => {
                const selected = value === option;
                return (
                    <button
                        key={option}
                        className={`sa-choice${selected ? ' sa-choice--selected' : ''}`}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(option)}
                    >
                        <span className="sa-choice-circle">
                            {selected && <FiCheck className="sa-choice-check" strokeWidth={3.5} />}
                        </span>
                        <span className="sa-choice-label">{option}</span>
                    </button>
                );
            })}
        </div>
    </>
);

// The three arrows of the cycle, clockwise: report → plan → badge → report.
// Same source image (pointing up-right), positioned/rotated per gap.
const CYCLE_ARROWS = ['report-plan', 'plan-badge', 'badge-report'];

const REPORT_NODES = [
    { key: 'report', icon: SA_ICONS.report, label: 'Discover your strengths & weaknesses' },
    { key: 'plan',   icon: SA_ICONS.plan,   label: 'Build your skills' },
    // The shield reads smaller than the other two at equal height — bump it.
    { key: 'badge',  icon: { ...SA_ICONS.badge, scale: 1.25 }, label: 'Earn your digital badge' },
];

const LOADING_MS = 5000;

// The three-step cycle (Discover → Build → Earn) with curved arrows; a
// blinking ✓ marks each step listed in `done`. Shared by the report loader
// and the learning plan page.
export const SkillCycle = ({ done = [] }) => (
    <div className="sa-cycle">
        {CYCLE_ARROWS.map(key => (
            <span
                key={key}
                aria-hidden="true"
                className={`sa-cycle-arrow sa-cycle-arrow--${key}`}
                style={{ '--arrow-url': `url("${SA_ARROW_MASK_URL}")` }}
            />
        ))}
        {REPORT_NODES.map(node => (
            <div key={node.key} className={`sa-cycle-node sa-cycle-node--${node.key}`}>
                <div className="sa-cycle-icon-wrap">
                    {done.includes(node.key) && (
                        <span className="sa-cycle-done sa-blink"><FiCheck strokeWidth={3.5} /></span>
                    )}
                    <img
                        src={node.icon.src}
                        alt=""
                        className="sa-cycle-icon"
                        style={node.icon.scale ? { transform: `scale(${node.icon.scale})` } : undefined}
                    />
                </div>
                <span className="sa-benefit-title sa-cycle-label">{node.label}</span>
            </div>
        ))}
    </div>
);

// Fake loader: the bar fills to 100% over LOADING_MS, then onDone fires.
// Used for the personal report (end of survey) and the learning plan.
export const ReportStep = ({ onDone, title = 'Creating your personal report…', done = ['report'] }) => {
    const [percent, setPercent] = useState(0);

    useEffect(() => {
        const start = Date.now();
        const timer = setInterval(() => {
            const p = Math.min(100, Math.round(((Date.now() - start) / LOADING_MS) * 100));
            setPercent(p);
            if (p >= 100) clearInterval(timer);
        }, 50);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (percent < 100) return;
        const t = setTimeout(() => onDone?.(), 600);
        return () => clearTimeout(t);
    }, [percent, onDone]);

    return (
        <div className="sa-report">
            <h1 className="ep-headline sa-report-title sa-blink">{title}</h1>

            <SkillCycle done={done} />

            <div className="sa-progress sa-progress--bottom">
                <span className="sa-progress-label">{percent}%</span>
                <div className="sa-progress-track">
                    <div className="sa-progress-fill sa-progress-fill--instant" style={{ width: `${percent}%` }} />
                </div>
            </div>
        </div>
    );
};

const QuoteSlide = ({ slide }) => (
    <div className="sa-quote">
        <p className="ep-headline sa-quote-text">{slide.text}</p>
        <p className="ep-headline sa-quote-author">{slide.author}</p>
    </div>
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailStep = ({ screen, value, onChange, onSubmit }) => (
    <>
        <h1 className="ep-headline sa-message sa-email-title">{screen.text}</h1>
        <input
            className="sa-email-input"
            type="email"
            placeholder="Your Email Address…"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmit()}
            autoComplete="email"
        />
    </>
);

const FactSlide = ({ slide }) => (
    <>
        <h1 className="ep-headline sa-fact-line">Did you know?</h1>
        <p className="ep-headline sa-fact-line sa-fact-number sa-fact-number--xl">{slide.number}</p>
        <p className="ep-headline sa-fact-text sa-fact-text--wide">{slide.text}</p>
    </>
);

const PromoSlide = ({ slide, onUnlockDeck }) => {
    const { review } = slide;
    return (
        <>
            <RainbowGradientDef />
            <div className="sa-promo">
                <div className="sa-promo-deck">
                    <div className="sa-promo-cards" aria-hidden="true">
                        {PROMO_CARDS.map((gradient, i) => (
                            <div key={i} className="sa-promo-card" style={{ background: gradient }} />
                        ))}
                    </div>
                    <div className="sa-promo-overlay">
                        <button className="sa-start-btn sa-promo-unlock" onClick={onUnlockDeck}>
                            Access Now
                        </button>
                    </div>
                </div>
                <ul className="sa-promo-perks">
                    <li><span className="sa-promo-perk-icon"><FaExclamation size={16} /></span><span className="sa-rainbow">Available Now</span></li>
                    <li><span className="sa-promo-perk-icon"><FaCertificate size={18} /></span><span className="sa-rainbow">30 day satisfaction guarantee</span></li>
                    <li><span className="sa-promo-perk-icon"><FaStar size={16} /></span><span className="sa-rainbow">5 star reviews</span></li>
                </ul>
            </div>

            <div className="sa-review">
                <div className="sa-review-head">
                    <img src={review.avatar} alt="" className="sa-review-avatar" />
                    <span className="sa-review-name">{review.name}</span>
                    <span className="sa-review-stars" aria-label={`${review.rating} out of 5 stars`}>
                        {Array.from({ length: review.rating }, (_, i) => <FaStar key={i} size={20} />)}
                    </span>
                </div>
                <p className="sa-review-title">{review.title}</p>
                <p className="ep-subtext sa-review-text">“{review.text}”</p>
            </div>
        </>
    );
};

// The survey part of SelfAssessmentPage: one screen at a time, a progress bar
// on top (questions answered / total questions), and the same Continue button
// as the page's other steps. The instruction screen is a practice round on
// the same scale (its pick is kept apart from the real answers and never
// counted or sent); each question then takes the instruction's place
// above the scale; interlude slides ("Pub") sit between question blocks.
// onComplete gets the answers ({ q1..q30: 1..5, goal: option, email }) after
// the closing quote.
const SelfAssessmentSurvey = ({ onComplete, onUnlockDeck, defaultEmail = '' }) => {
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState({ email: defaultEmail });
    const [practicePick, setPracticePick] = useState(null);

    const screen = SURVEY_SCREENS[index];
    const isQuestion = screen.type === 'question';
    const isScale = isQuestion || screen.type === 'instruction';
    const needsAnswer = isScale || screen.type === 'choice';
    const scaleValue = isQuestion ? answers[screen.id] : practicePick;
    const setScaleValue = (v) => isQuestion
        ? setAnswers(a => ({ ...a, [screen.id]: v }))
        : setPracticePick(v);
    const progress = getSurveyProgress(answers);
    const canContinue = screen.type === 'email'
        ? EMAIL_RE.test((answers.email || '').trim())
        : !needsAnswer || (isScale ? scaleValue : answers[screen.id]) != null;
    const showProgress = !['report', 'email'].includes(screen.type) && !screen.slide?.hideProgress;

    // Same celebration as the congrats step when the profile summary is
    // ready; cleared as soon as the person moves on.
    useEffect(() => {
        if (screen.type !== 'email') return;
        fireFullPageConfetti();
        return stopConfetti;
    }, [screen.type]);

    const handleContinue = () => {
        if (!canContinue) return;
        // The email step is where the submission is complete enough to send
        // (answers + goal + email) — fire and forget, the survey carries on.
        if (screen.type === 'email') sendSelfAssessmentToWebhook(answers);
        if (index < SURVEY_SCREENS.length - 1) {
            setIndex(index + 1);
            window.scrollTo(0, 0);
        } else {
            onComplete?.(answers);
        }
    };

    return (
        <section className="sa-congrats sa-survey">
            {showProgress && (
                <div className="sa-progress">
                    <span className="sa-progress-label">{progress}%</span>
                    <div className="sa-progress-track">
                        <div className="sa-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {screen.type === 'choice' && (
                <ChoiceStep
                    screen={screen}
                    value={answers[screen.id]}
                    onChange={(v) => setAnswers(a => ({ ...a, [screen.id]: v }))}
                />
            )}
            {screen.type === 'report' && <ReportStep onDone={handleContinue} />}
            {screen.type === 'email' && (
                <EmailStep
                    screen={screen}
                    value={answers.email || ''}
                    onChange={(v) => setAnswers(a => ({ ...a, email: v }))}
                    onSubmit={handleContinue}
                />
            )}
            {screen.type === 'slide' && screen.slide.kind === 'quote' && <QuoteSlide slide={screen.slide} />}
            {screen.type === 'slide' && screen.slide.kind === 'message' && <MessageSlide slide={screen.slide} />}
            {screen.type === 'slide' && screen.slide.kind === 'fact' && <FactSlide slide={screen.slide} />}
            {screen.type === 'slide' && screen.slide.kind === 'promo' && <PromoSlide slide={screen.slide} onUnlockDeck={onUnlockDeck} />}

            {isScale && (
                <>
                    <h1 className="ep-headline sa-survey-question">{screen.text}</h1>
                    <div className="sa-likert" role="radiogroup">
                        {LIKERT.map(opt => {
                            const selected = scaleValue === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    className={`sa-likert-option${selected ? ' sa-likert-option--selected' : ''}`}
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => setScaleValue(opt.value)}
                                >
                                    <span
                                        className="sa-likert-circle"
                                        style={{ background: opt.fill, borderColor: opt.ring, '--ring': opt.ring }}
                                    >
                                        {selected && <FiCheck className="sa-likert-check" strokeWidth={3.5} />}
                                    </span>
                                    <span className="ep-subtext sa-likert-label">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {screen.type !== 'report' && (
                <button className="sa-continue-btn" onClick={handleContinue} disabled={!canContinue}>
                    Continue
                </button>
            )}
            {screen.type === 'email' && (
                <p className="sa-email-note">You’ll also get the Dropped Modus Genius newsletter for free. Unsubscribe anytime.</p>
            )}
        </section>
    );
};

export default SelfAssessmentSurvey;
