import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import { ELEMENTS } from '../../lib/selfAssessmentScoring.js'
import { SA_ICONS, SA_RESULT_ICONS, SA_CHARACTER_IMAGES } from '../../lib/selfAssessmentSurvey.js'
import '../overlays/CardHome.css'
import SelfAssessmentRatingModal from '../modals/SelfAssessmentRatingModal.jsx'
import { sendSelfAssessmentRating } from '../../lib/selfAssessmentWebhook.js'

const ELEMENT_ORDER = ['fire', 'earth', 'wind', 'water'];

export const RCardIcon = ({ icon, className = '' }) => (
    <img
        src={icon.src}
        alt=""
        className={`sa-rcard-icon ${className}`}
        style={icon.scale ? { transform: `scale(${icon.scale})` } : undefined}
    />
);

// Rounded results card with its icon tile overlapping the top edge.
export const RCard = ({ tile, title, children, className = '' }) => (
    <section className={`sa-rcard ${className}`}>
        {tile && <div className="sa-rcard-tile" aria-hidden="true">{tile}</div>}
        {title && <h2 className="sa-benefit-title sa-rcard-title">{title}</h2>}
        {children}
    </section>
);

// Full-size view of the profile's card, styled like the category cards'
// pop-up (CardHome: same overlay, close button and card size/glow).
// Portalled to <body>: inside .sa-results (its own z-index stacking context)
// the overlay would stay trapped under the rest of the page.
const CharacterCardModal = ({ src, title, onClose }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div className="pm-overlay" onClick={onClose}>
            <div className="pm-wrapper" onClick={e => e.stopPropagation()}>
                <div className="pm-topbar">
                    <button className="pm-ctrl-btn pm-ctrl-close" onClick={onClose} aria-label="Close">
                        <FiX size={30} color="rgb(137,162,189)" />
                    </button>
                </div>
                <img src={src} alt="" className="sa-character-modal-card" />
                <h2 className="sa-benefit-title sa-character-modal-title">{title}</h2>
            </div>
        </div>,
        document.body
    );
};

const TextList = ({ items }) => (
    <ul className="sa-rcard-list">
        {items.map(item => <li key={item} className="ep-subtext sa-rcard-text">{item}</li>)}
    </ul>
);

// The profile's card illustration (opens full-size on click), its
// "TYPE: NAME" title and the About panel. Used on the results page and on
// the learning plan page; the card pop-up's open state is the caller's, and
// without onCardOpenChange the card is static (no pop-up); showAbout={false}
// leaves out the About panel.
export const ProfileOverview = ({ result, cardOpen = false, onCardOpenChange, showAbout = true }) => {
    const { type, name, report } = result;
    const character = SA_CHARACTER_IMAGES[type];
    return (
        <>
            {/* The card illustration sits above its panel, on its own. */}
            {character && (onCardOpenChange ? (
                <button className="sa-character-card-btn" onClick={() => onCardOpenChange(true)} aria-label={`Open the ${name} card`}>
                    <img src={character} alt="" className="sa-character-card" />
                </button>
            ) : (
                <img src={character} alt="" className="sa-character-card" />
            ))}
            {cardOpen && character && (
                <CharacterCardModal src={character} title={`${type}: ${name}`} onClose={() => onCardOpenChange(false)} />
            )}
            <h2 className="sa-benefit-title sa-profile-title">{type}: {name}</h2>
            {showAbout && (
                <RCard className="sa-rcard--profile" tile={<RCardIcon icon={SA_ICONS.report} />} title="About">
                    <p className="ep-subtext sa-rcard-text">{report.about}</p>
                </RCard>
            )}
        </>
    );
};

// Results page: thank-you intro with a sticky "Get My Learning Plan" button,
// then one card per section of the scoreSelfAssessment() result.
const SelfAssessmentResults = ({ result, email, onGetLearningPlan }) => {
    const { type, elements, strengths, weaknesses, report } = result;
    const character = SA_CHARACTER_IMAGES[type];
    // The card pops up on its own when the results open (reveal moment);
    // it can be reopened by clicking the small card on the page.
    const [cardOpen, setCardOpen] = useState(!!character);

    // "Rate your report" pop-up: once, when the Strengths card scrolls into
    // view (and not on top of the card pop-up).
    const ratingTriggerRef = useRef(null);
    const [ratingReached, setRatingReached] = useState(false);
    const [ratingDone, setRatingDone] = useState(false);
    useEffect(() => {
        const el = ratingTriggerRef.current;
        if (!el || ratingReached) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setRatingReached(true);
        }, { threshold: 0.3 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [ratingReached]);
    const showRating = ratingReached && !ratingDone && !cardOpen;

    return (
        <div className="sa-results">
            <section className="sa-results-intro">
                <h1 className="ep-headline sa-results-headline">Thank you for taking our self&#8209;assessment</h1>
                {email && (
                    <p className="ep-subtext sa-results-intro-text">
                        Your full report has been emailed to <a href={`mailto:${email}`} className="sa-results-email">{email}</a>.
                    </p>
                )}
                <p className="ep-subtext sa-results-intro-text">
                    Based on your answers, you’re about to discover which personality type best represents your unique strengths.
                </p>
                <p className="ep-subtext sa-results-intro-text">
                    Explore your results by <strong>scrolling down</strong>, to learn more about your personality type and how it can empower you in your professional journey!
                </p>
                <svg className="sa-scroll-hint sa-blink" viewBox="0 0 64 64" aria-hidden="true">
                    <path d="M12 10 L32 26 L52 10" />
                    <path d="M12 34 L32 50 L52 34" />
                </svg>
            </section>

            <ProfileOverview result={result} cardOpen={cardOpen} onCardOpenChange={setCardOpen} />

            <RCard
                tile={
                    <span className="sa-rcard-tile-grid">
                        {ELEMENT_ORDER.map(key => <RCardIcon key={key} icon={SA_RESULT_ICONS[key]} />)}
                    </span>
                }
                title="Four Elements"
            >
                <div className="sa-elements">
                    {ELEMENT_ORDER.map(key => (
                        <div key={key} className="sa-element">
                            <div className="sa-element-icon-wrap"><RCardIcon icon={SA_RESULT_ICONS[key]} className="sa-element-icon" /></div>
                            <div className="sa-element-body">
                                <span className="sa-element-name">{ELEMENTS[key].name}</span>
                                <span className="ep-subtext sa-element-desc">{ELEMENTS[key].description}</span>
                                <div className="sa-element-track">
                                    <div className="sa-element-fill" style={{ width: `${elements[key]}%` }} />
                                </div>
                            </div>
                            <span className="sa-element-pct">{elements[key]}%</span>
                        </div>
                    ))}
                </div>
            </RCard>

            <div ref={ratingTriggerRef}>
                <RCard tile={<RCardIcon icon={SA_RESULT_ICONS.plus} />} title="Strengths"><TextList items={strengths} /></RCard>
            </div>
            {showRating && (
                <SelfAssessmentRatingModal
                    onRate={(n) => sendSelfAssessmentRating(n, { email, type })}
                    onClose={() => setRatingDone(true)}
                />
            )}
            <RCard tile={<RCardIcon icon={SA_RESULT_ICONS.minus} />} title="Weaknesses"><TextList items={weaknesses} /></RCard>
            <RCard tile={<RCardIcon icon={SA_RESULT_ICONS.check} />} title="Do"><TextList items={report.do} /></RCard>
            <RCard tile={<RCardIcon icon={SA_RESULT_ICONS.cross} />} title="Don’t"><TextList items={report.dont} /></RCard>
            <RCard tile={<RCardIcon icon={SA_RESULT_ICONS.conflicts} />} title="Conflicts">
                <p className="ep-subtext sa-rcard-text">{report.conflicts}</p>
            </RCard>
            <RCard tile={<RCardIcon icon={SA_RESULT_ICONS.stereotype} />} title="Stereotype">
                <p className="ep-subtext sa-rcard-text">{report.stereotype}</p>
            </RCard>
            <RCard tile={<RCardIcon icon={SA_RESULT_ICONS.communication} />} title="Communication Style">
                <p className="ep-subtext sa-rcard-text">{report.communication}</p>
            </RCard>

            {/* Sticky: stays pinned to the bottom of the screen while scrolling the results. */}
            <div className="sa-results-sticky">
                <button className="sa-continue-btn sa-results-cta" onClick={onGetLearningPlan}>
                    Get My Learning Plan
                </button>
            </div>
        </div>
    );
};

export default SelfAssessmentResults;
