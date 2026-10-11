import React, { useEffect, useState } from 'react'
import { FiLock, FiUnlock, FiClock } from 'react-icons/fi'
import { databases, DATABASE_ID, PROPERTIES_COLLECTION_ID } from '../../lib/appwrite.js'
import { enrichWithAgents } from '../../lib/properties.js'
import './HomePage.css'
import { getDeckProgress, markCardRead, unlockAllCards, resetDeckProgress, getCardStates, formatRemaining } from '../../lib/deckProgress.js'
import UnlockAllCardsModal from '../modals/UnlockAllCardsModal.jsx'

// Diamond marker next to each card name (as on the mock-up): a thick
// diamond frame, a dark gap, and a solid diamond inside — rainbow when
// unlocked, grey when locked.
const DIAMOND_OUTER = 'M50 2 L98 50 L50 98 L2 50 Z M50 17 L83 50 L50 83 L17 50 Z';
const DIAMOND_INNER = 'M50 25 L75 50 L50 75 L25 50 Z';
const Diamond = ({ unlocked }) => (
    <svg className="sa-track-diamond" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
            <linearGradient id="sa-diamond-frame" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#b04a08" />
                <stop offset="25%" stopColor="#f0a024" />
                <stop offset="45%" stopColor="#ebe048" />
                <stop offset="62%" stopColor="#9ce38a" />
                <stop offset="80%" stopColor="#56c6f4" />
                <stop offset="100%" stopColor="#56c6f4" />
            </linearGradient>
            <linearGradient id="sa-diamond-core" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef9a2c" />
                <stop offset="40%" stopColor="#f6d43a" />
                <stop offset="70%" stopColor="#b6e05a" />
                <stop offset="100%" stopColor="#56c6f4" />
            </linearGradient>
        </defs>
        <path d={DIAMOND_OUTER} fillRule="evenodd" fill={unlocked ? 'url(#sa-diamond-frame)' : 'rgb(178, 184, 198)'} />
        <path d={DIAMOND_INNER} fill={unlocked ? 'url(#sa-diamond-core)' : 'rgb(178, 184, 198)'} />
    </svg>
);

// Placeholder shown until a card unlocks: a holographic gold card with a
// liquid-gold "?" — an angular stroke lit by an SVG specular filter
// (molten-metal highlights). It lies flat on the card, so it follows the
// card's 3D tilt.
// The angular "?" drawn on locked cards.
const QUESTION_MARK = (
    <>
        {/* Angular "?": straight facets with sharp mitred corners, a squared-off
            stem and a diamond-cut dot — still lit as liquid gold. */}
        <path d="M28 40 L36 18 L64 18 L74 32 L72 48 L52 60 L50 82"
            fill="none" stroke="url(#sa-q-gold)" strokeWidth="16" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="6" />
        <path d="M50 94 L60 106 L50 118 L40 106 Z" fill="url(#sa-q-gold)" />
    </>
);

// The final reward's symbol: an angular gift box (lid, box and ribbon as
// separate facets, two pointed bow loops) in the same liquid bronze as the "?".
const REWARD_GIFT = (
    <g fill="url(#sa-q-gold)">
        <path d="M50 44 L28 24 L32 44 Z" />
        <path d="M50 44 L72 24 L68 44 Z" />
        <path d="M16 46 H44 V58 H16 Z" />
        <path d="M56 46 H84 V58 H56 Z" />
        <path d="M22 61 H44 V104 H22 Z" />
        <path d="M56 61 H78 V104 H56 Z" />
        <path d="M47 46 H53 V104 H47 Z" />
    </g>
);

const MysteryCard = ({ children = QUESTION_MARK, className = '' }) => (
    <div className={`sa-track-card3d sa-track-mystery ${className}`} aria-hidden="true">
        <svg className="sa-track-mystery-q" viewBox="0 0 100 130">
            <defs>
                <linearGradient id="sa-q-gold" gradientUnits="userSpaceOnUse" x1="20" y1="8" x2="62" y2="122">
                    {/* Dark bronze: deep browns with muted gold glints. */}
                    <stop offset="0%" stopColor="#1e1203" />
                    <stop offset="18%" stopColor="#8a6014" />
                    <stop offset="34%" stopColor="#3a2606" />
                    <stop offset="52%" stopColor="#a8792a" />
                    <stop offset="70%" stopColor="#2e1e05" />
                    <stop offset="86%" stopColor="#6e4c10" />
                    <stop offset="100%" stopColor="#170e02" />
                </linearGradient>
                <filter id="sa-q-liquid" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="blur" />
                    <feSpecularLighting in="blur" surfaceScale="7" specularConstant="1.1"
                        specularExponent="30" lightingColor="#f3d79a" result="spec">
                        <fePointLight x="-40" y="-60" z="140" />
                    </feSpecularLighting>
                    <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
                    <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.6" k4="0" />
                </filter>
            </defs>
            <g filter="url(#sa-q-liquid)">{children}</g>
        </svg>
        <span className="sa-track-card3d-sheen" />
    </div>
);

// Same-length stand-in for a locked card's name (keeps spaces and case).
const SCRAMBLE = 'aeiorstnlmdcupgbhvk';
const scrambleName = (name) => name.replace(/[A-Za-z0-9]/g, (ch, i) => {
    const c = SCRAMBLE[(ch.charCodeAt(0) * 7 + i * 3) % SCRAMBLE.length];
    return ch === ch.toUpperCase() && /[A-Z]/.test(ch) ? c.toUpperCase() : c;
});

const SHOW_UNLOCK_AFTER_PX = 200;

// The deck's Learning Track: cards in unlock order, alternating left/right.
// Card 1 is open from the start; each next card unlocks 24h after the
// previous one was first read (progress in Appwrite, see deckProgress.js).
// Unlocked cards open through onOpenCard — the site's usual card opening,
// with the same membership/quota rules as any other card.
const SelfAssessmentLearningTrack = ({ deck, agentId, onOpenCard, onGridViewChange }) => {
    const [cards, setCards] = useState(null);
    const [readAt, setReadAt] = useState([]);
    const [unlockedAll, setUnlockedAll] = useState(false);
    const [confirmUnlockAll, setConfirmUnlockAll] = useState(false);
    // The 3-per-row grid is only shown right after "Unlock All Cards Now" —
    // the deck always opens on its path, even once everything is unlocked.
    const [gridView, setGridView] = useState(false);
    const showGrid = () => {
        setGridView(true);
        onGridViewChange?.(true);
        window.scrollTo(0, 0);
    };
    const [now, setNow] = useState(Date.now());
    // "Unlock All Cards Now" only appears once the page has been scrolled a bit.
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > SHOW_UNLOCK_AFTER_PX);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all((deck.cardIds || []).map(id =>
            databases.getDocument(DATABASE_ID, PROPERTIES_COLLECTION_ID, id).catch(e => {
                console.error('Learning Track: could not load card', id, e);
                return null;
            })))
            .then(async docs => {
                const found = docs.filter(Boolean);
                // Author info is a nice-to-have: if it fails, still show the cards.
                try { return await enrichWithAgents(found); } catch (e) {
                    console.error('Learning Track: could not load card authors', e);
                    return found;
                }
            })
            .then(docs => { if (!cancelled) setCards(docs); });
        return () => { cancelled = true; };
    }, [deck]);

    useEffect(() => {
        let cancelled = false;
        // Dev-only ?saReset=1: start this deck over before loading its progress.
        const reset = import.meta.env.DEV && new URLSearchParams(window.location.search).get('saReset') === '1';
        (reset ? resetDeckProgress(agentId, deck.id) : Promise.resolve())
            .then(() => getDeckProgress(agentId, deck.id))
            .then(p => {
                if (cancelled) return;
                setReadAt(p.readAt);
                setUnlockedAll(p.unlockedAll);
            });
        return () => { cancelled = true; };
    }, [agentId, deck.id]);

    // Minute-level countdowns.
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    if (!cards) return <p className="ep-subtext sa-track-loading">Loading your Learning Track…</p>;
    if (!cards.length) return <p className="ep-subtext sa-track-loading">This Learning Track’s cards couldn’t be loaded. Please try again later.</p>;

    // One extra slot after the cards for the final reward: it follows the
    // same rule as a card (24h after the last card is read). "Unlock All
    // Cards Now" opens every card but forfeits the reward.
    const states = getCardStates(cards.length, readAt, now, unlockedAll);
    const reward = unlockedAll ? null : getCardStates(cards.length + 1, readAt, now)[cards.length];

    // Counts as read only if the card really opened (onOpenCard returns
    // false when the login/membership check stops it).
    const openCard = async (card, index) => {
        if (!states[index].unlocked) return;
        if (onOpenCard?.(card) === false) return;
        setReadAt(await markCardRead(agentId, deck.id, index, readAt));
    };

    // Right after "Unlock All Cards Now" (confirmed, or clicked again once
    // already unlocked): every card at once, 3 per row, with the
    // same thumbnails as Explore's results grid (.hp-hashtag-*).
    if (gridView) {
        return (
            <div className="ep-results-grid sa-deck-grid">
                {cards.map((card, i) => (
                    <button key={card.$id} className="hp-hashtag-item" onClick={() => openCard(card, i)}>
                        <img src={card.background || '/no-movie.png'} alt="" className="hp-hashtag-img" />
                        <div className="hp-hashtag-overlay" />
                        <span className="hp-hashtag-name">{card.name}</span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <>
            <ol className="sa-track">
                {cards.map((card, i) => {
                    const { unlocked, remainingMs, estimated } = states[i];
                    const timer = formatRemaining(unlocked ? 0 : remainingMs);
                    return (
                        <li key={card.$id} className={`sa-track-item${i % 2 ? ' sa-track-item--right' : ''}${unlocked ? '' : ' sa-track-item--locked'}`}>
                            {unlocked ? (
                                <button className="sa-track-card3d sa-track-thumb" onClick={() => openCard(card, i)} aria-label={`Open ${card.name}`}>
                                    {card.background
                                        ? <img src={card.background} alt="" />
                                        : <span className="sa-track-thumb-empty" />}
                                    {/* Name at the bottom of the card, like the card grids elsewhere (.hp-hashtag-*). */}
                                    <span className="hp-hashtag-overlay" />
                                    <span className="hp-hashtag-name sa-track-thumb-name">{card.name}</span>
                                    <span className="sa-track-card3d-sheen" />
                                </button>
                            ) : (
                                <MysteryCard />
                            )}
                            <div className="sa-track-info">
                                <div className="sa-track-badges">
                                    <span className={`sa-track-badge${unlocked ? ' sa-track-badge--on' : ''}`}>
                                        {unlocked ? <FiUnlock /> : <FiLock />}{unlocked ? 'Unlocked' : 'Locked'}
                                    </span>
                                    <span className={`sa-track-badge${unlocked ? ' sa-track-badge--on' : ''}`}
                                        title={estimated ? 'Earliest unlock, if you read each previous card as soon as it unlocks' : undefined}>
                                        <FiClock />{timer}
                                    </span>
                                </div>
                                <button
                                    className="sa-track-name-btn"
                                    onClick={() => openCard(card, i)}
                                    disabled={!unlocked}
                                >
                                    <Diamond unlocked={unlocked} />
                                    {/* Locked: the name is blurred — and what's blurred is scrambled
                                        text of the same shape, so it can't be read from the page either. */}
                                    {unlocked ? (
                                        <span className="sa-benefit-title sa-track-name">{card.name}</span>
                                    ) : (
                                        <span className="sa-track-name sa-track-name--off sa-track-name--blurred" aria-label="Locked card">
                                            {scrambleName(card.name)}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </li>
                    );
                })}
                {/* Final reward: after the last card, on the opposite side — the same
                    card as the locked ones, square, with a gift box instead of the "?". */}
                <li className={`sa-track-item sa-track-item--reward${cards.length % 2 ? ' sa-track-item--right' : ''}`}>
                    <MysteryCard className="sa-track-mystery--reward">{REWARD_GIFT}</MysteryCard>
                    <div className="sa-track-info">
                        <div className="sa-track-badges">
                            {reward ? (
                                <>
                                    <span className={`sa-track-badge${reward.unlocked ? ' sa-track-badge--on' : ''}`}>
                                        {reward.unlocked ? <FiUnlock /> : <FiLock />}{reward.unlocked ? 'Unlocked' : 'Locked'}
                                    </span>
                                    <span className={`sa-track-badge${reward.unlocked ? ' sa-track-badge--on' : ''}`}
                                        title={reward.estimated ? 'Earliest unlock, if you read each card as soon as it unlocks' : undefined}>
                                        <FiClock />{formatRemaining(reward.unlocked ? 0 : reward.remainingMs)}
                                    </span>
                                </>
                            ) : (
                                <span className="sa-track-badge"><FiLock />Forfeited</span>
                            )}
                        </div>
                        <div className="sa-track-name-btn sa-track-reward-name">
                            <Diamond unlocked={!!reward?.unlocked} />
                            <span className={reward?.unlocked ? 'sa-benefit-title sa-track-name' : 'sa-track-name sa-track-name--off'}>Reward</span>
                        </div>
                    </div>
                </li>
            </ol>

            {/* Pinned to the bottom of the screen, like "Get My Learning Plan".
                Once the deck is already unlocked, it goes straight to the grid. */}
            <div className={`sa-results-sticky sa-unlock-sticky${scrolled ? ' sa-unlock-sticky--shown' : ''}`}>
                <button
                    className="sa-continue-btn sa-results-cta"
                    onClick={() => (unlockedAll ? showGrid() : setConfirmUnlockAll(true))}
                    tabIndex={scrolled ? 0 : -1}
                >
                    Unlock All Cards Now
                </button>
            </div>
            {confirmUnlockAll && (
                <UnlockAllCardsModal
                    cardCount={cards.length}
                    onKeepPlan={() => setConfirmUnlockAll(false)}
                    onClose={() => setConfirmUnlockAll(false)}
                    onUnlock={async () => {
                        setConfirmUnlockAll(false);
                        setUnlockedAll(true);
                        showGrid();
                        await unlockAllCards(agentId, deck.id);
                    }}
                />
            )}
        </>
    );
};

export default SelfAssessmentLearningTrack;
