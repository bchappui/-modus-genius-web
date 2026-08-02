import React, { useEffect, useRef, useState } from 'react'
import './CardHome.css'
import './QuoteHome.css'
import { MdDownload, MdChatBubble } from 'react-icons/md'
import { FiX } from 'react-icons/fi'
import QuoteCommentsOverlay from './QuoteCommentsOverlay'
import ShareModal from './ShareModal'
import Spinner from './Spinner'
import { captureNode, downloadDataUrl } from '../lib/domCapture.js'

/* MCIcons "share" — curved right-arrow (not the 3-node Android variant) */
const MciShare = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="rgb(137,162,189)">
        <path d="M21,12L14,5V9C7,10 4,15 3,20C5.5,16.5 9,14.9 14,14.9V19L21,12Z" />
    </svg>
);

/* Same gold gradient as GradientofGold2/GradientofGoldQuote (used to mask the
   comment icon in quotes/[id].tsx) — gradientUnits defaults to
   objectBoundingBox, so x1/y1/x2/y2 (0,0.2)→(1,1) match the RN start/end
   fractions relative to the icon's own box. */
const SvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="qc-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgb(246,207,129)" />
                <stop offset="50%"  stopColor="rgb(201,151,44)" />
                <stop offset="100%" stopColor="rgb(246,207,129)" />
            </linearGradient>
        </defs>
    </svg>
);

// Fontisto "quote-a-right" / "quote-a-left" glyphs (0xE9C1 / 0xE9C0) — same
// icon font quotes/[id].tsx uses for its two big decorative quote marks.
const QUOTE_ICON_LEFT = '';
const QUOTE_ICON_RIGHT = '';

const MADE_STRIP_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a061ad2000280965062/view?project=693e8acd001582e2562a';
const LOGO_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69dbffe2001ba1573ec1/view?project=693e8acd001582e2562a';
const LEVEL_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/69ad7bca0038fd466281/view?project=693e8acd001582e2562a';

const QuoteHome = ({
    quote, onClose, currentUserId, currentUserName, currentUserAvatar,
    onCommentCountChange, hasCommented, onOwnCommentChange,
}) => {
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const cardOuterRef = useRef(null);

    useEffect(() => {
        setCommentsOpen(false);
        setShareOpen(false);
    }, [quote?.$id]);

    const handleDownload = async () => {
        if (downloading || !quote || !cardOuterRef.current) return;
        setDownloading(true);
        try {
            const image = await captureNode(cardOuterRef.current);
            const safeName = (quote.author || 'quote').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            downloadDataUrl(image, `${safeName || 'quote'}.png`);
        } catch (e) {
            console.error('Error generating PNG', e);
            alert('Could not generate the image.');
        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        if (!quote) return;
        const onKey = (e) => {
            if (e.key === 'Escape' && !commentsOpen && !shareOpen) onClose();
        };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [quote, onClose, commentsOpen, shareOpen]);

    if (!quote) return null;

    return (
        <>
        <div className="pm-overlay" onClick={onClose}>
            <SvgDefs />
            <div className="pm-wrapper" onClick={e => e.stopPropagation()}>

                {/* ── TOP BAR ── */}
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

                {/* ── OUTER CARD — same shell as CardHome, 330×587 ── */}
                <div className="pm-card-outer" ref={cardOuterRef}>
                    <div className="pm-outer-gradient" />
                    <div className="pm-outer-fill" />

                    <div className="pm-card-inner qc-frame">

                        {quote.image && (
                            <img src={quote.image} alt="" className="qc-bg-img" />
                        )}

                        <div className="qc-main-overlay" />

                        <img src={LEVEL_URL} className="qc-level-img" alt="" />

                        <div className="qc-shimmer">
                            <div className="pm-shimmer-mover">
                                <div className="pm-shimmer-beam" />
                            </div>
                        </div>

                        {/* ══ TOP: strip + logo + gold line ══ */}
                        <div className="pm-top">
                            <div className="qc-made-strip">
                                <div className="pm-made-gradient" />
                                <img src={MADE_STRIP_URL} className="qc-made-img" alt="" />
                            </div>
                            <div className="qc-logo-row">
                                <img src={LOGO_URL} className="qc-logo-img" alt="" />
                            </div>
                            <div className="qc-gold-line" />
                        </div>

                        {/* ══ MIDDLE: quote + author signature ══ */}
                        <div className="qc-middle">
                            <div className="qc-quote-block">
                                <span className="qc-quote-icon qc-quote-icon-left">{QUOTE_ICON_LEFT}</span>
                                <span className="qc-quote-icon qc-quote-icon-right">{QUOTE_ICON_RIGHT}</span>
                                <p className="qc-quote-text">{quote.text}</p>
                            </div>
                            <div className="qc-author-row">
                                <span className="qc-author-name">
                                    {quote.author}{quote.surname ? ` ${quote.surname}` : ''}
                                </span>
                            </div>
                        </div>

                        {/* ══ COMMENT BUTTON (bottom center) ══ */}
                        <div className="qc-actions">
                            <div className="qc-ripple" />
                            <button className="qc-comment-btn" onClick={() => setCommentsOpen(true)}>
                                <div className="qc-comment-bg" />
                                <div className="qc-comment-specular" />
                                <MdChatBubble size={22} style={{ position: 'relative', zIndex: 1, fill: 'url(#qc-g-gold) rgb(246,207,129)' }} />
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        {commentsOpen && (
            <QuoteCommentsOverlay
                quote={quote}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserAvatar={currentUserAvatar}
                onClose={() => setCommentsOpen(false)}
                onCommentCountChange={onCommentCountChange}
                hasCommented={hasCommented}
                onOwnCommentChange={onOwnCommentChange}
            />
        )}

        {shareOpen && (
            <ShareModal id={quote.$id} name={quote.author} paramName="quote" onClose={() => setShareOpen(false)} />
        )}

        {downloading && (
            <div className="pm-download-overlay">
                <div className="pm-download-modal">
                    <Spinner />
                    <p className="pm-download-title">Generating image…</p>
                </div>
            </div>
        )}
        </>
    );
};

export default QuoteHome;
