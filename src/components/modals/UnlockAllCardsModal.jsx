import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

// Confirmation before skipping a deck's Learning Plan (one card a day) to
// unlock every card at once — which forfeits that deck's digital badge.
// Same panel/logo/headline styles as the other pop-ups (ExitIntentModal);
// the safe choice is the prominent gold button. Portalled to <body>.
const UnlockAllCardsModal = ({ cardCount = 30, onKeepPlan, onUnlock, onClose }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />
                <p className="eim-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</p>

                <p className="eim-eyebrow">Before you unlock everything…</p>
                <h3 className="eim-headline">You’ll lose your digital badge</h3>

                <p className="eim-subtext">
                    You’re about to get instant access to all {cardCount} cards of this deck.
                </p>
                <p className="eim-subtext">
                    By skipping your Learning Plan, you’ll <strong>no longer be eligible for this deck’s digital badge</strong> — it’s only awarded when you complete the plan, one card a day.
                </p>

                <button className="wts-cta-btn" onClick={onKeepPlan ?? onClose}>Keep my Learning Plan</button>
                <button className="sar-later uac-unlock" onClick={onUnlock}>Unlock all cards anyway</button>
            </div>
        </div>,
        document.body
    );
};

export default UnlockAllCardsModal;
