import React, { useEffect, useMemo, useRef, useState } from 'react'
import './DetailedLevelModal.css'
import { FiX } from 'react-icons/fi'
import { BsLayersFill } from 'react-icons/bs'
import { mdiMarkerCheck } from '@mdi/js'
import { IoHeartCircle, IoScanOutline } from 'react-icons/io5'
import { MdStars } from 'react-icons/md'

/* Exact MaterialCommunityIcons "marker-check" glyph (via @mdi/js — MDI is
   the icon set MaterialCommunityIcons is built from), for pixel-parity with
   the reference's completed-level badge, since react-icons doesn't bundle
   MaterialCommunityIcons. */
const MarkerCheckIcon = ({ size = 40, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <path fill="url(#dlm-g-check)" d={mdiMarkerCheck} />
    </svg>
);
import Spinner from '../shared/Spinner.jsx'
import { getUserProgress, getLevelQuotas, calculateProgression, buildRanksFromAppwrite } from '../../lib/levels.js'

const toRoman = (n) => {
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let out = '';
    for (let i = 0; i < vals.length; i++)
        while (n >= vals[i]) { out += syms[i]; n -= vals[i]; }
    return out;
};

/* Same fixed rank-diamond image used elsewhere in this app (level diamonds on
   AgentProfileCard/AgentReadCard) — the gold face-on-black artwork shown
   inside the diamond when the agent has no avatar photo set. */
const DIAMOND_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a1c4f100011bbb241f0/view?project=693e8acd001582e2562a';
/* Exact badge images from modus_genius's detailedlevel.tsx top/bottom bars
   (Appwrite file IDs, not invented icons). */
const TOPBAR_BADGE_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69ea6a5f002721b9b075/view?project=693e8acd001582e2562a';
const BOTTOMBAR_BADGE_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69ea7ff00019ea90ba94/view?project=693e8acd001582e2562a';
/* The exact "completed level" halo glow image from detailedlevel.tsx,
   tinted to --bg via a CSS mask (mirrors RN's tintColor prop). */
const COMPLETE_HALO_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69ad3a86002fb6d87a85/view?project=693e8acd001582e2562a';

// Mirrors modus_genius's detailedlevel.tsx TIER_BG_MAP — the isometric maze
// artwork shown behind each rank's levels, keyed by tier name.
const TIER_BG_MAP = {
    'bronze':       'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f2aa003ba27e7d12/view?project=693e8acd001582e2562a',
    'silver':       'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f2170000e2686cde/view?project=693e8acd001582e2562a',
    'super elite':  'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f2240036a117cb76/view?project=693e8acd001582e2562a',
    'platinum':     'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f1ef001be8ed28d6/view?project=693e8acd001582e2562a',
    'or':           'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f1e3001de5a40b02/view?project=693e8acd001582e2562a',
    'gold':         'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f1e3001de5a40b02/view?project=693e8acd001582e2562a',
    'master':       'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f1d4000a7bb99880/view?project=693e8acd001582e2562a',
    'grand master': 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f19a0030c353c8b5/view?project=693e8acd001582e2562a',
    'grandmaster':  'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f19a0030c353c8b5/view?project=693e8acd001582e2562a',
    'genius':       'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f189002f5746853b/view?project=693e8acd001582e2562a',
    'emeraude':     'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f1690001ebf693d9/view?project=693e8acd001582e2562a',
    'emerald':      'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f1690001ebf693d9/view?project=693e8acd001582e2562a',
    'elite':        'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f15e0013ebd5da58/view?project=693e8acd001582e2562a',
    'diamond':      'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a06f1470029d516faf9/view?project=693e8acd001582e2562a',
};
const getTierBg = (tierName) => TIER_BG_MAP[tierName?.toLowerCase()?.trim()] ?? TIER_BG_MAP['bronze'];

// Opened by tapping a tier's rank bar in GlobalLevelModal — mirrors
// modus_genius's /levelpath/detailedlevel screen: every rank in that tier
// (and the ones around it) broken down level by level, with the agent's
// current level highlighted by their diamond avatar over that rank's maze
// artwork, and past levels marked complete.
const DetailedLevelModal = ({ agent, tierName, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(null);
    const [quotas, setQuotas] = useState({ hearts: [3, 4, 5, 6], stars: [1, 3, 5, 7] });
    const [ranks, setRanks] = useState([]);
    const [activeTierName, setActiveTierName] = useState(tierName || null);
    const levelRefs = useRef({});
    const tierRefs = useRef({});
    const listRef = useRef(null);

    useEffect(() => {
        if (!agent?.$id) { setLoading(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const [userProgress, levelQuotas, ranksData] = await Promise.all([
                    getUserProgress(agent.$id),
                    getLevelQuotas(),
                    buildRanksFromAppwrite(),
                ]);
                if (cancelled) return;
                setProgress(userProgress);
                setQuotas(levelQuotas);
                setRanks(ranksData);
            } catch (e) {
                console.error('DetailedLevelModal error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [agent?.$id]);

    const flattenedRanks = useMemo(() =>
        ranks.flatMap(tier => tier.ranks.map(rank => ({ ...rank, tierName: tier.tierName }))),
    [ranks]);

    const totalHearts = progress?.totalHearts ?? 0;
    const totalStars = progress?.totalStars ?? 0;
    const progression = calculateProgression(totalHearts, totalStars, quotas.hearts, quotas.stars);
    const levelScore = progression.globalLevel || 1;

    const targetLevel = useMemo(() => {
        if (tierName && flattenedRanks.length > 0) {
            const userRankInTier = flattenedRanks.find(r =>
                r.tierName?.toLowerCase() === tierName.toLowerCase() &&
                r.levels?.some(l => l.level === levelScore)
            );
            if (userRankInTier) return levelScore;
            const tier = flattenedRanks.find(r => r.tierName?.toLowerCase() === tierName.toLowerCase());
            if (tier?.levels?.length > 0) return tier.levels[0].level;
        }
        return levelScore;
    }, [tierName, flattenedRanks, levelScore]);

    useEffect(() => {
        if (loading || !targetLevel) return;
        const t = setTimeout(() => {
            levelRefs.current[targetLevel]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
        return () => clearTimeout(t);
    }, [loading, targetLevel]);

    // Seed the initial fixed background from whichever tier we're opening
    // into (the tapped tier, or the tier that owns the agent's current level).
    useEffect(() => {
        if (activeTierName || ranks.length === 0) return;
        if (tierName) { setActiveTierName(tierName); return; }
        for (const tier of ranks) {
            for (const rank of tier.ranks) {
                if (rank.levels.some(l => l.level === levelScore)) { setActiveTierName(tier.tierName); return; }
            }
        }
        setActiveTierName(ranks[0].tierName);
    }, [ranks, tierName, levelScore, activeTierName]);

    // Mirrors the reference's onScrollEnd/onScrollEndDrag — the background
    // image is fixed behind the list (it doesn't scroll with the levels);
    // only WHICH tier's image is shown updates, based on whichever tier
    // block is currently nearest the top of the visible list.
    const handleScroll = () => {
        const list = listRef.current;
        if (!list) return;
        const listTop = list.getBoundingClientRect().top;
        let closestTier = null;
        let closestDist = Infinity;
        for (const [name, el] of Object.entries(tierRefs.current)) {
            if (!el) continue;
            const dist = Math.abs(el.getBoundingClientRect().top - listTop);
            if (dist < closestDist) { closestDist = dist; closestTier = name; }
        }
        if (closestTier && closestTier !== activeTierName) setActiveTierName(closestTier);
    };

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="dlm-backdrop" onClick={onClose}>
            <div className="dlm-wrapper" onClick={e => e.stopPropagation()}>
                {/* Shared gradient def — a single instance reused by every
                   MarkerCheckIcon via url(#dlm-g-check); duplicating the same
                   id once per completed level (one per <svg>) is invalid SVG
                   and made most of them fail to resolve. */}
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                    <defs>
                        <linearGradient id="dlm-g-check" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="rgb(201,151,44)" />
                            <stop offset="50%" stopColor="rgb(246,207,129)" />
                            <stop offset="100%" stopColor="rgb(201,151,44)" />
                        </linearGradient>
                        {/* The reference wraps its layers icon in
                           GradientofGrey — a BLUE mask gradient (not
                           grey/gold; the icon's own color prop is only a
                           mask shape), darkened toward the edge tone. */}
                        <linearGradient id="dlm-g-layers" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgb(13,85,167)" />
                            <stop offset="35%" stopColor="rgb(30,95,175)" />
                            <stop offset="65%" stopColor="rgb(30,95,175)" />
                            <stop offset="100%" stopColor="rgb(13,85,167)" />
                        </linearGradient>
                    </defs>
                </svg>
                <button className="dlm-close" onClick={onClose}>
                    <FiX size={16} color="rgb(137,162,189)" />
                </button>

                <div className="dlm-outer-border">
                    <div className="dlm-inner-card">
                        <div className="dlm-topbar">
                            <div className="dlm-gloss dlm-gloss-1" />
                            <div className="dlm-gloss dlm-gloss-2" />
                            <div className="dlm-topbar-text">
                                <span className="dlm-topbar-label">YOU EARNED A TOTAL OF</span>
                                <div className="dlm-topbar-stats">
                                    <span className="dlm-topbar-num">{totalHearts}</span>
                                    <IoHeartCircle size={17} color="rgb(201,151,44)" />
                                    <span className="dlm-topbar-and">AND</span>
                                    <span className="dlm-topbar-num">{totalStars}</span>
                                    <MdStars size={17} color="rgb(201,151,44)" />
                                </div>
                            </div>
                            <img src={TOPBAR_BADGE_URL} alt="" className="dlm-badge-img" />
                        </div>

                        <div className="dlm-content-wrap">
                            <div
                                className="dlm-bg-fixed"
                                style={{ backgroundImage: `url(${getTierBg(activeTierName)})` }}
                            />
                            <div className="dlm-rank-dim" />
                            <div className="dlm-list" ref={listRef} onScroll={handleScroll}>
                            {loading ? (
                                <div className="dlm-placeholder"><Spinner /></div>
                            ) : ranks.length === 0 ? (
                                <div className="dlm-placeholder">No ranks configured.</div>
                            ) : (
                                ranks.map((tier) => (
                                    <div
                                        key={tier.tierName}
                                        ref={el => { tierRefs.current[tier.tierName] = el; }}
                                        className="dlm-tier-group"
                                    >
                                        {tier.ranks.map((rank, ri) => (
                                            <div key={`${rank.name}-${ri}`} className="dlm-rank">
                                                <div className="dlm-rank-header">
                                                    <div className="dlm-gloss dlm-gloss-1" />
                                                    <div className="dlm-gloss dlm-gloss-2" />
                                                    <span className="dlm-rank-name">{rank.name}</span>
                                                </div>
                                                {rank.levels.map((level) => {
                                                    const isCurrent = level.level === levelScore;
                                                    const isCompleted = level.level < levelScore;
                                                    return (
                                                        <div
                                                            key={level.level}
                                                            ref={el => { levelRefs.current[level.level] = el; }}
                                                            className={`dlm-level${isCurrent ? ' dlm-level-current' : ''}`}
                                                        >
                                                            {isCurrent ? (
                                                                <div className="dlm-current-level">
                                                                    <BsLayersFill size={88} className="dlm-layers-icon dlm-layers-behind" style={{ fill: 'url(#dlm-g-layers)' }} />
                                                                    <div className="dlm-current-float">
                                                                        <span className="dlm-level-pill">
                                                                            LEVEL <span className="dlm-level-pill-roman">{toRoman(level.level)}</span>
                                                                        </span>
                                                                        <div className="dlm-diamond-wrap">
                                                                            <IoScanOutline size={118} color="var(--bg)" className="dlm-scan" />
                                                                            <div className="dlm-diamond">
                                                                                <div className="dlm-diamond-frame">
                                                                                    <div className="dlm-diamond-gold" />
                                                                                    <div className="dlm-diamond-inner">
                                                                                        <img src={agent?.avatar || DIAMOND_URL} alt="" className="dlm-diamond-img" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : isCompleted ? (
                                                                <>
                                                                    <div className="dlm-level-tag dlm-level-tag-complete">
                                                                        <span>COMPLETE!</span>
                                                                        <span>LEVEL {toRoman(level.level)}</span>
                                                                    </div>
                                                                    <div className="dlm-complete-badge">
                                                                        <BsLayersFill size={88} className="dlm-layers-icon" style={{ fill: 'url(#dlm-g-layers)' }} />
                                                                        <div className="dlm-complete-overlay">
                                                                            <div className="dlm-complete-halo" style={{ maskImage: `url(${COMPLETE_HALO_URL})`, WebkitMaskImage: `url(${COMPLETE_HALO_URL})` }} />
                                                                            <div className="dlm-complete-disc" />
                                                                            <MarkerCheckIcon size={54} className="dlm-complete-check" />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="dlm-level-tag">LEVEL {toRoman(level.level)}</span>
                                                                    <BsLayersFill size={88} className="dlm-layers-icon" style={{ fill: 'url(#dlm-g-layers)' }} />
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                            </div>
                        </div>

                        <div className="dlm-bottom-bar">
                            <div className="dlm-gloss dlm-gloss-1" />
                            <div className="dlm-gloss dlm-gloss-2" />
                            <img src={BOTTOMBAR_BADGE_URL} alt="" className="dlm-badge-img" />
                            <div className="dlm-bottom-text">
                                <div className="dlm-bottom-row">
                                    <span className="dlm-bottom-label">GET</span>
                                    <span className="dlm-bottom-num">{progression.heartsNeeded ?? 0}</span>
                                    <IoHeartCircle size={17} color="rgb(201,151,44)" />
                                    <span className="dlm-bottom-label">OR</span>
                                    <span className="dlm-bottom-num">{progression.starsNeeded ?? 0}</span>
                                    <MdStars size={17} color="rgb(201,151,44)" />
                                </div>
                                <span className="dlm-bottom-label dlm-bottom-label-solo">TO LEVEL UP!</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailedLevelModal;
