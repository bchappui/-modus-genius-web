import React, { useEffect, useRef, useState } from 'react'
import { FaStar, FaBookmark, FaRegBookmark, FaCheck } from 'react-icons/fa'
import { MdChatBubble, MdOutlineImage, MdKeyboardArrowLeft, MdDeleteOutline } from 'react-icons/md'
import { IoSend } from 'react-icons/io5'
import { FiChevronDown, FiUser, FiX } from 'react-icons/fi'
import { SKILL_CATEGORIES, getCategoryImageUrl } from '../../lib/categories.js'
import { getAskById, createAsk, deleteReply, getAllAskReplies } from '../../lib/asks.js'
import { toggleReplyStar, getStarredReplyIds } from '../../lib/stars.js'
import Spinner from '../shared/Spinner.jsx'
import './CommunityPage.css'

// Building blocks shared by the public Community forum and each house's
// private forum (HousePages.jsx). The private forum passes its own
// create/load/delete functions and turns stars, gold badges and bookmarks off.

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const ICON_CARD_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa2eb3d003a33b8118b/view?project=693e8acd001582e2562a';
const ICON_GOLD_CHECK_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6ab58d15001ad3757c66/view?project=693e8acd001582e2562a';
// House ranking icon (Community's ranking column + the rank/points pill).
const ICON_TROPHY_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6abaccc6001747e7082d/view?project=693e8acd001582e2562a';
// Gold card icon (same file as ICON_CARD_URL) for the "All" category.
const ALL_CATEGORY_IMAGE_ID = '6aa2eb3d003a33b8118b';

const CATEGORIES = [{ key: 'All', imageFileId: ALL_CATEGORY_IMAGE_ID }, ...SKILL_CATEGORIES];
const CATEGORY_IMAGE = Object.fromEntries(CATEGORIES.map(c => [c.key, getCategoryImageUrl(c.imageFileId)]));

// Mirrors the app's AskCategories pills (New / Unanswered / Popular).
const SORTS = [
    { key: 'new', label: 'New' },
    { key: 'unanswered', label: 'Unanswered' },
    { key: 'popular', label: 'Popular' },
];

const PAGE_SIZE = 10;

const formatCount = (n) => {
    if (n == null) return '';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(n);
};

const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const Avatar = ({ src, size = 34 }) => (
    <span className="cmty-avatar" style={{ width: size, height: size }}>
        {src ? <img src={src} alt="" /> : <FiUser size={size * 0.5} />}
    </span>
);

const GoldCheck = ({ title }) => (
    <img src={ICON_GOLD_CHECK_URL} alt="" title={title} className="cmty-gold-check" />
);

// Shared "Comment" composer — used under a question (after clicking Reply)
// and at the bottom of the question's comments page.
const CommentBox = ({ onSubmit, autoFocus }) => {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const submit = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await onSubmit(text.trim());
            setText('');
        } finally {
            setSending(false);
        }
    };
    return (
        <div className="cmty-panel cmty-comment-box">
            <textarea
                className="cmty-input cmty-comment-input"
                placeholder="Comment"
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={1000}
                autoFocus={autoFocus}
            />
            <div className="cmty-composer-footer">
                <span />
                <button className="cmty-send-btn" onClick={submit} disabled={!text.trim() || sending} aria-label="Send">
                    {sending ? <Spinner /> : <IoSend size={24} />}
                </button>
            </div>
        </div>
    );
};

// ── "Ask a question" box ──
const AskComposer = ({ agentId, agentName, agentAvatar, onRequireAuth, onCreated, createFn = createAsk }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [menuOpen]);

    const guard = () => { if (!agentId) { onRequireAuth?.(); return false; } return true; };

    // Same required fields as the app's Ask a Question screen.
    const canSubmit = title.trim() && description.trim() && type && !sending;

    const submit = async () => {
        if (!guard()) return;
        if (!title.trim() || !description.trim() || !type) {
            setError('Please fill in the title, description and category.');
            return;
        }
        setSending(true);
        setError('');
        try {
            const ask = await createFn({ name: title.trim(), description: description.trim(), type, imageFile, agentId });
            onCreated?.(ask);
            setTitle(''); setDescription(''); setType(null); setImageFile(null);
        } catch (e) {
            console.error('createAsk error:', e);
            setError('Could not post your question.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="cmty-panel cmty-composer">
            <div className="cmty-composer-head">
                <div className="cmty-author">
                    <Avatar src={agentAvatar} />
                    <span className="cmty-author-name">{agentName || 'Guest'}</span>
                </div>
                <div className="cmty-dropdown" ref={menuRef}>
                    <button
                        className={`cmty-pill cmty-pill-btn cmty-dropdown-toggle${menuOpen ? ' cmty-pill--active' : ''}`}
                        onClick={() => guard() && setMenuOpen(o => !o)}
                        aria-haspopup="listbox"
                        aria-expanded={menuOpen}
                    >
                        <img src={type ? CATEGORY_IMAGE[type] : ICON_CARD_URL} alt="" className="cmty-pill-icon" />
                        <span className="cmty-pill-label">{type || 'Category'}</span>
                        <FiChevronDown size={14} className={`cmty-dropdown-chevron${menuOpen ? ' cmty-dropdown-chevron--open' : ''}`} />
                    </button>
                    {menuOpen && (
                        <div className="cmty-dropdown-menu" role="listbox">
                            <span className="cmty-dropdown-heading">Choose a category</span>
                            <div className="cmty-dropdown-list">
                                {SKILL_CATEGORIES.map(c => (
                                    <button
                                        key={c.key}
                                        role="option"
                                        aria-selected={type === c.key}
                                        className={`cmty-dropdown-item${type === c.key ? ' cmty-dropdown-item--active' : ''}`}
                                        onClick={() => { setType(c.key); setMenuOpen(false); }}
                                    >
                                        <img src={CATEGORY_IMAGE[c.key]} alt="" className="cmty-dropdown-icon" />
                                        <span className="cmty-dropdown-label">{c.key}</span>
                                        {type === c.key && <FaCheck size={11} className="cmty-dropdown-check" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <input
                className="cmty-input cmty-title-input"
                placeholder="Your Question Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onFocus={guard}
            />
            <textarea
                className="cmty-input cmty-desc-input"
                placeholder="Description..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                onFocus={guard}
                rows={2}
            />

            {error && <p className="cmty-error">{error}</p>}

            <div className="cmty-composer-footer">
                <div className="cmty-image-pick">
                    <button className="cmty-icon-btn" onClick={() => guard() && fileRef.current?.click()} aria-label="Add image">
                        <MdOutlineImage size={26} />
                    </button>
                    {imageFile && (
                        <span className="cmty-image-name">
                            {imageFile.name}
                            <button className="cmty-icon-btn" onClick={() => setImageFile(null)} aria-label="Remove image"><FiX size={14} /></button>
                        </span>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={e => { setImageFile(e.target.files?.[0] || null); e.target.value = ''; }}
                    />
                </div>
                <button className="cmty-send-btn" onClick={submit} disabled={!canSubmit} aria-label="Post question">
                    {sending ? <Spinner /> : <IoSend size={24} />}
                </button>
            </div>
        </div>
    );
};

// ── One question in the list ──
const AskCard = ({ ask, isBookmarked, onBookmark, onOpenComments, onReply, showImage = false, hideReply = false, showStars = true, showBookmark = true }) => (
    <article className="cmty-ask">
        <div className="cmty-ask-head">
            <div className="cmty-author">
                <Avatar src={ask.agent?.avatar} />
                <span className="cmty-author-name">{ask.agent?.name || 'Anonymous'}</span>
            </div>
            {ask.type && (
                <span className="cmty-pill">
                    <img src={CATEGORY_IMAGE[ask.type] || ICON_CARD_URL} alt="" className="cmty-pill-icon" />
                    <span className="cmty-pill-label">{ask.type}</span>
                </span>
            )}
        </div>
        <h3 className="cmty-ask-title">{ask.name}</h3>
        {ask.description && <p className="cmty-ask-desc">{ask.description}</p>}
        {showImage && ask.image && <img src={ask.image} alt="" className="cmty-ask-image" />}
        <div className="cmty-ask-footer">
            <div className="cmty-ask-stats">
                {showStars && (
                    <span className="cmty-stat" title="Total stars of the answers">
                        <FaStar size={20} /> {ask.totalStarCount ?? 0}
                    </span>
                )}
                <button className="cmty-stat cmty-stat-btn" onClick={onOpenComments} title="See all comments">
                    <MdChatBubble size={22} /> {ask.replyCount ?? 0}
                </button>
                {showBookmark && (
                    <button className={`cmty-stat cmty-stat-btn${isBookmarked ? ' cmty-stat--on' : ''}`} onClick={onBookmark} aria-label="Bookmark">
                        {isBookmarked ? <FaBookmark size={19} /> : <FaRegBookmark size={19} />}
                    </button>
                )}
            </div>
            {!hideReply && <button className="cmty-link-btn" onClick={onReply}>Reply</button>}
        </div>
    </article>
);

// ── A question's comments page ──
const AskDetail = ({
    askId, agentId, isBookmarked, onBookmark, onBack, onReply, onRequireAuth,
    loadAsk = getAskById, loadReplies = getAllAskReplies, deleteFn = deleteReply,
    enableStars = true, showBookmark = true,
}) => {
    const [ask, setAsk] = useState(null);
    const [replies, setReplies] = useState([]);
    const [starredIds, setStarredIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [pendingStar, setPendingStar] = useState(null);
    // Two-step delete: first click arms it, second click deletes.
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        (async () => {
            const [a, r] = await Promise.all([loadAsk(askId), loadReplies(askId)]);
            // Same order as the app: answers by most stars then newest,
            // replies-to-a-reply (parentReply) oldest first under their parent.
            const parents = r.filter(x => !x.parentReply).sort((x, y) => (y.starCount ?? 0) - (x.starCount ?? 0)
                || new Date(y.$createdAt) - new Date(x.$createdAt));
            const children = r.filter(x => x.parentReply).sort((x, y) => new Date(x.$createdAt) - new Date(y.$createdAt));
            const starred = enableStars ? await getStarredReplyIds(agentId, r.map(x => x.$id)) : new Set();
            if (cancelled) return;
            // Order is fixed here (not re-sorted on render) so starring doesn't make rows jump.
            setAsk(a); setReplies([...parents, ...children]); setStarredIds(starred); setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [askId, agentId]);

    const handleStar = async (reply) => {
        if (!agentId) { onRequireAuth?.(); return; }
        if (pendingStar) return;
        setPendingStar(reply.$id);
        try {
            const res = await toggleReplyStar(agentId, reply.$id);
            if (!res) return;
            setReplies(prev => prev.map(r => r.$id === reply.$id ? { ...r, starCount: res.starCount } : r));
            setStarredIds(prev => {
                const next = new Set(prev);
                if (res.starredByMe) next.add(reply.$id); else next.delete(reply.$id);
                return next;
            });
            setAsk(prev => prev ? { ...prev, totalStarCount: Math.max(0, (prev.totalStarCount ?? 0) + (res.starredByMe ? 1 : -1)) } : prev);
        } catch (e) {
            console.error('toggleReplyStar error:', e);
        } finally {
            setPendingStar(null);
        }
    };

    const handleComment = async (text) => {
        const res = await onReply(text);
        if (!res) return;
        setReplies(prev => [...prev, res.reply]);
        setAsk(prev => prev ? { ...prev, replyCount: res.replyCount } : prev);
    };

    const handleDelete = async (reply) => {
        if (confirmDeleteId !== reply.$id) { setConfirmDeleteId(reply.$id); return; }
        setDeletingId(reply.$id);
        try {
            const replyCount = await deleteFn(reply.$id);
            setReplies(prev => prev.filter(r => r.$id !== reply.$id));
            if (replyCount != null) setAsk(prev => prev ? { ...prev, replyCount } : prev);
        } catch (e) {
            console.error('deleteReply error:', e);
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    if (loading) return <div className="cmty-empty"><Spinner /></div>;
    if (!ask) return <p className="cmty-empty">This question no longer exists.</p>;

    const parents = replies.filter(r => !r.parentReply);
    const childrenOf = (id) => replies.filter(r => r.parentReply === id);

    // Gold badge: the single most-starred answer (only once it has a star).
    const top = parents.reduce((best, r) => ((r.starCount ?? 0) > (best?.starCount ?? 0) ? r : best), null);
    const topReplyId = enableStars && top && (top.starCount ?? 0) > 0 ? top.$id : null;

    const renderReply = (r, nested = false) => {
        const starred = starredIds.has(r.$id);
        return (
            <article key={r.$id} className={`cmty-reply${nested ? ' cmty-reply--nested' : ''}`}>
                <div className="cmty-ask-head">
                    <div className="cmty-author">
                        <Avatar src={r.avatar} size={nested ? 28 : 34} />
                        <span className="cmty-author-name">{r.name || 'Anonymous'}</span>
                        {r.$id === topReplyId && <GoldCheck title="Most starred answer" />}
                        <span className="cmty-date">{formatDate(r.$createdAt)}</span>
                    </div>
                    {enableStars && <button
                        className={`cmty-stat cmty-stat-btn cmty-vote${starred ? ' cmty-stat--on' : ''}`}
                        onClick={() => handleStar(r)}
                        disabled={pendingStar === r.$id}
                        title={starred ? 'Remove your star' : 'Give a star'}
                    >
                        <FaStar size={18} /> {r.starCount ?? 0}
                    </button>}
                </div>
                <p className="cmty-reply-text">{r.reply}</p>
                {agentId && r.agentId === agentId && (
                    <div className="cmty-reply-actions">
                        {confirmDeleteId === r.$id && deletingId !== r.$id && (
                            <button className="cmty-link-btn" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        )}
                        <button
                            className={`cmty-link-btn cmty-delete-btn${confirmDeleteId === r.$id ? ' cmty-delete-btn--confirm' : ''}`}
                            onClick={() => handleDelete(r)}
                            disabled={deletingId === r.$id}
                        >
                            <MdDeleteOutline size={16} />
                            {deletingId === r.$id ? 'Deleting…' : confirmDeleteId === r.$id ? 'Confirm delete' : 'Delete'}
                        </button>
                    </div>
                )}
            </article>
        );
    };

    return (
        <>
            <button className="cmty-link-btn cmty-back-btn" onClick={onBack}>
                <MdKeyboardArrowLeft size={20} /> Back to questions
            </button>

            <AskCard ask={ask} isBookmarked={isBookmarked} onBookmark={onBookmark} showImage hideReply showStars={enableStars} showBookmark={showBookmark} />

            <h3 className="cmty-replies-title">{replies.length} {replies.length === 1 ? 'Comment' : 'Comments'}</h3>

            {replies.length === 0 && <p className="cmty-empty">No comments yet — be the first to answer.</p>}

            {parents.map(r => (
                <React.Fragment key={r.$id}>
                    {renderReply(r)}
                    {childrenOf(r.$id).map(c => renderReply(c, true))}
                </React.Fragment>
            ))}

            <CommentBox onSubmit={handleComment} />
        </>
    );
};


export {
    MEDALLION_URL, ICON_CARD_URL, ICON_GOLD_CHECK_URL, ICON_TROPHY_URL, CATEGORIES, CATEGORY_IMAGE, SORTS, PAGE_SIZE,
    formatCount, formatDate, Avatar, GoldCheck, CommentBox, AskComposer, AskCard, AskDetail,
};
