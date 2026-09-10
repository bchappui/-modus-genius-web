import React, { useEffect, useState } from 'react'
import { MdKeyboardArrowLeft, MdSend, MdDeleteOutline, MdChatBubbleOutline } from 'react-icons/md'
import './CardReader.css'
import './CommentsOverlay.css'
import { getQuoteComments, addQuoteComment, deleteQuoteComment, hasUserCommentedQuote } from '../../lib/quotes.js'

const LOGOCENTER_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';
const MADE_BY_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';

const PAGE_SIZE = 20;

const QuoteCommentsOverlay = ({ quote, currentUserId, currentUserName, currentUserAvatar, onClose, onCommentCountChange, onOwnCommentChange }) => {
    const quoteId = quote?.$id;

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!quoteId) return;
        const load = async () => {
            setLoading(true);
            try {
                const { items, hasMore: more } = await getQuoteComments({ quoteId, limit: PAGE_SIZE, offset: 0 });
                setComments(items);
                setHasMore(more);
                setOffset(items.length);
            } catch (e) {
                console.error('Error loading quote comments', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [quoteId]);

    const loadMore = async () => {
        if (!hasMore || loadingMore || loading) return;
        setLoadingMore(true);
        try {
            const { items, hasMore: more } = await getQuoteComments({ quoteId, limit: PAGE_SIZE, offset });
            setComments(prev => [...prev, ...items]);
            setHasMore(more);
            setOffset(prev => prev + items.length);
        } catch (e) {
            console.error('Error loading more quote comments', e);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleAdd = async () => {
        if (!text.trim() || !currentUserId || !currentUserName || submitting) return;
        setSubmitting(true);
        try {
            const { comment, commentCount } = await addQuoteComment(quoteId, currentUserId, text.trim(), currentUserName, currentUserAvatar || '');
            setComments(prev => [comment, ...prev]);
            setText('');
            onCommentCountChange?.(commentCount);
            onOwnCommentChange?.(true);
        } catch (e) {
            console.error('Error adding quote comment', e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        try {
            const { commentCount } = await deleteQuoteComment(commentId, quoteId);
            setComments(prev => prev.filter(c => c.$id !== commentId));
            onCommentCountChange?.(commentCount);
            if (currentUserId) {
                hasUserCommentedQuote(quoteId, currentUserId).then(onOwnCommentChange).catch(() => {});
            }
        } catch (e) {
            console.error('Error deleting quote comment', e);
        }
    };

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="cr-overlay" onClick={onClose}>
            <div className="cr-container" onClick={e => e.stopPropagation()}>

                <div className="cr-topbar">
                    <button className="cr-ctrl-btn cr-ctrl-back" onClick={onClose}>
                        <MdKeyboardArrowLeft size={30} color="rgb(137,162,189)" />
                    </button>
                </div>

                <div className="cr-outer">
                    <div className="cr-inner">
                        <div className="cr-grad-tr" />
                        <div className="cr-grad-bl" />

                        {/* ── TOP BAR (shared with CardReader) ── */}
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
                            <div className="cr-logo-area">
                                <div className="cr-logo-img" style={{ backgroundImage: `url(${LOGOCENTER_URL})` }} />
                            </div>
                        </div>

                        {/* ── COMMENTS LIST ── */}
                        <div className="cm-list">
                            {loading ? (
                                <div className="cm-empty">Loading comments...</div>
                            ) : comments.length === 0 ? (
                                <div className="cm-empty">
                                    <MdChatBubbleOutline size={40} color="rgb(137,162,189)" />
                                    <span className="cm-empty-title">No comments yet</span>
                                    <span className="cm-empty-sub">Be the first to leave a comment</span>
                                </div>
                            ) : (
                                <>
                                    {comments.map(c => (
                                        <div key={c.$id} className="cm-row">
                                            <div
                                                className="cm-avatar"
                                                style={c.userAvatar ? { backgroundImage: `url(${c.userAvatar})` } : undefined}
                                            />
                                            <div className="cm-body">
                                                <span className="cm-name">{c.userName}</span>
                                                <span className="cm-text">{c.comment}</span>
                                            </div>
                                            <div className="cm-right">
                                                <span className="cm-date">{new Date(c.$createdAt).toLocaleDateString()}</span>
                                                {c.userId === currentUserId && (
                                                    <button className="cm-delete-btn" onClick={() => handleDelete(c.$id)}>
                                                        <MdDeleteOutline size={15} color="rgb(239,68,68)" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <button className="cm-load-more" onClick={loadMore} disabled={loadingMore}>
                                            {loadingMore ? 'Loading...' : 'Load more'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── BOTTOM BAR (shared with CardReader) — input instead of heart/comment icons ── */}
                        <div className="cr-bot">
                            <div className="cr-bot-conn" />
                            <div className="cr-bot-bar">
                                <div className="cmt-input-row">
                                    <input
                                        className="cmt-input"
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        placeholder="Add a comment..."
                                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                    />
                                    <button className="cmt-send-btn" onClick={handleAdd} disabled={submitting || !text.trim()}>
                                        <MdSend size={15} />
                                    </button>
                                </div>
                                <div className="cr-diamond-placeholder" />
                            </div>
                            <div className="cr-diamond-slot">
                                <div className="cr-diamond">
                                    <div className="cr-diamond-frame">
                                        {currentUserAvatar && (
                                            <img src={currentUserAvatar} className="cr-avatar" alt="" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default QuoteCommentsOverlay;
