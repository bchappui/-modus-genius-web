import React, { useEffect, useState } from 'react'
import { FiX, FiPlus, FiMinus } from 'react-icons/fi'
import { MdWorkspacePremium } from 'react-icons/md'
import './BadgesModal.css'
import { getBadgesByUser, getDisplayedBadges, addDisplayedBadge, removeDisplayedBadge } from '../../lib/agents.js'
import BadgeCard from '../shared/BadgeCard.jsx'

// Gold gradient defs for the header icon — same stops used across this app's
// other overlays (EditProfileModal, CreateModal).
const BdmSvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="bdm-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgb(246,207,129)" />
                <stop offset="50%"  stopColor="rgb(201,151,44)" />
                <stop offset="100%" stopColor="rgb(246,207,129)" />
            </linearGradient>
        </defs>
    </svg>
);

// Mirrors modus_genius/app/(root)/profile/badges.tsx: every badge the agent
// has earned, in a 2-column grid, each with an add/remove control that pins
// up to 3 of them to displayedBadges (the ones shown on their profile card).
const BadgesModal = ({ agentId, onClose }) => {
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [displayedBadgeIds, setDisplayedBadgeIds] = useState([]);
    const [processingBadgeId, setProcessingBadgeId] = useState(null);

    useEffect(() => {
        if (!agentId) { setLoading(false); return; }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [data, displayed] = await Promise.all([
                    getBadgesByUser(agentId),
                    getDisplayedBadges(agentId),
                ]);
                if (cancelled) return;
                setBadges(data);
                setDisplayedBadgeIds(displayed.map(b => b.$id));
            } catch (error) {
                console.error('Badges page - Failed to load badges', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [agentId]);

    const handleAddBadge = async (badgeId) => {
        if (displayedBadgeIds.length >= 3) { alert('You can only display 3 badges on your profile.'); return; }
        setProcessingBadgeId(badgeId);
        try {
            await addDisplayedBadge(agentId, badgeId);
            setDisplayedBadgeIds(prev => [...prev, badgeId]);
        } catch (error) {
            alert(error.message || 'Failed to add badge to profile');
        } finally {
            setProcessingBadgeId(null);
        }
    };

    const handleRemoveBadge = async (badgeId) => {
        setProcessingBadgeId(badgeId);
        try {
            await removeDisplayedBadge(agentId, badgeId);
            setDisplayedBadgeIds(prev => prev.filter(id => id !== badgeId));
        } catch (error) {
            alert('Failed to remove badge from profile');
        } finally {
            setProcessingBadgeId(null);
        }
    };

    return (
        <div className="bdm-overlay" onClick={onClose}>
            <BdmSvgDefs />
            <div className="bdm-panel" onClick={e => e.stopPropagation()}>
                <div className="bdm-scroll">
                    <div className="bdm-header-bar">
                        <button className="bdm-close-btn" onClick={onClose} aria-label="Close">
                            <FiX size={22} color="rgb(137,162,189)" />
                        </button>
                        <div className="bdm-header-title">
                            <MdWorkspacePremium size={22} style={{ fill: 'url(#bdm-g-gold) rgb(201,151,44)' }} />
                            <span className="bdm-header-text">BADGES</span>
                        </div>
                    </div>

                    {loading ? (
                        <p className="bdm-loading">Loading…</p>
                    ) : badges.length === 0 ? (
                        <p className="bdm-empty">You haven't earned any badges yet.</p>
                    ) : (
                        <div className="bdm-grid">
                            {badges.map(item => {
                                const isDisplayed = displayedBadgeIds.includes(item.$id);
                                const isProcessing = processingBadgeId === item.$id;
                                const canAddMore = displayedBadgeIds.length < 3;
                                return (
                                    <div key={item.$id} className="bdm-item">
                                        <div className="bdm-card">
                                            <BadgeCard
                                                fileId={item.fileId}
                                                tab={item.tab}
                                                category={item.category}
                                                rank={item.rank}
                                                name={item.name}
                                                surname={item.surname}
                                                year={item.year}
                                                size={124}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className={`bdm-toggle-btn${isDisplayed ? ' bdm-toggle-btn--remove' : ''}`}
                                            onClick={() => (isDisplayed ? handleRemoveBadge(item.$id) : handleAddBadge(item.$id))}
                                            disabled={isProcessing || (!isDisplayed && !canAddMore)}
                                            aria-label={isDisplayed ? 'Remove from profile' : 'Display on profile'}
                                        >
                                            {isDisplayed ? <FiMinus size={16} /> : <FiPlus size={16} />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BadgesModal;
