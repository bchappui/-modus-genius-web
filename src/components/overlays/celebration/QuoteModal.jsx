import React from 'react'
import '../CardHome.css'
import './Celebration.css'
import { MdAutoAwesome } from 'react-icons/md'

const LOGO_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69ea8cde0029190595a4/view?project=693e8acd001582e2562a';
const LOGO_BG_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a20909c003e0edcf46d/view?project=693e8acd001582e2562a';

const SPARKLE_POS = [
    { top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 },
];

// Mirrors modus_genius/components/celebration/QuoteModal.tsx — shown when a
// quote unlocks at the agent's new level.
const QuoteModal = ({ event, onDismiss, onOpenQuote }) => (
    <div className="cel-overlay">
        <div className="cel-card-wrap">
            <div className="cel-logo-box">
                <img src={LOGO_BG_URL} alt="" className="cel-logo-box-bg" />
                <div className="cel-logo-box-dim" />
                <img src={LOGO_URL} alt="" className="cel-logo-box-img" style={{ width: 62, height: 62 }} />
            </div>

            <div className="cel-card">
                <div className="cel-card-gloss-1" />
                <div className="cel-card-gloss-2" />

                <span className="cel-title">CARD RECEIVED!</span>

                <div className="cel-icon-wrap" style={{ width: 160, height: 160, marginBottom: 24 }}>
                    <div className="cel-halo" style={{ width: 108, height: 108 }} />
                    <div className="cel-ring-outer" style={{ width: 130, height: 130 }} />
                    <div className="cel-ring-inner" style={{ width: 96, height: 96 }} />

                    {SPARKLE_POS.map((pos, i) => (
                        <MdAutoAwesome key={i} size={16} className="cel-star" style={{ ...pos, animationDelay: `${i * 200}ms` }} />
                    ))}

                    <div className="cel-badge" style={{ width: 120, height: 120, borderRadius: 60 }} />

                    {event.category && (
                        <div className="cel-tag-shadow" style={{ position: 'absolute', zIndex: 3 }}>
                            <div className="cel-tag">
                                <span className="cel-tag-text" style={{ fontSize: 24 }}>{event.category.toUpperCase()}</span>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    className="cel-btn"
                    onClick={() => { onDismiss(); onOpenQuote?.(event.quoteId); }}
                >
                    <div className="cel-btn-gloss-1" />
                    <div className="cel-btn-gloss-2" />
                    <span className="cel-btn-text">UNLOCK</span>
                </button>
            </div>
        </div>
    </div>
);

export default QuoteModal;
