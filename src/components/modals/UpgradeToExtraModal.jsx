import React from 'react'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

// Same glow tile + gold perk icons as SeasonPassRequiredModal.
const GLOW_TILE_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa2eb10001f1163026d/view?project=693e8acd001582e2562a';
const ICON_CARD_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa2eb3d003a33b8118b/view?project=693e8acd001582e2562a';
const ICON_CALENDAR_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa2eb470006bf17f5c8/view?project=693e8acd001582e2562a';
const ICON_TROPHY_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa2eb510027513c2eb7/view?project=693e8acd001582e2562a';

// Extra-only perks, worded after lib/membership.js (tier perks + the
// Membership comparison table).
const PERKS = [
    { icon: ICON_CARD_URL, lines: ['Unlimited', 'cards'] },
    { icon: ICON_CALENDAR_URL, lines: ['Season Pass', 'included'] },
    { icon: ICON_TROPHY_URL, lines: ['Leaderboard', 'rankings'] },
];

// Shown when a logged-in account without Extra (or Premium) hits the
// Community page's "Speak With Our Experts" button.
const UpgradeToExtraModal = ({ onClose, onUpgrade }) => {
    return (
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />
                <p className="eim-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</p>

                <h3 className="eim-headline">The Community is an Extra feature</h3>
                <p className="eim-subtext">
                    Upgrade to Extra to ask your questions, get answers from our experts
                    and access a private community with 1200+ members.
                </p>

                <div className="spm-perks-row uem-perks-row">
                    {PERKS.map(perk => (
                        <div key={perk.lines.join(' ')} className="spm-perk">
                            <div className="spm-perk-tile" style={{ backgroundImage: `url(${GLOW_TILE_URL})` }}>
                                <img src={perk.icon} alt="" className="spm-perk-icon" />
                            </div>
                            <span className="spm-perk-label">{perk.lines[0]}<br />{perk.lines[1]}</span>
                        </div>
                    ))}
                </div>

                <button className="eim-redeem-btn" onClick={onUpgrade}>Upgrade to Extra</button>
            </div>
        </div>
    );
};

export default UpgradeToExtraModal;
