import React, { useEffect, useState } from 'react'
import '../CardHome.css'
import './Celebration.css'
import { MdAutoAwesome } from 'react-icons/md'
import { fireCelebrationConfetti } from '../../../lib/confetti.js'

const LOGO_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69ea7ff00019ea90ba94/view?project=693e8acd001582e2562a';
const LOGO_BG_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a20909c003e0edcf46d/view?project=693e8acd001582e2562a';

const TITLES = [
    'YOU LEVELED UP!', 'NEW RANK ACHIEVED!', 'RANK UNLOCKED!', 'RISING THROUGH THE RANKS!', 'NEXT LEVEL REACHED!',
];

const STAR_POSITIONS = [
    { top: 68, left: 140 }, { top: 121, left: 110 }, { top: 121, left: 34 },
    { top: 68, left: 4 }, { top: 15, left: 34 }, { top: 15, left: 110 },
];

const toRoman = (n) => {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let out = '';
    for (let i = 0; i < vals.length; i++) while (n >= vals[i]) { out += syms[i]; n -= vals[i]; }
    return out;
};
const splitRoman = (s) => {
    if (s.length <= 3) return s;
    const mid = Math.ceil(s.length / 2);
    return `${s.slice(0, mid)}\n${s.slice(mid)}`;
};

// Mirrors modus_genius/components/celebration/LevelupModal.tsx — shown when
// the agent's rank tier changes (not on every level, only when getRankForLevel
// returns a different rankName than before).
const LevelupModal = ({ event, onDismiss }) => {
    const [title] = useState(() => TITLES[Math.floor(Math.random() * TITLES.length)]);

    useEffect(() => { fireCelebrationConfetti(); }, []);

    return (
        <div className="cel-overlay">
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

                    <div className="cel-icon-wrap" style={{ width: 190, height: 190 }}>
                        <div className="cel-halo" style={{ width: 136, height: 136 }} />
                        <div className="cel-ring-outer" style={{ width: 162, height: 162 }} />
                        <div className="cel-ring-inner" style={{ width: 120, height: 120 }} />

                        {STAR_POSITIONS.map((pos, i) => (
                            <MdAutoAwesome key={i} size={16} className="cel-star" style={{ position: 'absolute', top: pos.top, left: pos.left, animationDelay: `${i * 180}ms` }} />
                        ))}

                        <div className="clm-level-badge">
                            <span className="clm-level-bg">LEVEL</span>
                            <span className="clm-level-roman">{splitRoman(toRoman(event.newLevel))}</span>
                        </div>
                    </div>

                    <div className="cel-tag-shadow" style={{ marginBottom: 24 }}>
                        <div className="cel-tag">
                            <span className="cel-tag-text">{event.rankName.toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="cel-bar-row" style={{ marginBottom: 24 }}>
                        <span className="cel-bar-label">{event.previousLevel}</span>
                        <div className="cel-bar-track">
                            <div className="cel-bar-fill" />
                        </div>
                        <span className="cel-bar-label">{event.newLevel}</span>
                    </div>

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

export default LevelupModal;
