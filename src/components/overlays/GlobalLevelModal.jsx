import React, { useEffect, useRef, useState } from 'react'
import './GlobalLevelModal.css'
import { FiX } from 'react-icons/fi'
import { IoScanOutline } from 'react-icons/io5'
import Spinner from '../shared/Spinner.jsx'
import { buildRanksFromAppwrite } from '../../lib/levels.js'
import DetailedLevelModal from './DetailedLevelModal.jsx'

const toRoman = (n) => {
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let out = '';
    for (let i = 0; i < vals.length; i++)
        while (n >= vals[i]) { out += syms[i]; n -= vals[i]; }
    return out;
};

// Mirrors modus_genius's globallevel.tsx getCurrentTierName — which tier
// covers the agent's current global level.
const getCurrentTierName = (currentLevel, ranks) => {
    for (const tier of ranks) {
        for (const rank of tier.ranks) {
            const minLevel = rank.levels[0]?.level;
            const maxLevel = rank.levels[rank.levels.length - 1]?.level;
            if (currentLevel >= minLevel && currentLevel <= maxLevel) return tier.tierName;
        }
    }
    return null;
};

// Opened by tapping the level diamond on AgentProfileCard — mirrors
// modus_genius's /levelpath/globallevel screen: a "GROWTH PATH" list of every
// tier, each showing its level range and a scan-highlighted current tier.
const GlobalLevelModal = ({ agent, currentLevel, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [ranks, setRanks] = useState([]);
    const [detailTierName, setDetailTierName] = useState(null);
    const currentTierRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const ranksData = await buildRanksFromAppwrite();
                if (!cancelled) setRanks(ranksData);
            } catch (e) {
                console.error('GlobalLevelModal error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const currentTierName = getCurrentTierName(currentLevel ?? 1, ranks);

    useEffect(() => {
        if (loading || !currentTierName) return;
        const t = setTimeout(() => {
            currentTierRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
        return () => clearTimeout(t);
    }, [loading, currentTierName]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="glm-backdrop" onClick={onClose}>
            <div className="glm-wrapper" onClick={e => e.stopPropagation()}>
                <button className="glm-close" onClick={onClose}>
                    <FiX size={16} color="rgb(137,162,189)" />
                </button>

                <div className="glm-outer-border">
                    <div className="glm-inner-card">
                        <div className="glm-grad-tr" />
                        <div className="glm-grad-bl" />
                        <div className="glm-header">
                            <div className="glm-gloss glm-gloss-1" />
                            <div className="glm-gloss glm-gloss-2" />
                            <span className="glm-header-text">GROWTH PATH</span>
                        </div>

                        <div className="glm-list">
                            {loading ? (
                                <div className="glm-placeholder"><Spinner /></div>
                            ) : ranks.length === 0 ? (
                                <div className="glm-placeholder">No ranks configured.</div>
                            ) : (
                                ranks.map((tier) => {
                                    const isCurrentTier = tier.tierName === currentTierName;
                                    const allLevels = tier.ranks.flatMap(r => r.levels.map(l => l.level));
                                    const tierMin = allLevels.length ? Math.min(...allLevels) : 1;
                                    const tierMax = allLevels.length ? Math.max(...allLevels) : tierMin;

                                    return (
                                        <div
                                            key={tier.tierName}
                                            ref={isCurrentTier ? currentTierRef : null}
                                            className={`glm-tier${isCurrentTier ? ' glm-tier-current' : ''}`}
                                            onClick={() => setDetailTierName(tier.tierName)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="glm-roman-row">
                                                <span className="glm-roman">{toRoman(tierMin)}</span>
                                                <span className="glm-roman-sep">—</span>
                                                <span className="glm-roman">{toRoman(tierMax)}</span>
                                                {isCurrentTier && (
                                                    <IoScanOutline size={110} color="var(--bg)" className="glm-scan" />
                                                )}
                                            </div>
                                            <div className="glm-tier-bar">
                                                <div className="glm-gloss glm-gloss-1" />
                                                <div className="glm-gloss glm-gloss-2" />
                                                <span className="glm-tier-name">{tier.tierName}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="glm-bottom-bar" onClick={onClose}>
                            <div className="glm-gloss glm-gloss-1" />
                            <div className="glm-gloss glm-gloss-2" />
                            <span className="glm-cta-text">TAP A RANK TO SEE DETAILS</span>
                        </div>
                    </div>
                </div>
            </div>

            {detailTierName && (
                <DetailedLevelModal
                    agent={agent}
                    tierName={detailTierName}
                    onClose={() => setDetailTierName(null)}
                />
            )}
        </div>
    );
};

export default GlobalLevelModal;
