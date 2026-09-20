import React from 'react'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

// Shown when a Free/Essentials account clicks READ CARD on an agent's
// profile card — same "eim-*" gate layout as SeasonPassRequiredModal, just
// gating a different feature (the detailed agent read-card, not a property).
const ReadCardRequiredModal = ({ onClose, onUpgrade }) => {
    return (
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />
                <p className="eim-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</p>

                <h3 className="eim-headline">Read Cards are an Extra feature</h3>
                <p className="eim-subtext">
                    Viewing an agent's full read card is included with Extra and Premium membership.
                    Upgrade to unlock it.
                </p>

                <button className="eim-redeem-btn" onClick={onUpgrade}>Upgrade Membership</button>
            </div>
        </div>
    );
};

export default ReadCardRequiredModal;
