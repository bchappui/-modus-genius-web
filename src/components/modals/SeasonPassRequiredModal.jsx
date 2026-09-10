import React from 'react'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'
import { SEASON_PASS_PRICE } from '../../lib/membership.js'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

// Glow tile background + 3 gold perk icons, supplied for this modal specifically.
const GLOW_TILE_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa2eb10001f1163026d/view?project=693e8acd001582e2562a';
const ICON_CARD_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa2eb3d003a33b8118b/view?project=693e8acd001582e2562a';
const ICON_CALENDAR_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa2eb470006bf17f5c8/view?project=693e8acd001582e2562a';
const ICON_TROPHY_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa2eb510027513c2eb7/view?project=693e8acd001582e2562a';

// "Exclusive events" and "Leaderboard rankings" are marketing copy only —
// Season Pass's one actually-implemented benefit today is early access to
// new cards (see lib/membership.js). Matches the supplied design mockup.
// `lines` is a fixed 2-line break (not CSS wrapping) so all three captions
// stay the same height regardless of exact wording.
const PERKS = [
    { icon: ICON_CARD_URL, lines: ['Early access to', 'new cards'] },
    { icon: ICON_CALENDAR_URL, lines: ['Exclusive', 'events'] },
    { icon: ICON_TROPHY_URL, lines: ['Leaderboard', 'rankings'] },
];

// Shown when a logged-in account (not extra/premium, no standalone pass)
// tries to open a card still inside its 12-month season-exclusivity window.
const SeasonPassRequiredModal = ({ onClose, onGetSeasonPass }) => {
    return (
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />
                <p className="eim-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</p>

                <h3 className="eim-headline">This card is early access only</h3>
                <p className="eim-subtext">
                    New cards are exclusive to Season Pass holders for their first 12 months.
                    Get the Season Pass — or Extra membership, which includes it — to unlock it now.
                </p>

                <div className="spm-perks-row">
                    {PERKS.map(perk => (
                        <div key={perk.lines.join(' ')} className="spm-perk">
                            <div className="spm-perk-tile" style={{ backgroundImage: `url(${GLOW_TILE_URL})` }}>
                                <img src={perk.icon} alt="" className="spm-perk-icon" />
                            </div>
                            <span className="spm-perk-label">{perk.lines[0]}<br />{perk.lines[1]}</span>
                        </div>
                    ))}
                </div>

                <button className="eim-redeem-btn" onClick={onGetSeasonPass}>Get Season Pass</button>
                <p className="spm-price-caption">USD {SEASON_PASS_PRICE.toFixed(2)} or included with Extra subscription</p>
            </div>
        </div>
    );
};

export default SeasonPassRequiredModal;
