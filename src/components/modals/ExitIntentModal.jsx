import React from 'react'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

// No real "starter pack" card art exists yet — same fallback convention as
// NewsletterPage's placeholder issue cards: a colorful gradient per slot.
const PACK_CARDS = [
    'linear-gradient(160deg, rgb(230,90,120) 0%, rgb(120,60,140) 100%)',
    'linear-gradient(160deg, rgb(60,190,170) 0%, rgb(30,90,120) 100%)',
    'linear-gradient(160deg, rgb(90,110,220) 0%, rgb(40,40,110) 100%)',
];

const ExitIntentModal = ({ onClose }) => {
    return (
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />

                <p className="eim-eyebrow">Before you go...</p>
                <h3 className="eim-headline">Get your free pack and start unlock your skills</h3>

                <span className="eim-limited-badge">Limited Time</span>

                <div className="eim-cards-row">
                    <span className="eim-cards-divider" aria-hidden="true" />
                    {PACK_CARDS.map((gradient, i) => (
                        <div key={i} className="eim-card" style={{ background: gradient }} />
                    ))}
                    <span className="eim-cards-divider" aria-hidden="true" />
                </div>

                <button className="eim-redeem-btn" onClick={onClose}>Redeem your pack &gt;&gt;</button>
            </div>
        </div>
    );
};

export default ExitIntentModal;
