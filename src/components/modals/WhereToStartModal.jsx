import React from 'react'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

// No real card art for this promo slot yet — same placeholder-gradient
// convention as ExitIntentModal's own PACK_CARDS.
const PACK_CARDS = [
    'linear-gradient(160deg, rgb(230,90,120) 0%, rgb(120,60,140) 100%)',
    'linear-gradient(160deg, rgb(60,190,170) 0%, rgb(30,90,120) 100%)',
    'linear-gradient(160deg, rgb(90,110,220) 0%, rgb(40,40,110) 100%)',
];

// Exit-intent shown specifically on Explore (see isExplorePage in App.jsx) —
// pitches a personality-test-style recommendation flow. "Get Started" just
// closes for now since that quiz doesn't exist yet (same placeholder pattern
// ExitIntentModal's own "Redeem your pack" button already uses).
const WhereToStartModal = ({ onClose, onGetStarted }) => {
    return (
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />
                <p className="eim-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</p>

                <h3 className="eim-headline">Not sure where to start?</h3>
                <p className="eim-subtext">
                    Identify knowledge gaps and strengths, and find out where you stand.
                    Then, get tailored learning recommendations to level up.
                </p>

                <div className="eim-cards-row">
                    <span className="eim-cards-divider" aria-hidden="true" />
                    {PACK_CARDS.map((gradient, i) => (
                        <div key={i} className="eim-card" style={{ background: gradient }} />
                    ))}
                    <span className="eim-cards-divider" aria-hidden="true" />
                </div>

                <button className="wts-cta-btn" onClick={onGetStarted}>Get Started</button>
            </div>
        </div>
    );
};

export default WhereToStartModal;
