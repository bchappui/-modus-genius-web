import React from 'react'
import { FaBookOpen, FaCertificate, FaStar } from 'react-icons/fa'
import { SA_RESULT_ICONS } from '../../lib/selfAssessmentSurvey.js'
import { getLearningPlan } from '../../lib/selfAssessmentLearningPlans.js'
import { RCard, RCardIcon } from './SelfAssessmentResults.jsx'
import deckBanner from '../../assets/images/learning-plan-deck-banner.jpg'

const LIGHT_RAYS_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69ad3a86002fb6d87a85/view?project=693e8acd001582e2562a';

// No real pack art yet — same placeholder-gradient convention as the
// promo slide's PROMO_CARDS.
const PLACEHOLDER_PACK = [
    'linear-gradient(160deg, rgb(230,90,120) 0%, rgb(120,60,140) 100%)',
    'linear-gradient(160deg, rgb(60,190,170) 0%, rgb(30,90,120) 100%)',
    'linear-gradient(160deg, rgb(90,110,220) 0%, rgb(40,40,110) 100%)',
];

// The deck panel (grid): name and skill tags across the top; pack over
// light rays bottom-left; perks and "Redeem" bottom-right; element icon on
// the top-left corner. The banner image is stretched over the whole panel.
// `mirrored` flips it all left↔right (Weaknesses deck).
const DeckPanel = ({ deck, elementIcon, onRedeem, mirrored = false }) => (
    <div className={`sa-deck-wrap${mirrored ? ' sa-deck-wrap--mirrored' : ''}`}>
        {/* Outside .sa-deck so its overflow clipping (for the rays) doesn't cut it. */}
        <img
            src={elementIcon.src}
            alt=""
            className="sa-deck-element"
            style={elementIcon.scale ? { transform: `scale(${elementIcon.scale})` } : undefined}
        />
        <div className="sa-deck" style={{ '--deck-bg': `url(${deckBanner})` }}>
            <h3 className="sa-benefit-title sa-deck-name">{deck.name}</h3>
            <div className="sa-deck-tags">
                {deck.tags.map((tag, i) => <span key={i} className="sa-deck-tag">{tag}</span>)}
            </div>

            <div className="sa-deck-pack-area" aria-hidden="true">
                <img src={LIGHT_RAYS_URL} alt="" className="sa-deck-rays" />
                {deck.image
                    ? <img src={deck.image} alt="" className="sa-deck-box" />
                    : (
                        <div className="sa-deck-pack sa-deck-pack--placeholder">
                            {PLACEHOLDER_PACK.map((g, i) => <span key={i} style={{ background: g }} />)}
                        </div>
                    )}
            </div>

            <ul className="sa-deck-perks">
                <li>{deck.cards} cards available <span className="sa-deck-perk-icon"><FaBookOpen size={15} /></span></li>
                <li>30 day satisfaction guarantee <span className="sa-deck-perk-icon"><FaCertificate size={16} /></span></li>
                <li>5 star reviews <span className="sa-deck-perk-icon"><FaStar size={14} /></span></li>
            </ul>
            <div className="sa-deck-actions">
                <button className="sa-deck-redeem" onClick={onRedeem}>Redeem your deck &gt;&gt;</button>
            </div>
        </div>
    </div>
);

// The profile's learning plan (getLearningPlan) laid out as result cards:
// its Strengths deck(s), then its Weaknesses deck(s) mirrored.
const SelfAssessmentLearningPlan = ({ result, onRedeemDeck }) => {
    const plan = getLearningPlan(result.type);
    const elementIcon = SA_RESULT_ICONS[result.mainElement];
    if (!plan) return null;

    return (
        <>
            {[
                ['strengths', 'Strengths', SA_RESULT_ICONS.plus, false],
                ['weaknesses', 'Weaknesses', SA_RESULT_ICONS.minus, true],
            ].map(([key, title, icon, mirrored]) => plan[key].length > 0 && (
                <RCard key={key} className="sa-rcard--deck" tile={<RCardIcon icon={icon} />} title={title}>
                    <div className="sa-deck-list">
                        {plan[key].map(deck => (
                            <DeckPanel
                                key={deck.id}
                                deck={deck}
                                elementIcon={elementIcon}
                                mirrored={mirrored}
                                onRedeem={() => onRedeemDeck?.(deck, key)}
                            />
                        ))}
                    </div>
                    <p className="sa-deck-note">
                        You’ll be subscribed to your Learning Plan and receive personalized emails to help you. You can unsubscribe anytime.
                    </p>
                </RCard>
            ))}
        </>
    );
};

export default SelfAssessmentLearningPlan;
