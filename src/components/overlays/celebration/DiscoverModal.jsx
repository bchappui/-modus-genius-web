import React, { useEffect } from 'react'
import '../CardHome.css'
import './Celebration.css'
import { MdAutoAwesome } from 'react-icons/md'
import BadgeCard from '../../shared/BadgeCard.jsx'
import { fireCelebrationConfetti } from '../../../lib/confetti.js'

const SPARKLE_POS = [
    { top: 4, left: 4 }, { top: 4, right: 4 }, { bottom: 4, left: 4 }, { bottom: 4, right: 4 },
];

// Mirrors modus_genius/components/celebration/DiscoverModal.tsx — shown when
// one of the agent's cards appears in a Discover section (Top 10, Most
// Wanted, Classics, MG Selects). No logo circle — this one's card stands alone.
const DiscoverModal = ({ event, onDismiss, onOpenProperty }) => {
    useEffect(() => { fireCelebrationConfetti(); }, []);

    return (
        <div className="cel-overlay">
            <div className="cel-card cel-card-flat cel-card-wrap" style={{ width: 300 }}>
                <div className="cel-card-gloss-1" />
                <div className="cel-card-gloss-2" />

                <span className="cel-title" style={{ fontSize: 18, marginBottom: 6 }}>YOUR CARD HAS BEEN FEATURED!</span>
                <span className="cel-card-title">{event.propertyName.toUpperCase()}</span>
                <span className="cel-subtitle">SHARE YOUR CARD AND INSPIRE THE COMMUNITY</span>

                <div className="cel-badge-section">
                    {SPARKLE_POS.map((pos, i) => (
                        <MdAutoAwesome key={i} size={16} className="cel-star" style={{ ...pos, animationDelay: `${i * 200}ms` }} />
                    ))}
                    <div className="cel-badge-card">
                        <div className="cel-card-gloss-1" />
                        <div className="cel-card-gloss-2" />
                        <div className="cel-badge-card-inner">
                            <BadgeCard fileId={event.fileId} tab={event.tab} year={event.year} size={124} />
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="cel-btn"
                    onClick={() => { onDismiss(); onOpenProperty?.(event.propertyId); }}
                >
                    <div className="cel-btn-gloss-1" />
                    <div className="cel-btn-gloss-2" />
                    <span className="cel-btn-text">OPEN MY CARD</span>
                </button>
            </div>
        </div>
    );
};

export default DiscoverModal;
