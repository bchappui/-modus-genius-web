import React, { useEffect, useRef, useState } from 'react'
import './CardHome.css'
import './AgentProfileCard.css'
import { MdDownload, MdFavorite, MdStar, MdTouchApp } from 'react-icons/md'
import { FiX } from 'react-icons/fi'
import ShareModal from '../modals/ShareModal.jsx'
import Spinner from '../shared/Spinner.jsx'
import AgentReadCard from './AgentReadCard.jsx'
import GlobalLevelModal from './GlobalLevelModal.jsx'
import { captureNode, downloadDataUrl } from '../../lib/domCapture.js'
import { databases, DATABASE_ID, AGENTS_COLLECTION_ID } from '../../lib/appwrite.js'
import { getDisplayedBadges, getFileViewUrl } from '../../lib/agents.js'
import { getUserProgress } from '../../lib/levels.js'
import { getStarsStatsForAgent } from '../../lib/stars.js'
import { countLikesForAgent } from '../../lib/likes.js'

const getFlagImageUrl = (isoCode) => (
    isoCode && isoCode.length === 2 ? `https://flagcdn.com/w80/${isoCode.toLowerCase()}.png` : null
);

/* MCIcons "share" — curved right-arrow, same glyph as CardHome's top bar */
const MciShare = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="rgb(137,162,189)">
        <path d="M21,12L14,5V9C7,10 4,15 3,20C5.5,16.5 9,14.9 14,14.9V19L21,12Z" />
    </svg>
);

const LOGO_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0613d600165b2e3046/view?project=693e8acd001582e2562a';
const LEVEL_URL   = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69dbeadd003812623c70/view?project=693e8acd001582e2562a';
const MADE_BY_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
/* Fixed rank-diamond background image — same for every agent/level, mirrors
   modus_genius's DIAMOND_URL constant (the level number renders on top of it). */
const DIAMOND_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a1c4f100011bbb241f0/view?project=693e8acd001582e2562a';

const DECO_RINGS = [
    { size: 40, bottom: 120, alpha: 0.2 },
    { size: 50, bottom: 99,  alpha: 0.4 },
    { size: 60, bottom: 77,  alpha: 0.6 },
    { size: 60, bottom: 45,  alpha: 0.6 },
    { size: 50, bottom: 35,  alpha: 0.4 },
    { size: 50, bottom: 25,  alpha: 0.2 },
];

const toRoman = (n) => {
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let out = '';
    for (let i = 0; i < vals.length; i++)
        while (n >= vals[i]) { out += syms[i]; n -= vals[i]; }
    return out;
};
const splitRoman = (s) => {
    if (s.length <= 3) return s;
    const mid = Math.floor(s.length / 2);
    return `${s.slice(0, mid)}\n${s.slice(mid)}`;
};

/* Shared SVG gradient defs — same stops as CardHome's, kept local here too
   so this overlay renders correctly even when opened on its own. */
const SvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="apc-g-circle" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%"   stopColor="rgb(255,200,60)" />
                <stop offset="25%"  stopColor="rgb(255,240,90)" />
                <stop offset="50%"  stopColor="rgb(190,255,120)" />
                <stop offset="75%"  stopColor="rgb(80,235,255)" />
                <stop offset="100%" stopColor="rgb(180,130,255)" />
            </linearGradient>
            {/* Touch-app icon gradient — same stops as CardHome's pm-g-touch */}
            <linearGradient id="apc-g-touch" x1="0" y1="0.5" x2="1" y2="0.5">
                <stop offset="0%"   stopColor="rgb(255,0,120)" />
                <stop offset="33%"  stopColor="rgb(255,200,0)" />
                <stop offset="66%"  stopColor="rgb(0,220,180)" />
                <stop offset="100%" stopColor="rgb(120,0,255)" />
            </linearGradient>
        </defs>
    </svg>
);

/* Mirrors modus_genius/components/BadgeCard.tsx's non-HOF branch (the only
   one populated by this app's awardDiscoverBadges-style flow): a square
   image with a rank/category caption baked on as an overlay. */
const AgentBadge = ({ badge, size = 70 }) => (
    <div className="apc-badge" style={{ width: size, height: size }}>
        {badge.fileId && <img src={getFileViewUrl(badge.fileId)} alt="" className="apc-badge-img" />}
        <div className="apc-badge-overlay">
            {badge.category && <span className="apc-badge-text">{badge.category.toUpperCase()}</span>}
            {badge.rank != null && <span className="apc-badge-text">{`TOP ${badge.rank}`}</span>}
            {badge.year != null && <span className="apc-badge-text">{badge.year}</span>}
        </div>
    </div>
);

// Agent's own "trading card" — opened by clicking an agent's diamond avatar
// anywhere in the app. Reuses CardHome.css's card-chrome classes (same gold
// borders, deco rings, shimmer, certified strip) with the agent's own photo
// as the background instead of a property's, plus a level-rank diamond,
// likes/stars totals, and up to 3 displayed badges. No connect/messaging —
// that depends on a friend system this app doesn't have yet.
const AgentProfileCard = ({ agentId, onClose }) => {
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [likesCount, setLikesCount] = useState(0);
    const [starsCount, setStarsCount] = useState(0);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [displayedBadges, setDisplayedBadges] = useState([]);
    const [shareOpen, setShareOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [readCardOpen, setReadCardOpen] = useState(false);
    const [levelPathOpen, setLevelPathOpen] = useState(false);
    const cardRef = useRef(null);

    useEffect(() => {
        if (!agentId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [agentDoc, likes, starsStats, progress, badges] = await Promise.all([
                    databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId),
                    countLikesForAgent(agentId),
                    getStarsStatsForAgent(agentId),
                    getUserProgress(agentId),
                    getDisplayedBadges(agentId),
                ]);
                if (cancelled) return;
                setAgent(agentDoc);
                setLikesCount(likes);
                setStarsCount(Object.values(starsStats).reduce((sum, v) => sum + v, 0));
                setCurrentLevel(progress?.currentLevel ?? 1);
                setDisplayedBadges(badges);
            } catch (e) {
                console.error('Error loading agent profile:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [agentId]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !shareOpen && !readCardOpen && !levelPathOpen) onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose, shareOpen, readCardOpen, levelPathOpen]);

    const handleDownload = async () => {
        if (downloading || !cardRef.current) return;
        setDownloading(true);
        try {
            const dataUrl = await captureNode(cardRef.current);
            const safeName = (agent ? `${agent.name}-${agent.surname}` : 'profile').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            downloadDataUrl(dataUrl, `${safeName || 'profile'}.png`);
        } catch (e) {
            console.error('Error generating image', e);
            alert('Could not generate the image.');
        } finally {
            setDownloading(false);
        }
    };

    if (!agentId) return null;

    return (
        <>
        <div className="pm-overlay" onClick={onClose}>
            <SvgDefs />
            <div className="pm-wrapper" onClick={e => e.stopPropagation()}>

                <div className="pm-topbar">
                    <button className="pm-ctrl-btn" onClick={handleDownload} disabled={downloading} style={{ cursor: downloading ? 'wait' : 'pointer', opacity: downloading ? 0.6 : 1 }}>
                        <MdDownload size={20} color="rgb(137,162,189)" />
                    </button>
                    <button className="pm-ctrl-btn pm-ctrl-close" onClick={onClose}>
                        <FiX size={30} color="rgb(137,162,189)" />
                    </button>
                    <button className="pm-ctrl-btn" onClick={() => setShareOpen(true)}>
                        <MciShare />
                    </button>
                </div>

                <div className="pm-card-outer" ref={cardRef}>
                    <div className="pm-outer-gradient" />
                    <div className="pm-outer-fill" />

                    <div className="pm-card-inner">
                        {agent?.avatar && <img src={agent.avatar} alt="" className="pm-bg-img" />}
                        <div className="pm-main-overlay" />
                        <div className="pm-shimmer">
                            <div className="pm-shimmer-mover">
                                <div className="pm-shimmer-beam" />
                            </div>
                        </div>

                        {loading ? (
                            <div className="apc-loading"><Spinner /></div>
                        ) : (
                            <>
                                <div className="pm-top">
                                    <div className="pm-made-strip">
                                        <div className="pm-made-gradient" />
                                        <img src={MADE_BY_URL} className="pm-made-img" alt="" />
                                    </div>
                                    <div className="pm-gold-line-top" />
                                    <div className="pm-logo-section">
                                        <div className="pm-inner-border pm-inner-border-left" />
                                        <div className="pm-inner-border pm-inner-border-right" />
                                        <img src={LOGO_URL} className="pm-logo-img apc-logo-small" alt="" />
                                    </div>
                                </div>

                                <div className="pm-outer-border-left" />
                                <div className="pm-outer-border-right" />

                                <div className="pm-bottom">
                                    <div className="pm-bottom-main-gradient" />
                                    <div className="pm-gold-separator" />
                                    <img src={LEVEL_URL} className="pm-level-img" alt="" />
                                    <div className="pm-side-cover" />

                                    {[
                                        { bottom: 110, lineW: 32, gapW: 47 },
                                        { bottom: 103, lineW: 52, gapW: 67 },
                                        { bottom: 97,  lineW: 92, gapW: 87 },
                                    ].map((s, i) => (
                                        <div key={i} className="pm-split-row" style={{ bottom: s.bottom }}>
                                            <div className="pm-split-seg" style={{ width: s.lineW }} />
                                            <div style={{ width: s.gapW }} />
                                            <div className="pm-split-seg" style={{ width: s.lineW }} />
                                        </div>
                                    ))}

                                    {DECO_RINGS.map((r, i) => (
                                        <div
                                            key={i}
                                            className="pm-deco-ring"
                                            style={{
                                                width: r.size, height: r.size, bottom: r.bottom,
                                                left: `calc(50% - ${r.size / 2}px)`,
                                                borderColor: `rgba(201,151,44,${r.alpha})`,
                                            }}
                                        />
                                    ))}

                                    {/* Level diamond — same frame as CardHome's avatar diamond, but shows
                                        the agent's current rank image + a rainbow roman-numeral level */}
                                    <div className="pm-diamond" onClick={() => setLevelPathOpen(true)} style={{ cursor: 'pointer' }}>
                                        <div className="pm-diamond-frame">
                                            <div className="pm-diamond-gold-gradient" />
                                            <div className="apc-level-diamond-inner">
                                                <img src={DIAMOND_URL} className="apc-level-diamond-img" alt="" />
                                                <div className="apc-level-diamond-dim" />
                                                <span className="apc-roman-numeral">{splitRoman(toRoman(currentLevel))}</span>
                                            </div>
                                        </div>
                                        <div className="pm-diamond-fade" />
                                    </div>

                                    <div className="pm-name-row">
                                        <span className="pm-agent-name">{agent?.name} {agent?.surname}</span>
                                    </div>

                                    {agent?.Location && getFlagImageUrl(agent.Location) && (
                                        <img src={getFlagImageUrl(agent.Location)} alt={agent.Location} className="pm-agent-flag" />
                                    )}

                                    <div className="pm-certified">
                                        <div className="pm-certified-badge">
                                            <div className="pm-certified-gradient" />
                                            <MdStar size={8} style={{ fill: 'rgb(201,86,42)', position: 'relative', zIndex: 1 }} />
                                            <span className="pm-certified-text">CERTIFIED</span>
                                            <MdStar size={8} style={{ fill: 'rgb(201,86,42)', position: 'relative', zIndex: 1 }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Likes — top-left */}
                                <div className="pm-comment-overlay">
                                    <div className="pm-circle-btn">
                                        <div className="pm-circle-rainbow" />
                                        <div className="pm-circle-specular" />
                                        <MdFavorite size={22} style={{ position: 'relative', zIndex: 1, fill: 'url(#apc-g-circle) rgb(255,220,80)' }} />
                                    </div>
                                    <span className="pm-stat-count">{likesCount}</span>
                                </div>

                                {/* Stars — top-right */}
                                <div className="pm-like-overlay">
                                    <span className="pm-stat-count">{starsCount}</span>
                                    <div className="pm-circle-btn">
                                        <div className="pm-circle-rainbow" />
                                        <div className="pm-circle-specular" />
                                        <MdStar size={22} style={{ position: 'relative', zIndex: 1, fill: 'url(#apc-g-circle) rgb(255,220,80)' }} />
                                    </div>
                                </div>

                                {displayedBadges.length > 0 && (
                                    <div className="apc-badges-row">
                                        {displayedBadges.map(badge => (
                                            <AgentBadge key={badge.$id} badge={badge} />
                                        ))}
                                    </div>
                                )}

                                {agent?.title && (
                                    <div className="apc-title-wrapper">
                                        <span className="apc-title-text">{agent.title}</span>
                                    </div>
                                )}

                                {/* Actions panel — Read Card only (no connect/messaging) */}
                                <div className="pm-actions">
                                    <div className="pm-read-card-btn" onClick={() => setReadCardOpen(true)} style={{ cursor: 'pointer' }}>
                                        <div className="pm-ripple" />
                                        <span className="pm-read-label">READ<br />CARD</span>
                                        <div className="pm-read-circle">
                                            <div className="pm-read-rainbow-bg" />
                                            <div className="pm-read-specular" />
                                            <MdTouchApp
                                                size={26}
                                                style={{
                                                    position: 'relative', zIndex: 1,
                                                    fill: 'url(#apc-g-touch) rgb(0,220,180)',
                                                    transform: 'rotate(45deg)',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {shareOpen && (
            <ShareModal id={agentId} name={agent ? `${agent.name} ${agent.surname}` : undefined} paramName="agent" onClose={() => setShareOpen(false)} />
        )}

        {readCardOpen && (
            <AgentReadCard agent={agent} onClose={() => setReadCardOpen(false)} />
        )}

        {levelPathOpen && (
            <GlobalLevelModal agent={agent} currentLevel={currentLevel} onClose={() => setLevelPathOpen(false)} />
        )}

        {downloading && (
            <div className="pm-download-overlay">
                <div className="pm-download-modal">
                    <Spinner />
                    <p className="pm-download-title">Generating image…</p>
                    <p className="pm-download-hint">This can take a few seconds.</p>
                </div>
            </div>
        )}
        </>
    );
};

export default AgentProfileCard;
