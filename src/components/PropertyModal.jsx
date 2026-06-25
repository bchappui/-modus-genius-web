import React, { useEffect, useState } from 'react'
import './PropertyModal.css'
import {
    MdDownload, MdTimer, MdTouchApp,
    MdFavorite, MdBookmark, MdChatBubble, MdStar,
} from 'react-icons/md'
import { FiX } from 'react-icons/fi'
import CardReader from './CardReader'

/* MCIcons "share" — curved right-arrow (not the 3-node Android variant) */
const MciShare = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="rgb(137,162,189)">
        <path d="M21,12L14,5V9C7,10 4,15 3,20C5.5,16.5 9,14.9 14,14.9V19L21,12Z" />
    </svg>
);

const LOGO_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0613d600165b2e3046/view?project=693e8acd001582e2562a';
const LEVEL_URL   = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69dbeadd003812623c70/view?project=693e8acd001582e2562a';
const MADE_BY_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';

const DECO_RINGS = [
    { size: 40,  bottom: 120, alpha: 0.2 },
    { size: 50,  bottom: 99,  alpha: 0.4 },
    { size: 60,  bottom: 77,  alpha: 0.6 },
    { size: 60,  bottom: 45,  alpha: 0.6 },
    { size: 50,  bottom: 35,  alpha: 0.4 },
    { size: 50,  bottom: 25,  alpha: 0.2 },
];

const STARS = [
    { x:   8, y:  50, size: 30, delay:    0 },
    { x: 290, y:  28, size: 24, delay:  350 },
    { x:   3, y: 165, size: 36, delay:  700 },
    { x: 294, y: 118, size: 28, delay:  150 },
    { x:  10, y: 295, size: 24, delay:  900 },
    { x: 284, y: 268, size: 32, delay:  500 },
    { x:   5, y: 405, size: 30, delay: 1200 },
    { x: 292, y: 420, size: 26, delay:  250 },
    { x:  14, y: 362, size: 28, delay:  800 },
    { x: 280, y: 345, size: 32, delay:  600 },
    { x:  52, y:  75, size: 20, delay: 1100 },
    { x: 258, y:  58, size: 20, delay:  450 },
];

const toRoman = (n) => {
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let out = '';
    for (let i = 0; i < vals.length; i++)
        while (n >= vals[i]) { out += syms[i]; n -= vals[i]; }
    return out;
};

/* Shared SVG gradient defs — referenced via fill="url(#id)" on icons */
const SvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            {/* Rainbow (warm → cool) used for stat values, reading time, action icons */}
            <linearGradient id="pm-g-rainbow" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%"   stopColor="rgb(130,45,5)" />
                <stop offset="26%"  stopColor="rgb(185,75,10)" />
                <stop offset="32%"  stopColor="rgb(235,145,35)" />
                <stop offset="38%"  stopColor="rgb(252,190,50)" />
                <stop offset="44%"  stopColor="rgb(255,225,50)" />
                <stop offset="56%"  stopColor="rgb(160,255,100)" />
                <stop offset="72%"  stopColor="rgb(55,220,255)" />
                <stop offset="100%" stopColor="rgb(195,125,255)" />
            </linearGradient>
            {/* Bright rainbow used for circle-button icons (heart/comment overlays) */}
            <linearGradient id="pm-g-circle" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%"   stopColor="rgb(255,200,60)" />
                <stop offset="25%"  stopColor="rgb(255,240,90)" />
                <stop offset="50%"  stopColor="rgb(190,255,120)" />
                <stop offset="75%"  stopColor="rgb(80,235,255)" />
                <stop offset="100%" stopColor="rgb(180,130,255)" />
            </linearGradient>
            {/* Touch-app icon gradient */}
            <linearGradient id="pm-g-touch" x1="0" y1="0.5" x2="1" y2="0.5">
                <stop offset="0%"   stopColor="rgb(255,0,120)" />
                <stop offset="33%"  stopColor="rgb(255,200,0)" />
                <stop offset="66%"  stopColor="rgb(0,220,180)" />
                <stop offset="100%" stopColor="rgb(120,0,255)" />
            </linearGradient>
            {/* Timer icon: same rainbow */}
            <linearGradient id="pm-g-timer" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%"   stopColor="rgb(130,45,5)" />
                <stop offset="26%"  stopColor="rgb(185,75,10)" />
                <stop offset="44%"  stopColor="rgb(255,225,50)" />
                <stop offset="72%"  stopColor="rgb(55,220,255)" />
                <stop offset="100%" stopColor="rgb(195,125,255)" />
            </linearGradient>
        </defs>
    </svg>
);

const PropertyModal = ({ property, onClose }) => {
    const [cardReaderOpen, setCardReaderOpen] = useState(false);

    useEffect(() => {
        setCardReaderOpen(false);
    }, [property?.$id]);

    useEffect(() => {
        if (!property) return;
        const onKey = (e) => {
            if (e.key === 'Escape' && !cardReaderOpen) onClose();
        };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [property, onClose, cardReaderOpen]);

    if (!property) return null;

    // Appwrite can return the agent relationship as an object, an array, or null
    const agent = Array.isArray(property.agent)
        ? property.agent[0] ?? null
        : (property.agent && typeof property.agent === 'object' ? property.agent : null);

    return (
        <>
        <div className="pm-overlay" onClick={onClose}>
            {/* SVG gradient definitions (hidden) */}
            <SvgDefs />

            <div className="pm-wrapper" onClick={e => e.stopPropagation()}>

                {/* ── TOP BAR ── */}
                <div className="pm-topbar">
                    <button className="pm-ctrl-btn">
                        <MdDownload size={20} color="rgb(137,162,189)" />
                    </button>
                    <button className="pm-ctrl-btn pm-ctrl-close" onClick={onClose}>
                        <FiX size={30} color="rgb(137,162,189)" />
                    </button>
                    <button className="pm-ctrl-btn">
                        <MciShare />
                    </button>
                </div>

                {/* ── OUTER CARD ── */}
                <div className="pm-card-outer">
                    <div className="pm-outer-gradient" />
                    <div className="pm-outer-fill" />

                    {/* ── INNER CARD ── */}
                    <div className="pm-card-inner">

                        {property.background && (
                            <img src={property.background} alt="" className="pm-bg-img" />
                        )}

                        <div className="pm-main-overlay" />

                        {/* CardShimmer — diagonal iridescent beam, matches CardShimmer.tsx */}
                        <div className="pm-shimmer">
                            <div className="pm-shimmer-mover">
                                <div className="pm-shimmer-beam" />
                            </div>
                        </div>

                        {/* ══ TOP SECTION ══ */}
                        <div className="pm-top">
                            <div className="pm-made-strip">
                                <div className="pm-made-gradient" />
                                <img src={MADE_BY_URL} className="pm-made-img" alt="" />
                            </div>
                            <div className="pm-gold-line-top" />
                            <div className="pm-logo-section">
                                <div className="pm-inner-border pm-inner-border-left" />
                                <div className="pm-inner-border pm-inner-border-right" />
                                <img src={LOGO_URL} className="pm-logo-img" alt="" />
                            </div>
                        </div>

                        {/* ══ ROMAN NUMERAL ══ — bottom: 130px, z-index removed so diamond sits on top */}
                        {property.cardNumber != null && (
                            <div className="pm-roman">
                                <span className="pm-roman-text">{toRoman(property.cardNumber)}</span>
                            </div>
                        )}

                        {/* ══ TWINKLING RAINBOW STARS ══ */}
                        {STARS.map((s, i) => (
                            <div
                                key={i}
                                className="pm-star"
                                style={{
                                    left: s.x,
                                    top: s.y,
                                    fontSize: s.size,
                                    animationDelay: `${s.delay}ms`,
                                }}
                            >✦</div>
                        ))}

                        {/* ══ OUTER GOLD VERTICAL BORDERS ══ */}
                        <div className="pm-outer-border-left" />
                        <div className="pm-outer-border-right" />

                        {/* ══ BOTTOM SECTION ══ */}
                        <div className="pm-bottom">
                            <div className="pm-bottom-main-gradient" />
                            <div className="pm-gold-separator" />
                            <img src={LEVEL_URL} className="pm-level-img" alt="" />
                            <div className="pm-side-cover" />

                            {/* Split gold lines — two segments with gap, like original SplitGoldLine */}
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
                                        width:  r.size,
                                        height: r.size,
                                        bottom: r.bottom,
                                        left:   `calc(50% - ${r.size / 2}px)`,
                                        borderColor: `rgba(201,151,44,${r.alpha})`,
                                    }}
                                />
                            ))}

                            <div className="pm-diamond">
                                <div className="pm-diamond-frame">
                                    <div className="pm-diamond-gold-gradient" />
                                    <div className="pm-diamond-img-wrapper">
                                        {agent?.avatar && (
                                            <img src={agent.avatar} className="pm-diamond-avatar" alt="" />
                                        )}
                                    </div>
                                </div>
                                {/* fade INSIDE so it's clipped by the rotated overflow:hidden */}
                                <div className="pm-diamond-fade" />
                            </div>

                            <div className="pm-name-row">
                                <span className="pm-agent-name">
                                    {agent?.name} {agent?.surname}
                                </span>
                            </div>

                            <div className="pm-certified">
                                <div className="pm-certified-badge">
                                    <div className="pm-certified-gradient" />
                                    <MdStar size={8} style={{ fill: 'rgb(201,86,42)', position: 'relative', zIndex: 1 }} />
                                    <span className="pm-certified-text">CERTIFIED</span>
                                    <MdStar size={8} style={{ fill: 'rgb(201,86,42)', position: 'relative', zIndex: 1 }} />
                                </div>
                            </div>
                        </div>

                        {/* ══ ABSOLUTE OVERLAYS ══ */}

                        {/* Property title — bottom-left */}
                        {property.name && (
                            <div className="pm-title-wrapper">
                                <span className="pm-title-text">{property.name}</span>
                            </div>
                        )}

                        {/* Like count + 3D circle (top-right) */}
                        <div className="pm-like-overlay">
                            <span className="pm-stat-count">0</span>
                            <div className="pm-circle-btn">
                                <div className="pm-circle-rainbow" />
                                <div className="pm-circle-specular" />
                                <MdFavorite size={18} style={{ position: 'relative', zIndex: 1, fill: 'url(#pm-g-circle) rgb(255,220,80)' }} />
                            </div>
                        </div>

                        {/* Comment count + 3D circle (top-left) */}
                        <div className="pm-comment-overlay">
                            <div className="pm-circle-btn">
                                <div className="pm-circle-rainbow" />
                                <div className="pm-circle-specular" />
                                <MdChatBubble size={18} style={{ position: 'relative', zIndex: 1, fill: 'url(#pm-g-circle) rgb(255,220,80)' }} />
                            </div>
                            <span className="pm-stat-count">0</span>
                        </div>

                        {/* Reading time — bottom-left */}
                        {property.readingtime != null && (
                            <div className="pm-readtime">
                                <MdTimer size={26} style={{ fill: 'url(#pm-g-timer) rgb(235,145,35)', opacity: 0.78 }} />
                                <span className="pm-readtime-number">{property.readingtime}</span>
                                <div className="pm-readtime-label">
                                    <span>MINS</span>
                                    <span>READ</span>
                                </div>
                            </div>
                        )}

                        {/* Actions panel — right side */}
                        <div className="pm-actions">
                            {/* Heart — gray (inactive) */}
                            <button className="pm-action-btn">
                                <MdFavorite size={27} style={{ fill: 'rgba(160,160,160,0.55)', opacity: 0.78 }} />
                            </button>
                            {/* Bookmark — gray (inactive) */}
                            <button className="pm-action-btn">
                                <MdBookmark size={26} style={{ fill: 'rgba(160,160,160,0.55)', opacity: 0.78 }} />
                            </button>
                            {/* Comment — rainbow */}
                            <button className="pm-action-btn">
                                <MdChatBubble size={23} style={{ fill: 'url(#pm-g-rainbow) rgb(55,220,255)', opacity: 0.78 }} />
                            </button>
                            {/* READ CARD — ripple + circle */}
                            <div className="pm-read-card-btn" onClick={() => setCardReaderOpen(true)} style={{ cursor: 'pointer' }}>
                                <div className="pm-ripple" />
                                <span className="pm-read-label">READ<br/>CARD</span>
                                <div className="pm-read-circle">
                                    <div className="pm-read-rainbow-bg" />
                                    <div className="pm-read-specular" />
                                    <MdTouchApp
                                        size={26}
                                        style={{
                                            position: 'relative', zIndex: 1,
                                            fill: 'url(#pm-g-touch) rgb(0,220,180)',
                                            transform: 'rotate(45deg)',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>{/* end pm-card-inner */}
                </div>{/* end pm-card-outer */}
            </div>
        </div>

        {cardReaderOpen && (
            <CardReader property={property} onClose={() => setCardReaderOpen(false)} />
        )}
        </>
    );
};

export default PropertyModal;
