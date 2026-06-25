import React, { useState, useRef, useEffect } from 'react'
import { MdDownload, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdFavorite, MdChatBubble } from 'react-icons/md'
import './CardReader.css'

const LOGOCENTER_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';
const MADE_BY_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';

/* ── Share icon (same curved arrow as PropertyModal's MciShare) ── */
const ShareIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="rgb(137,162,189)">
        <path d="M21,12L14,5V9C7,10 4,15 3,20C5.5,16.5 9,14.9 14,14.9V19L21,12Z" />
    </svg>
);

/* ── Text chunking ── */
const CHARS = 220;

function generateCards(property) {
    const thisgetsyou = property?.thisgetsyou || '';
    const description = property?.description || '';
    const keepinmind  = property?.keepinmind  || '';
    const cardImages  = Array.isArray(property?.cardImages) ? property.cardImages : [];

    const cards = [];

    if (thisgetsyou) {
        cards.push({ type: 'thisgetsyou', text: thisgetsyou, img: cardImages[0]?.trim() || null });
    }

    const desc = description.trim();
    if (desc) {
        let rem = desc, idx = 1;
        while (rem.length > 0) {
            const img = cardImages[idx]?.trim() || null;
            let chunk;
            if (rem.length <= CHARS) {
                chunk = rem;
            } else {
                const cut = rem.substring(0, CHARS).lastIndexOf(' ');
                chunk = cut > CHARS * 0.7 ? rem.substring(0, cut) : rem.substring(0, CHARS);
            }
            cards.push({ type: 'description', text: chunk.trim(), img });
            rem = rem.substring(chunk.length).trim();
            idx++;
        }
    }

    if (keepinmind) {
        cards.push({ type: 'keepinmind', text: keepinmind, img: null });
    }

    if (cards.length === 0) {
        cards.push({
            type: 'description',
            text: property?.name || 'No content',
            img: property?.background || null,
        });
    }

    return cards;
}

const CardReader = ({ property, onClose }) => {
    const agent = Array.isArray(property?.agent)
        ? (property.agent[0] ?? null)
        : (property?.agent && typeof property.agent === 'object' ? property.agent : null);

    const cards = generateCards(property);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollRef = useRef(null);

    // ── Scroll tracking ──
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const idx = Math.round(el.scrollLeft / el.clientWidth);
            setCurrentIndex(Math.max(0, Math.min(idx, cards.length - 1)));
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [cards.length]);

    // ── Page navigation ──
    const goTo = (idx) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
    };
    const goPrev = () => { if (currentIndex > 0) goTo(currentIndex - 1); };
    const goNext = () => { if (currentIndex < cards.length - 1) goTo(currentIndex + 1); };

    // ── Mouse drag (swipe with mouse like finger) ──
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragScrollLeft = useRef(0);

    const onMouseDown = (e) => {
        const el = scrollRef.current;
        if (!el) return;
        isDragging.current = true;
        dragStartX.current = e.clientX;
        dragScrollLeft.current = el.scrollLeft;
        el.dataset.dragging = 'true';
    };
    const onMouseMove = (e) => {
        if (!isDragging.current || !scrollRef.current) return;
        e.preventDefault();
        scrollRef.current.scrollLeft = dragScrollLeft.current - (e.clientX - dragStartX.current);
    };
    const onDragEnd = () => {
        if (!scrollRef.current) return;
        isDragging.current = false;
        delete scrollRef.current.dataset.dragging;
    };

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="cr-overlay" onClick={onClose}>
            <div className="cr-container" onClick={e => e.stopPropagation()}>

                {/* ── TOP BUTTONS (download / ← / share) — same as pm-topbar ── */}
                <div className="cr-topbar">
                    <button className="cr-ctrl-btn">
                        <MdDownload size={20} color="rgb(137,162,189)" />
                    </button>
                    <button className="cr-ctrl-btn cr-ctrl-back" onClick={onClose}>
                        <MdKeyboardArrowLeft size={30} color="rgb(137,162,189)" />
                    </button>
                    <button className="cr-ctrl-btn">
                        <ShareIcon />
                    </button>
                </div>

                {/* ── CARD ROW: prev btn + card + next btn ── */}
                <div className="cr-card-row">

                    <button
                        className="cr-nav-btn"
                        onClick={goPrev}
                        disabled={currentIndex === 0}
                        aria-label="Previous"
                    >
                        <MdKeyboardArrowLeft size={30} color="rgb(137,162,189)" />
                    </button>

                {/* ── CHROME OUTER ── */}
                <div className="cr-outer">
                    <div className="cr-inner">

                        {/* corner notif glows — same as CardWrapper gradientOverlayTop/Bottom */}
                        <div className="cr-grad-tr" />
                        <div className="cr-grad-bl" />

                        {/* ── TOP BAR (CardTopBar) ── */}
                        <div className="cr-top">
                            <div className="cr-logo-rect" />
                            <div className="cr-top-bar">
                                <div className="cr-logo-placeholder" />
                                <div className="cr-madeby-area">
                                    <img src={MADE_BY_URL} className="cr-madeby-img" alt="" />
                                </div>
                            </div>
                            <div className="cr-top-row2">
                                <div className="cr-top-rect-spacer" />
                                <div className="cr-top-triangle" />
                            </div>
                            {/* logo absolute above cr-top-row2 (z=4 > z=3) */}
                            <div className="cr-logo-area">
                                <div className="cr-logo-img" style={{ backgroundImage: `url(${LOGOCENTER_URL})` }} />
                            </div>
                        </div>

                        {/* ── CONTENT SCROLL ── */}
                        <div
                            className="cr-scroll"
                            ref={scrollRef}
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={onDragEnd}
                            onMouseLeave={onDragEnd}
                        >
                            {cards.map((card, i) => (
                                <div key={i} className="cr-page">
                                    <div className="cr-page-text">
                                        {(card.type === 'thisgetsyou' || card.type === 'keepinmind') && (
                                            <span className="cr-section-label">
                                                {card.type === 'thisgetsyou' ? 'This Gets You' : 'Keep In Mind'}
                                            </span>
                                        )}
                                        <p className={`cr-body cr-body--${card.type}`}>{card.text}</p>
                                    </div>
                                    {card.img && (
                                        <div className="cr-page-img">
                                            <img src={card.img} alt="" className="cr-float-img" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* ── PAGINATION ── */}
                        <div className="cr-pagination">
                            <div className="cr-dots">
                                {cards.map((_, i) => (
                                    <div key={i} className={`cr-dot${i === currentIndex ? ' cr-dot--on' : ''}`} />
                                ))}
                            </div>
                            <div className="cr-counter">{currentIndex + 1}/{cards.length}</div>
                        </div>

                        {/* ── BOTTOM BAR (CardBottomBar) ── */}
                        <div className="cr-bot">
                            {/* container1 — 30px connector row (triangle above the bar, right side) */}
                            <div className="cr-bot-conn" />
                            {/* author bar */}
                            <div className="cr-bot-bar">
                                {/* Left: heart + comment */}
                                <div className="cr-bot-actions">
                                    <button className="cr-icon-btn">
                                        <MdFavorite size={21} className="cr-heart" />
                                    </button>
                                    <button className="cr-icon-btn">
                                        <MdChatBubble size={19} className="cr-comment" />
                                    </button>
                                </div>
                                {/* Center: agent name */}
                                <div className="cr-name-area">
                                    <span className="cr-agent-name">
                                        {agent?.name} {agent?.surname}
                                    </span>
                                </div>
                                {/* Right slot — occupied by absolute diamond */}
                                <div className="cr-diamond-placeholder" />
                            </div>

                            {/* Diamond avatar — straddles connector / bar boundary */}
                            <div className="cr-diamond-slot">
                                <div className="cr-diamond">
                                    <div className="cr-diamond-gold" />
                                    <div className="cr-diamond-frame">
                                        {agent?.avatar && (
                                            <img src={agent.avatar} className="cr-avatar" alt="" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>{/* end cr-inner */}
                </div>{/* end cr-outer */}

                    <button
                        className="cr-nav-btn"
                        onClick={goNext}
                        disabled={currentIndex === cards.length - 1}
                        aria-label="Next"
                    >
                        <MdKeyboardArrowRight size={30} color="rgb(137,162,189)" />
                    </button>

                </div>{/* end cr-card-row */}

            </div>
        </div>
    );
};

export default CardReader;
