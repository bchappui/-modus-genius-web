import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'

// No real card art for this promo slot yet — same placeholder-gradient
// convention as ExitIntentModal's own PACK_CARDS.
const PACK_CARDS = [
    'linear-gradient(160deg, rgb(230,90,120) 0%, rgb(120,60,140) 100%)',
    'linear-gradient(160deg, rgb(60,190,170) 0%, rgb(30,90,120) 100%)',
    'linear-gradient(160deg, rgb(90,110,220) 0%, rgb(40,40,110) 100%)',
];

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

// Placeholder pricing — easy to swap once real numbers are decided.
const OPTIONS = [
    { key: 'membership', label: 'Membership', price: 'Starts at CHF 19.00', strike: 'CHF 6.00' },
    { key: 'one-time', label: 'One Time Purchase', price: 'CHF 19.00', strike: 'CHF 6.00' },
];

// Shown to a Free-tier account that's used up its one card for the month —
// pushes straight to an upgrade pitch. See OutOfEssentialsCardsModal for the
// equivalent shown to Essentials accounts (same layout).
const OutOfFreeCardsModal = ({ onClose, onContinue }) => {
    const [selected, setSelected] = useState('membership');

    return (
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />
                <p className="eim-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</p>

                <p className="eim-eyebrow">You're out of free cards.</p>
                <h3 className="eim-headline">Explore our library of 1000+ cards from the world's biggest experts</h3>

                <div className="eim-cards-row">
                    <span className="eim-cards-divider" aria-hidden="true" />
                    {PACK_CARDS.map((gradient, i) => (
                        <div key={i} className="eim-card" style={{ background: gradient }} />
                    ))}
                    <span className="eim-cards-divider" aria-hidden="true" />
                </div>

                <div className="oc-options">
                    {OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            type="button"
                            className={`oc-option${selected === opt.key ? ' oc-option--active' : ''}`}
                            onClick={() => setSelected(opt.key)}
                        >
                            <span className="oc-option-left">
                                <span className="oc-option-radio" />
                                <span className="oc-option-label">{opt.label}</span>
                            </span>
                            <span className="oc-option-price">
                                <span className="oc-option-price-main">{opt.price}</span>
                                <span className="oc-option-price-strike">{opt.strike}</span>
                            </span>
                        </button>
                    ))}
                </div>

                <button className="eim-redeem-btn" onClick={() => onContinue(selected)}>Continue</button>
            </div>
        </div>
    );
};

export default OutOfFreeCardsModal;
