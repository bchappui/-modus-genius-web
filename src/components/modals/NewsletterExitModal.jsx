import React from 'react'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

// Same look as ExitIntentModal (starter-pack promo), same copy as SubscribePage.
const NewsletterExitModal = ({ onClose }) => {
    return (
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />

                <p className="eim-eyebrow">Before you go...</p>
                <h3 className="eim-headline">WEEKLY NEWSLETTER</h3>

                <p className="eim-subtext">
                    Each week, receive bite-size advices and tools to elevate your business
                    management skills and lead with impact.
                </p>

                <div className="eim-beehiiv-embed">
                    <script async src="https://subscribe-forms.beehiiv.com/v3/loader.js" data-beehiiv-form="b362bbb5-53af-4c96-9d1d-7e3647544977" />
                </div>
            </div>
        </div>
    );
};

export default NewsletterExitModal;
