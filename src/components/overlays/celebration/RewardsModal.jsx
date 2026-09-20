import React, { useState } from 'react'
import '../CardHome.css'
import './Celebration.css'
import { MdFavorite, MdStars, MdAutoAwesome } from 'react-icons/md'

const LOGO_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69ea6a5f002721b9b075/view?project=693e8acd001582e2562a';
const LOGO_BG_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a20909c003e0edcf46d/view?project=693e8acd001582e2562a';

const TITLES = [
    'WELL EARNED!', 'KEEP IT UP!', 'YOUR EFFORT SHOWS!', 'MAKING YOUR MARK!',
    'GREAT PROGRESS!', 'RISING HIGHER!', 'OUTSTANDING WORK!', 'YOUR DEDICATION PAYS OFF!',
];

const SPARKLE_POS = [
    { top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 },
];

// Mirrors modus_genius/components/celebration/RewardsModal.tsx — shown on
// every level-up, before the (rarer) rank/role/quote popups in the queue.
const RewardsModal = ({ event, onDismiss }) => {
    const [title] = useState(() => TITLES[Math.floor(Math.random() * TITLES.length)]);
    const showHearts = event.trigger === 'hearts' || event.trigger === null;
    const showStars = event.trigger === 'stars' || event.trigger === null;

    return (
        <div className="cel-overlay">
            <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
                <defs>
                    <linearGradient id="cel-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                        <stop offset="0%" stopColor="rgb(246,207,129)" />
                        <stop offset="50%" stopColor="rgb(201,151,44)" />
                        <stop offset="100%" stopColor="rgb(246,207,129)" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="cel-card-wrap">
                <div className="cel-logo-box">
                    <img src={LOGO_BG_URL} alt="" className="cel-logo-box-bg" />
                    <div className="cel-logo-box-dim" />
                    <img src={LOGO_URL} alt="" className="cel-logo-box-img" style={{ width: 72, height: 72 }} />
                </div>

                <div className="cel-card">
                    <div className="cel-card-gloss-1" />
                    <div className="cel-card-gloss-2" />

                    <span className="cel-title">{title}</span>

                    <div className="cel-icon-wrap" style={{ width: 160, height: 160 }}>
                        <div className="cel-halo" style={{ width: 108, height: 108 }} />
                        <div className="cel-ring-outer" style={{ width: 130, height: 130 }} />
                        <div className="cel-ring-inner" style={{ width: 96, height: 96 }} />

                        {SPARKLE_POS.map((pos, i) => (
                            <MdAutoAwesome key={i} size={16} className="cel-star" style={{ ...pos, animationDelay: `${i * 200}ms` }} />
                        ))}

                        <div className="cel-badge" style={{ width: 104, height: 104, borderRadius: 52 }}>
                            {showHearts && <MdFavorite size={72} style={{ fill: 'url(#cel-g-gold) rgb(201,151,44)' }} />}
                            {!showHearts && showStars && <MdStars size={72} style={{ fill: 'url(#cel-g-gold) rgb(201,151,44)' }} />}
                        </div>
                    </div>

                    {showHearts && (
                        <div className="cel-bar-row" style={{ marginBottom: event.trigger === 'hearts' ? 24 : 16 }}>
                            <MdFavorite size={22} style={{ fill: 'url(#cel-g-gold) rgb(201,151,44)', flexShrink: 0 }} />
                            <div className="cel-bar-track">
                                <div className="cel-bar-fill" />
                            </div>
                            <span className="cel-bar-label">{event.totalHearts}</span>
                        </div>
                    )}

                    {showStars && (
                        <div className="cel-bar-row" style={{ marginBottom: 24 }}>
                            <MdStars size={22} style={{ fill: 'url(#cel-g-gold) rgb(201,151,44)', flexShrink: 0 }} />
                            <div className="cel-bar-track">
                                <div className="cel-bar-fill" />
                            </div>
                            <span className="cel-bar-label">{event.totalStars}</span>
                        </div>
                    )}

                    <button type="button" className="cel-btn" onClick={onDismiss}>
                        <div className="cel-btn-gloss-1" />
                        <div className="cel-btn-gloss-2" />
                        <span className="cel-btn-text">NEXT</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RewardsModal;
