import React, { useEffect } from 'react'
import '../CardHome.css'
import './Celebration.css'
import { MdAutoAwesome } from 'react-icons/md'
import { fireCelebrationConfetti } from '../../../lib/confetti.js'

const CAESAR_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/699b04810011f3feb029/view?project=693e8acd001582e2562a';

const CARD_W = 80;
const CARD_H = Math.round(CARD_W * 2576 / 1456);
const PS_W = CARD_W + 60;
const PS_H = CARD_H + 60;

const SPARKLE_POS = [
    { top: 4, left: 4 }, { top: 4, right: 4 }, { bottom: 4, left: 4 }, { bottom: 4, right: 4 },
];

// Mirrors modus_genius/components/celebration/LeaderboardModal.tsx — shown
// once a week if the agent placed in the global top 100 on any leaderboard.
const LeaderboardModal = ({ event, avatar, onDismiss, onOpenRanks }) => {
    useEffect(() => { fireCelebrationConfetti(); }, []);

    const bestEntry = [...event.positions].sort((a, b) => a.position - b.position)[0];
    const bestRank = bestEntry?.position ?? 1;
    const bestTab = bestEntry?.tab ?? '';
    const bestCategory = bestEntry?.category ?? '';

    return (
        <div className="cel-overlay">
            <div className="cel-card cel-card-flat cel-card-wrap" style={{ width: 300 }}>
                <div className="cel-card-gloss-1" />
                <div className="cel-card-gloss-2" />

                <span className="cel-title">YOU ARE ON THE LEADERBOARD!</span>
                <span className="cel-subtitle">
                    COMPETE WITH EXPERTS WORLDWIDE TO EARN THE MOST HEARTS AND STARS. THE MORE YOU CREATE AND SHARE YOUR EXPERTISE, THE HIGHER YOU RISE
                </span>

                <div className="cel-tag-shadow" style={{ marginTop: 12, marginBottom: 12 }}>
                    <div className="cel-tag">
                        <span className="cel-tag-text" style={{ fontSize: 20 }}>{bestTab}</span>
                    </div>
                </div>

                <div style={{ position: 'relative', width: PS_W, height: PS_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                        className="lbm-caesar"
                        style={{ maskImage: `url(${CAESAR_URL})`, WebkitMaskImage: `url(${CAESAR_URL})` }}
                    />

                    {SPARKLE_POS.map((pos, i) => (
                        <MdAutoAwesome key={i} size={16} className="cel-star" style={{ ...pos, animationDelay: `${i * 200}ms` }} />
                    ))}

                    <div className="cel-portrait-wrap" style={{ width: CARD_W, height: CARD_H, position: 'relative' }}>
                        <div className="cel-portrait-gradient" style={{ width: CARD_W, height: CARD_H }}>
                            <div className="cel-portrait-inner">
                                {avatar && <img src={avatar} alt="" />}
                            </div>
                        </div>
                    </div>

                    <div className="cel-tag-shadow" style={{ position: 'absolute', bottom: 8 }}>
                        <div className="cel-tag">
                            <span className="cel-tag-text" style={{ fontSize: 28 }}>#{bestRank}</span>
                        </div>
                    </div>
                </div>

                <div className="cel-tag-shadow" style={{ marginTop: 8, marginBottom: 16 }}>
                    <div className="cel-tag">
                        <span className="cel-tag-text">{bestCategory}</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="cel-btn"
                    onClick={() => { onDismiss(); onOpenRanks?.(bestTab, bestCategory); }}
                >
                    <div className="cel-btn-gloss-1" />
                    <div className="cel-btn-gloss-2" />
                    <span className="cel-btn-text">SEE RANKINGS</span>
                </button>
            </div>
        </div>
    );
};

export default LeaderboardModal;
