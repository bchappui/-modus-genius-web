import React, { useState, useRef, useEffect, useLayoutEffect, forwardRef, useImperativeHandle } from 'react'
import { flushSync } from 'react-dom'
import { MdDownload, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdFavorite, MdChatBubble } from 'react-icons/md'
import './CardReader.css'
import CommentsOverlay from './CommentsOverlay'
import ShareModal from '../modals/ShareModal'
import { captureNode, downloadDataUrl } from '../../lib/domCapture.js'

const LOGOCENTER_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';
const MADE_BY_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';

/* ── Share icon (same curved arrow as CardHome's MciShare) ── */
const ShareIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="rgb(137,162,189)">
        <path d="M21,12L14,5V9C7,10 4,15 3,20C5.5,16.5 9,14.9 14,14.9V19L21,12Z" />
    </svg>
);

/* ── Text chunking ──
   Description pages are split by measuring the real rendered text height
   (splitByHeight, run in the reader on the viewer's own device), so a page
   can never run under the pagination dots, whatever the line breaks, word
   lengths or font rendering. The card is a fixed 330×587 box that is only
   scaled as a whole on small screens, so the measure holds on every phone.
   splitByChars is only the first-render fallback until that measure runs. */

// Fallback sizes: a page with an image keeps the top half for text.
const CHARS = 220;
const CHARS_NO_IMG = 440;
// Share of a page's text height left to text when the page has an image.
const IMG_TEXT_SHARE = 0.5;
// Gap kept between the last line and the pagination dots, in px.
const TEXT_SAFETY_PX = 4;

// Nicest place to end a page whose text is `head`: the last line break, else
// the last sentence end — only if that keeps the page at least half full.
// Returns -1 when neither is in reach.
function preferredBreak(head) {
    const min = head.length * 0.5;
    const nl = head.lastIndexOf('\n');
    if (nl >= min) return nl;
    let sentence = -1;
    for (const m of head.matchAll(/[.!?…]+[»"”)]*(?=\s)/g)) sentence = m.index + m[0].length;
    return sentence >= min ? sentence : -1;
}

function splitByChars(text, hasImgAt) {
    const pages = [];
    let rem = text, idx = 1;
    while (rem) {
        const limit = hasImgAt(idx) ? CHARS : CHARS_NO_IMG;
        let cut = rem.length;
        if (rem.length > limit) {
            const head = rem.substring(0, limit);
            const space = head.lastIndexOf(' ');
            cut = preferredBreak(head);
            if (cut < 0) cut = space >= limit * 0.7 ? space : limit;
        }
        pages.push(rem.substring(0, cut).trim());
        rem = rem.substring(cut).trim();
        idx++;
    }
    return pages;
}

// `measure(text)` returns the height that text takes on a page; `budgetAt(idx)`
// the height page idx has for it. Each page takes the most words that fit
// (binary search over word ends), then backs up to a line break or sentence
// end when one is in reach.
function splitByHeight(text, budgetAt, measure) {
    const pages = [];
    let rem = text, idx = 1;
    while (rem) {
        const budget = budgetAt(idx);
        if (measure(rem) <= budget) { pages.push(rem); break; }

        const ends = [...rem.matchAll(/\S+/g)].map(m => m.index + m[0].length);
        let lo = 0, hi = ends.length - 1, best = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (measure(rem.substring(0, ends[mid])) <= budget) { best = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        // Not even one word fits (absurdly long word): take it anyway so we advance.
        let cut = ends[Math.max(best, 0)];
        if (best >= 0) {
            const nicer = preferredBreak(rem.substring(0, cut));
            if (nicer > 0) cut = nicer;
        }
        pages.push(rem.substring(0, cut).trim());
        rem = rem.substring(cut).trim();
        idx++;
    }
    return pages;
}

const SECTIONS = ['thisgetsyou', 'description', 'keepinmind'];
const SECTION_LABELS = { thisgetsyou: 'This Gets You', keepinmind: 'Keep In Mind' };

// Image of page `page` (1-based) of a section: This Gets You's first page uses
// cardImages[0], description page i uses cardImages[i]; Keep In Mind has none.
function sectionImage(type, page, cardImages) {
    const at = (i) => cardImages[i]?.trim() || null;
    if (type === 'thisgetsyou') return page === 1 ? at(0) : null;
    if (type === 'description') return at(page);
    return null;
}

// measured: { [section]: string[] } pages from splitByHeight, or null before
// the first measure — then the description falls back to char counts and the
// other sections stay on one page each.
function generateCards(property, measured) {
    const cardImages = Array.isArray(property?.cardImages) ? property.cardImages : [];
    const cards = [];

    for (const type of SECTIONS) {
        const text = (property?.[type] || '').trim();
        if (!text) continue;
        const pages = measured?.[type]
            ?? (type === 'description'
                ? splitByChars(text, (i) => !!sectionImage(type, i, cardImages))
                : [text]);
        pages.forEach((t, i) => cards.push({ type, text: t, img: sectionImage(type, i + 1, cardImages) }));
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

const CardReader = forwardRef(({
    property, onClose, currentUserName, currentUserAvatar, onCommentCountChange,
    isLiked, onToggleLike, hasCommented, onOwnCommentChange,
}, ref) => {
    const agent = Array.isArray(property?.agent)
        ? (property.agent[0] ?? null)
        : (property?.agent && typeof property.agent === 'object' ? property.agent : null);

    const scrollRef = useRef(null);
    const paginationRef = useRef(null);
    const measureColRef = useRef(null);
    const measureLabelRef = useRef(null);
    const measureBodyRef = useRef(null);

    // ── Measured pages for every text section (see splitByHeight) ──
    const cardImages = Array.isArray(property?.cardImages) ? property.cardImages : [];
    const sectionTexts = SECTIONS.map(type => (property?.[type] || '').trim());
    const contentKey = sectionTexts.join('\u0000') + '\u0001' + cardImages.join('\n');
    const [measured, setMeasured] = useState(null);
    useLayoutEffect(() => {
        const run = () => {
            const col = measureColRef.current, label = measureLabelRef.current, body = measureBodyRef.current;
            const scroll = scrollRef.current, pag = paginationRef.current;
            if (!col || !label || !body || !scroll || !pag) { setMeasured(null); return; }
            // offsetTop/offsetHeight ignore the scale() applied on small screens, so
            // this is the card's own layout height, the same on every device.
            const pageTop = scroll.offsetTop + (parseFloat(getComputedStyle(scroll.firstElementChild ?? scroll).paddingTop) || 0);
            const full = pag.offsetTop - pageTop - TEXT_SAFETY_PX;

            const result = {};
            SECTIONS.forEach((type, s) => {
                const text = sectionTexts[s];
                if (!text) return;
                // Same markup as a real page: section label (if any) above the body.
                label.textContent = SECTION_LABELS[type] ?? '';
                label.style.display = SECTION_LABELS[type] ? '' : 'none';
                body.className = `cr-body cr-body--${type}`;
                const measure = (t) => { body.textContent = t; return col.offsetHeight; };
                const budgetAt = (page) => sectionImage(type, page, cardImages) ? full * IMG_TEXT_SHARE : full;
                result[type] = splitByHeight(text, budgetAt, measure);
            });
            setMeasured(result);
        };
        run();
        // Web fonts can land after the first measure and change line widths.
        let alive = true;
        document.fonts?.ready.then(() => { if (alive) run(); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentKey]);

    const cards = generateCards(property, measured);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [commentsOpen, setCommentsOpen] = useState(false);
    // Non-null while exporting: only this page is mounted in cr-scroll (see render below).
    // html-to-image clones nodes for rasterizing and does NOT preserve scroll offsets of
    // descendants, so scrolling cr-scroll before capturing doesn't work — every capture
    // came out as page 1. Rendering exactly one page at a time sidesteps that entirely.
    const [captureIndex, setCaptureIndex] = useState(null);
    // cr-outer (330×587), not cr-inner — matches the size of the CardHome cover
    // page (pm-card-outer) captured by CardHome, so every PDF page is the same size.
    const outerRef = useRef(null);

    useImperativeHandle(ref, () => ({
        captureAllPages: async () => {
            const node = outerRef.current;
            if (!node) return [];
            const images = [];
            for (let i = 0; i < cards.length; i++) {
                flushSync(() => setCaptureIndex(i));
                images.push(await captureNode(node));
            }
            flushSync(() => setCaptureIndex(null));
            return images;
        },
    }), [cards.length]);

    // ── Download / share the page being read, as a PNG ──
    const [busy, setBusy] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    // null while capturing, undefined if the capture failed (link-only share).
    const [shareImage, setShareImage] = useState(null);
    const pageSlug = (i) => {
        const name = (property?.name || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'card';
        return `${name}-page-${i + 1}`;
    };
    // Same one-page render as captureAllPages, then back to the same page.
    const captureCurrentPage = async () => {
        const node = outerRef.current;
        if (!node) throw new Error('Reader not ready');
        const idx = currentIndex;
        flushSync(() => setCaptureIndex(idx));
        try {
            return await captureNode(node);
        } finally {
            flushSync(() => setCaptureIndex(null));
            const el = scrollRef.current;
            if (el) el.scrollLeft = idx * el.clientWidth;
            setCurrentIndex(idx);
        }
    };
    const handleDownload = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const idx = currentIndex;
            downloadDataUrl(await captureCurrentPage(), `${pageSlug(idx)}.png`);
        } catch (e) {
            console.error('Error generating page image', e);
            alert('Could not generate the image.');
        } finally {
            setBusy(false);
        }
    };
    const handleShare = async () => {
        if (busy) return;
        setBusy(true);
        setShareImage(null);
        setShareOpen(true);
        try {
            const idx = currentIndex;
            const blob = await (await fetch(await captureCurrentPage())).blob();
            setShareImage(new File([blob], `${pageSlug(idx)}.png`, { type: 'image/png' }));
        } catch (e) {
            console.error('Error generating share image', e);
            setShareImage(undefined);
        } finally {
            setBusy(false);
        }
    };

    const displayIndex = captureIndex ?? currentIndex;
    const pageCards = captureIndex !== null ? [cards[captureIndex]] : cards;

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
        const onKey = e => { if (e.key === 'Escape' && !commentsOpen) onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, commentsOpen]);

    return (
        <>
        <div className="cr-overlay" onClick={onClose}>
            <div className="cr-container" onClick={e => e.stopPropagation()}>

                {/* ── TOP BUTTONS (download / ← / share) — same as pm-topbar ── */}
                <div className="cr-topbar">
                    <button className="cr-ctrl-btn" onClick={handleDownload} disabled={busy} aria-label="Download this page" style={{ cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                        <MdDownload size={20} color="rgb(137,162,189)" />
                    </button>
                    <button className="cr-ctrl-btn cr-ctrl-back" onClick={onClose}>
                        <MdKeyboardArrowLeft size={30} color="rgb(137,162,189)" />
                    </button>
                    <button className="cr-ctrl-btn" onClick={handleShare} disabled={busy} aria-label="Share this page">
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
                <div className="cr-outer" ref={outerRef}>
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
                            {pageCards.map((card, i) => (
                                <div key={captureIndex ?? i} className="cr-page">
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

                        {/* Hidden copy of a page's text column (label + body), same
                            width and style, used only to measure text height (splitByHeight). */}
                        <div className="cr-measure" aria-hidden="true">
                            <div ref={measureColRef} className="cr-page-text">
                                <span ref={measureLabelRef} className="cr-section-label" />
                                <p ref={measureBodyRef} className="cr-body" />
                            </div>
                        </div>

                        {/* ── PAGINATION ── */}
                        <div className="cr-pagination" ref={paginationRef}>
                            <div className="cr-dots">
                                {cards.map((_, i) => (
                                    <div key={i} className={`cr-dot${i === displayIndex ? ' cr-dot--on' : ''}`} />
                                ))}
                            </div>
                            <div className="cr-counter">{displayIndex + 1}/{cards.length}</div>
                        </div>

                        {/* ── BOTTOM BAR (CardBottomBar) ── */}
                        <div className="cr-bot">
                            {/* container1 — 30px connector row (triangle above the bar, right side) */}
                            <div className="cr-bot-conn" />
                            {/* author bar */}
                            <div className="cr-bot-bar">
                                {/* Left: heart + comment */}
                                <div className="cr-bot-actions">
                                    <button className="cr-icon-btn" onClick={onToggleLike}>
                                        <MdFavorite
                                            size={21}
                                            className="cr-heart"
                                            style={{ color: isLiked ? 'var(--cr-gold)' : 'rgb(185,200,235)' }}
                                        />
                                    </button>
                                    <button className="cr-icon-btn" onClick={() => setCommentsOpen(true)}>
                                        <MdChatBubble
                                            size={19}
                                            className="cr-comment"
                                            style={{ color: hasCommented ? 'var(--cr-gold)' : 'rgb(185,200,235)' }}
                                        />
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

        {commentsOpen && (
            <CommentsOverlay
                property={property}
                currentUserName={currentUserName}
                currentUserAvatar={currentUserAvatar}
                onClose={() => setCommentsOpen(false)}
                onCommentCountChange={onCommentCountChange}
                onOwnCommentChange={onOwnCommentChange}
            />
        )}

        {shareOpen && (
            <ShareModal
                property={property}
                imageFile={shareImage}
                showDownload={false}
                shareText={`Check out "${property?.name}" on Modus Genius: ${window.location.origin}${window.location.pathname}?property=${property?.$id}`}
                onClose={() => setShareOpen(false)}
            />
        )}
        </>
    );
});

export default CardReader;
