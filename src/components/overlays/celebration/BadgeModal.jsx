import React, { useEffect } from 'react'
import '../CardHome.css'
import './Celebration.css'
import { MdAutoAwesome } from 'react-icons/md'
import BadgeCard from '../../shared/BadgeCard.jsx'
import { fireCelebrationConfetti } from '../../../lib/confetti.js'

const LOGO_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a1f0c8f003ad6661c9c/view?project=693e8acd001582e2562a';
const LOGO_BG_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a20909c003e0edcf46d/view?project=693e8acd001582e2562a';

const SPARKLE_POS = [
    { top: 4, left: 4 }, { top: 4, right: 4 }, { bottom: 4, left: 4 }, { bottom: 4, right: 4 },
];

// Mirrors modus_genius/components/celebration/BadgeModal.tsx — shown once per
// awarded leaderboard badge (a discrete event per position() in the queue).
const BadgeModal = ({ event, onDismiss }) => {
    useEffect(() => { fireCelebrationConfetti(); }, []);

    return (
        <div className="cel-overlay">
            <div className="cel-card-wrap">
                <div className="cel-logo-box">
                    <img src={LOGO_BG_URL} alt="" className="cel-logo-box-bg" />
                    <div className="cel-logo-box-dim" />
                    <img src={LOGO_URL} alt="" className="cel-logo-box-img" style={{ width: 55, height: 55 }} />
                </div>

                <div className="cel-card">
                    <div className="cel-card-gloss-1" />
                    <div className="cel-card-gloss-2" />

                    <span className="cel-title" style={{ marginBottom: 20 }}>NEW BADGE EARNED!</span>

                    <div className="cel-badge-section">
                        {SPARKLE_POS.map((pos, i) => (
                            <MdAutoAwesome key={i} size={16} className="cel-star" style={{ ...pos, animationDelay: `${i * 200}ms` }} />
                        ))}
                        <div className="cel-badge-card">
                            <div className="cel-card-gloss-1" />
                            <div className="cel-card-gloss-2" />
                            <div className="cel-badge-card-inner">
                                <BadgeCard
                                    fileId={event.fileId}
                                    tab={event.tab}
                                    category={event.category}
                                    rank={event.rank}
                                    name={event.name}
                                    surname={event.surname}
                                    year={event.year}
                                    size={124}
                                />
                            </div>
                        </div>
                    </div>

                    <button type="button" className="cel-btn" onClick={onDismiss}>
                        <div className="cel-btn-gloss-1" />
                        <div className="cel-btn-gloss-2" />
                        <span className="cel-btn-text">CLAIM!</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BadgeModal;
