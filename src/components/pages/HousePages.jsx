import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiUser } from 'react-icons/fi'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import { FaQuoteLeft, FaQuoteRight } from 'react-icons/fa'
import Spinner from '../shared/Spinner.jsx'
import AgentProfileCard from '../overlays/AgentProfileCard.jsx'
import { JoinHouseModal, AskExpertiseModal } from '../modals/HouseRequestModals.jsx'
import {
    MAX_HOUSE_MEMBERS, getAgentsByIds, getHouse,
    listMyJoinRequests, listMyExpertiseRequests, listHouseJoinRequests, listHouseExpertiseRequests,
    respondJoinRequest, respondExpertiseRequest, answerEmailConsent,
    leaveHouse, removeMember, deleteHouse,
    getHouseAsks, getHouseAsk, createHouseAsk, addHouseReply, deleteHouseReply, getAllHouseReplies,
} from '../../lib/houses.js'
import { getAsksByIds } from '../../lib/asks.js'
import {
    ICON_TROPHY_URL, CATEGORY_IMAGE, ICON_CARD_URL, GoldCheck, CommentBox, AskComposer, AskCard, AskDetail,
} from './CommunityShared.jsx'
import './HousePages.css'

// Overlays opened from inside Community's layout (a z-index: 1 stacking
// context) would sit under TopNav — render them on <body> instead.
const Overlay = ({ children }) => createPortal(children, document.body);

const BOX_PREVIEW = 3;
const HOUSES_PER_PAGE = 20;
const PANEL_HOUSES = 7;

// ── small pieces ─────────────────────────────────────────────────────

export const Diamond = ({ src, size = 40, onClick, title }) => {
    const Tag = onClick ? 'button' : 'span';
    return (
        <Tag className={`hs-diamond${onClick ? ' hs-diamond--btn' : ''}`} style={{ width: size, height: size }} onClick={onClick} title={title}>
            <span>{src ? <img src={src} alt="" /> : <FiUser size={size * 0.45} />}</span>
        </Tag>
    );
};

const RankPill = ({ house }) => (
    <div className="hs-rank-pill">
        <img src={ICON_TROPHY_URL} alt="" className="hs-rank-icon" />
        <span>#{house?.rank ?? '–'}</span>
        <GoldCheck title="Gold badges of the members" />
        <span>{house?.points ?? 0}</span>
    </div>
);

const useAgents = (ids) => {
    const key = [...new Set((ids || []).filter(Boolean))].sort().join(',');
    const [map, setMap] = useState(new Map());
    useEffect(() => {
        if (!key) { setMap(new Map()); return; }
        let cancelled = false;
        getAgentsByIds(key.split(',')).then(m => { if (!cancelled) setMap(m); });
        return () => { cancelled = true; };
    }, [key]);
    return map;
};

const BackLink = ({ label, onClick }) => (
    <button className="cmty-link-btn cmty-back-btn" onClick={onClick}>
        <MdKeyboardArrowLeft size={20} /> {label}
    </button>
);

// Collapsed list with a "See more" toggle, so the boxes don't take over the page.
const Collapsible = ({ items, render }) => {
    const [open, setOpen] = useState(false);
    const shown = open ? items : items.slice(0, BOX_PREVIEW);
    return (
        <>
            {shown.map(render)}
            {items.length > BOX_PREVIEW && (
                <button className="cmty-link-btn hs-see-more" onClick={() => setOpen(o => !o)}>
                    {open ? 'See less' : `See more (${items.length - BOX_PREVIEW})`}
                </button>
            )}
        </>
    );
};

const STATUS_LABEL = {
    pending: 'Pending', accepted: 'Accepted', declined: 'Declined', shared: 'Emails shared', cancelled: 'Cancelled',
};
const StatusTag = ({ status }) => <span className={`hs-status hs-status--${status}`}>{STATUS_LABEL[status] || status}</span>;

const EMAIL_NOTICE = 'If you both confirm, your email and the email of the other person will be shared with each other so you can get in touch. You can still decide.';

// ── right column of Community: ranking ───────────────────────────────

export const HousesPanel = ({ ranked, loading, myHouse, onCreate, onOpenHouse, onSeeMore }) => (
    <aside className="cmty-panel cmty-side cmty-houses">
        {!myHouse && <button className="cmty-house-btn" onClick={onCreate}>Create My House</button>}
        <h2 className="cmty-panel-title hs-panel-heading">World&apos;s Top Houses</h2>
        <div className="cmty-houses-header">
            <img src={ICON_TROPHY_URL} alt="" className="cmty-houses-trophy" />
            <h2 className="cmty-panel-title cmty-houses-title">Houses</h2>
            <GoldCheck />
        </div>
        <div className="cmty-house-list">
            {loading ? (
                <div className="cmty-empty"><Spinner /></div>
            ) : ranked.length === 0 ? (
                <p className="hs-muted">No houses yet — be the first to create one.</p>
            ) : ranked.slice(0, PANEL_HOUSES).map(h => (
                <button key={h.$id} className="cmty-house-row hs-house-row-btn" onClick={() => onOpenHouse(h.$id)}>
                    <span className="cmty-house-rank">#{h.rank}</span>
                    <Diamond src={h.image} size={54} />
                    <span className="cmty-house-name">{h.name}</span>
                    <span className="cmty-house-count">{h.points}</span>
                </button>
            ))}
        </div>
        {ranked.length > 0 && <button className="cmty-link-btn cmty-houses-more" onClick={onSeeMore}>See more houses…</button>}
    </aside>
);

// ── "Your requests" (requester side, top of the Community forum) ─────

export const YourRequestsBox = ({ agentId, myEmail, onOpenHouse, refreshKey = 0 }) => {
    const [joins, setJoins] = useState([]);
    const [expertise, setExpertise] = useState([]);
    const [houses, setHouses] = useState(new Map());
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        if (!agentId) return;
        const [j, e] = await Promise.all([listMyJoinRequests(agentId), listMyExpertiseRequests(agentId)]);
        const ids = [...new Set([...j, ...e].map(r => r.houseId))];
        const hs = await Promise.all(ids.map(id => getHouse(id)));
        setHouses(new Map(hs.filter(Boolean).map(h => [h.$id, h])));
        setJoins(j); setExpertise(e);
    }, [agentId]);
    useEffect(() => { load(); }, [load, refreshKey]);

    const responders = useAgents(expertise.map(r => r.responderId));

    const consent = async (req, yes) => {
        setBusyId(req.$id);
        try { await answerEmailConsent(req.$id, 'requester', yes, myEmail); await load(); }
        catch (err) { console.error('answerEmailConsent error:', err); }
        finally { setBusyId(null); }
    };

    const items = [
        ...joins.map(r => ({ ...r, _kind: 'join' })),
        ...expertise.map(r => ({ ...r, _kind: 'expertise' })),
    ].filter(r => houses.has(r.houseId)).sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));

    if (!items.length) return null;

    return (
        <div className="cmty-panel hs-box">
            <h3 className="hs-box-title">Your requests</h3>
            <Collapsible items={items} render={r => {
                const house = houses.get(r.houseId);
                const responder = responders.get(r.responderId);
                return (
                    <div key={r.$id} className="hs-req">
                        <div className="hs-req-head">
                            <button className="hs-req-house" onClick={() => onOpenHouse(house.$id)}>
                                <Diamond src={house.image} size={28} />
                                <span>{house.name}</span>
                            </button>
                            <span className="hs-req-kind">{r._kind === 'join' ? 'Ask to join' : 'Ask for expertise'}</span>
                            <StatusTag status={r.status} />
                        </div>
                        {r._kind === 'expertise' && (
                            <>
                                <p className="hs-req-text">{r.question}</p>
                                {r.status === 'accepted' && r.requesterConsent === 'waiting' && (
                                    <div className="hs-consent">
                                        <p>{responder?.name || 'A member'} accepted your request. {EMAIL_NOTICE}</p>
                                        <div className="hs-actions">
                                            <button className="hs-btn hs-btn--gold" disabled={busyId === r.$id} onClick={() => consent(r, true)}>Yes, share</button>
                                            <button className="hs-btn" disabled={busyId === r.$id} onClick={() => consent(r, false)}>No</button>
                                        </div>
                                    </div>
                                )}
                                {r.status === 'accepted' && r.requesterConsent === 'yes' && (
                                    <p className="hs-muted">Waiting for {responder?.name || 'the member'} to confirm.</p>
                                )}
                                {r.status === 'shared' && (
                                    <p className="hs-email">Contact {responder?.name || 'the member'}: <a href={`mailto:${r.responderEmail}`}>{r.responderEmail}</a></p>
                                )}
                            </>
                        )}
                    </div>
                );
            }} />
        </div>
    );
};

// ── house requests box (member side, top of the private forum) ───────

const HouseRequestsBox = ({ house, agentId, myEmail, isOwner, onMembersChanged, refreshKey = 0 }) => {
    const [joins, setJoins] = useState([]);
    const [expertise, setExpertise] = useState([]);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const [j, e] = await Promise.all([
            isOwner ? listHouseJoinRequests(house.$id) : Promise.resolve([]),
            listHouseExpertiseRequests(house.$id),
        ]);
        setJoins(j.filter(r => r.status === 'pending'));
        setExpertise(e);
    }, [house.$id, isOwner]);
    useEffect(() => { load(); }, [load, refreshKey]);

    const people = useAgents([...joins.map(r => r.agentId), ...expertise.flatMap(r => [r.requesterId, r.responderId])]);

    const run = async (id, fn) => {
        setBusyId(id);
        setError('');
        try { await fn(); await load(); }
        catch (err) { console.error(err); setError(err.message || 'Something went wrong.'); }
        finally { setBusyId(null); }
    };

    const items = [
        ...joins.map(r => ({ ...r, _kind: 'join' })),
        ...expertise.map(r => ({ ...r, _kind: 'expertise' })),
    ].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));

    return (
        <div className="cmty-panel hs-box">
            <h3 className="hs-box-title">Requests</h3>
            {error && <p className="cmty-error">{error}</p>}
            {items.length === 0 ? (
                <p className="hs-muted">No requests yet.</p>
            ) : (
                <Collapsible items={items} render={r => {
                    const busy = busyId === r.$id;
                    if (r._kind === 'join') {
                        const who = people.get(r.agentId);
                        return (
                            <div key={r.$id} className="hs-req">
                                <div className="hs-req-head">
                                    <span className="hs-req-house"><Diamond src={who?.avatar} size={28} /><span>{who?.name || 'Someone'}</span></span>
                                    <span className="hs-req-kind">Asks to join</span>
                                    <StatusTag status={r.status} />
                                </div>
                                <p className="hs-req-text">{r.motivation}</p>
                                <div className="hs-actions">
                                    <button className="hs-btn hs-btn--gold" disabled={busy || (house.memberIds || []).length >= MAX_HOUSE_MEMBERS}
                                        onClick={() => run(r.$id, async () => { await respondJoinRequest(r.$id, true); onMembersChanged?.(); })}>
                                        Accept
                                    </button>
                                    <button className="hs-btn" disabled={busy} onClick={() => run(r.$id, () => respondJoinRequest(r.$id, false))}>Decline</button>
                                    {(house.memberIds || []).length >= MAX_HOUSE_MEMBERS && <span className="hs-muted">House is full ({MAX_HOUSE_MEMBERS} members).</span>}
                                </div>
                            </div>
                        );
                    }
                    const requester = people.get(r.requesterId);
                    const responder = people.get(r.responderId);
                    const iAmResponder = r.responderId === agentId;
                    return (
                        <div key={r.$id} className="hs-req">
                            <div className="hs-req-head">
                                <span className="hs-req-house"><Diamond src={requester?.avatar} size={28} /><span>{requester?.name || 'Someone'}</span></span>
                                <span className="hs-req-kind">Asks for expertise</span>
                                <StatusTag status={r.status} />
                            </div>
                            <p className="hs-req-text">{r.question}</p>
                            <div className="hs-req-meta">
                                <span className="cmty-pill">
                                    <img src={CATEGORY_IMAGE[r.category] || ICON_CARD_URL} alt="" className="cmty-pill-icon" />
                                    <span className="cmty-pill-label">{r.category}</span>
                                </span>
                                {r.reward && <span className="hs-reward">Reward: {r.reward}</span>}
                            </div>
                            {r.status === 'pending' && (
                                <div className="hs-actions">
                                    <button className="hs-btn hs-btn--gold" disabled={busy} onClick={() => run(r.$id, () => respondExpertiseRequest(r.$id, agentId, true))}>Accept</button>
                                    <button className="hs-btn" disabled={busy} onClick={() => run(r.$id, () => respondExpertiseRequest(r.$id, agentId, false))}>Decline</button>
                                </div>
                            )}
                            {r.status === 'accepted' && iAmResponder && r.responderConsent === 'waiting' && (
                                <div className="hs-consent">
                                    <p>{EMAIL_NOTICE}</p>
                                    <div className="hs-actions">
                                        <button className="hs-btn hs-btn--gold" disabled={busy} onClick={() => run(r.$id, () => answerEmailConsent(r.$id, 'responder', true, myEmail))}>Yes, share</button>
                                        <button className="hs-btn" disabled={busy} onClick={() => run(r.$id, () => answerEmailConsent(r.$id, 'responder', false))}>No</button>
                                    </div>
                                </div>
                            )}
                            {r.status === 'accepted' && (!iAmResponder || r.responderConsent === 'yes') && (
                                <p className="hs-muted">
                                    Accepted by {iAmResponder ? 'you' : (responder?.name || 'a member')} — waiting for both to confirm the email sharing.
                                </p>
                            )}
                            {r.status === 'declined' && <p className="hs-muted">Declined by {responder?.name || 'a member'}.</p>}
                            {r.status === 'shared' && (iAmResponder
                                ? <p className="hs-email">Contact {requester?.name || 'the requester'}: <a href={`mailto:${r.requesterEmail}`}>{r.requesterEmail}</a></p>
                                : <p className="hs-muted">Emails shared between {requester?.name || 'the requester'} and {responder?.name || 'a member'}.</p>)}
                        </div>
                    );
                }} />
            )}
        </div>
    );
};

// ── public house page (community3) ───────────────────────────────────

export const HousePublicView = ({
    houseId, ranked, agentId, myHouse, onBack, onOpenForum, onRequestsChanged,
    viewerMembershipTier, onShowSubscribe,
}) => {
    const [house, setHouse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pendingHere, setPendingHere] = useState(false);
    const [modal, setModal] = useState(null); // 'join' | 'expertise'
    const [profileId, setProfileId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        (async () => {
            const [h, mine] = await Promise.all([getHouse(houseId), agentId ? listMyJoinRequests(agentId) : []]);
            if (cancelled) return;
            setHouse(h);
            setPendingHere(mine.some(r => r.houseId === houseId && r.status === 'pending'));
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [houseId, agentId]);

    const members = useAgents(house?.memberIds);
    const rankedHouse = ranked.find(h => h.$id === houseId);

    if (loading) return <div className="cmty-empty"><Spinner /></div>;
    if (!house) return <><BackLink label="Back to Community" onClick={onBack} /><p className="cmty-empty">This house no longer exists.</p></>;

    const memberIds = house.memberIds || [];
    const isMember = memberIds.includes(agentId);
    const isFull = memberIds.length >= MAX_HOUSE_MEMBERS;

    return (
        <div className="hs-public">
            <BackLink label="Back to Community" onClick={onBack} />

            <Diamond src={house.image} size={110} />
            <h1 className="hp-headline hs-public-name">{house.name}</h1>
            <RankPill house={rankedHouse} />

            {house.quotation && (
                <blockquote className="hs-quote">
                    <FaQuoteLeft className="hs-quote-mark hs-quote-mark--open" />
                    <p>{house.quotation}</p>
                    <FaQuoteRight className="hs-quote-mark hs-quote-mark--close" />
                </blockquote>
            )}

            <div className="hs-members-row">
                {memberIds.map(id => {
                    const m = members.get(id);
                    return <Diamond key={id} src={m?.avatar} size={96} title={m?.name} onClick={() => setProfileId(id)} />;
                })}
            </div>
            <p className="hs-muted">{memberIds.length}/{MAX_HOUSE_MEMBERS} members</p>

            <div className="hs-public-actions">
                {isMember ? (
                    <button className="cmty-house-btn hs-public-btn" onClick={() => onOpenForum(house.$id)}>Open House Forum</button>
                ) : (
                    <>
                        <button
                            className="cmty-house-btn hs-public-btn"
                            disabled={!!myHouse || isFull || pendingHere}
                            onClick={() => setModal('join')}
                            title={myHouse ? 'You are already in a house' : isFull ? 'This house is full' : pendingHere ? 'Request pending' : ''}
                        >
                            {pendingHere ? 'Request Pending' : isFull ? 'House Full' : 'Ask to Join House'}
                        </button>
                        <button className="cmty-house-btn hs-public-btn" onClick={() => setModal('expertise')}>Ask for Expertise</button>
                    </>
                )}
            </div>

            {modal === 'join' && (
                <Overlay>
                    <JoinHouseModal house={house} agentId={agentId} onClose={() => setModal(null)}
                        onSent={() => { setPendingHere(true); onRequestsChanged?.(); }} />
                </Overlay>
            )}
            {modal === 'expertise' && (
                <Overlay>
                    <AskExpertiseModal house={house} agentId={agentId} onClose={() => setModal(null)}
                        onSent={() => onRequestsChanged?.()} />
                </Overlay>
            )}
            {profileId && (
                <Overlay>
                    <AgentProfileCard agentId={profileId} onClose={() => setProfileId(null)}
                        viewerAgentId={agentId} viewerMembershipTier={viewerMembershipTier} onShowSubscribe={onShowSubscribe} />
                </Overlay>
            )}
        </div>
    );
};

// ── all houses, paginated ────────────────────────────────────────────

export const HousesListView = ({ ranked, loading, onBack, onOpenHouse }) => {
    const [page, setPage] = useState(1);
    const pages = Math.max(1, Math.ceil(ranked.length / HOUSES_PER_PAGE));
    const slice = ranked.slice((page - 1) * HOUSES_PER_PAGE, page * HOUSES_PER_PAGE);

    return (
        <div className="hs-list">
            <BackLink label="Back to Community" onClick={onBack} />
            <h2 className="ep-categories-title hs-list-title">All Houses</h2>
            {loading ? <div className="cmty-empty"><Spinner /></div> : (
                <>
                    <div className="cmty-panel hs-list-panel">
                        <div className="hs-list-row hs-list-row--head">
                            <span>Rank</span><span /><span>House</span><span>Members</span><span>Badges</span>
                        </div>
                        {slice.map(h => (
                            <button key={h.$id} className="hs-list-row" onClick={() => onOpenHouse(h.$id)}>
                                <span className="cmty-house-rank">#{h.rank}</span>
                                <Diamond src={h.image} size={40} />
                                <span className="cmty-house-name">{h.name}</span>
                                <span className="cmty-house-count">{(h.memberIds || []).length}/{MAX_HOUSE_MEMBERS}</span>
                                <span className="cmty-house-count">{h.points}</span>
                            </button>
                        ))}
                    </div>
                    {pages > 1 && (
                        <div className="hs-pagination">
                            {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                                <button key={n} className={`cmty-pill cmty-pill-btn${n === page ? ' cmty-pill--active' : ''}`}
                                    onClick={() => { setPage(n); window.scrollTo(0, 0); }}>
                                    {n}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ── private house forum (community4) ─────────────────────────────────

const useHouseForum = ({
    houseId, askId, agentId, agentName, agentAvatar, myEmail, myHouse, ranked, badges,
    onOpenView, onBack, onHouseChanged, onRequireAuth, viewerMembershipTier, onShowSubscribe, requestsKey,
}) => {
    const [house, setHouse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [asks, setAsks] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [asksLoading, setAsksLoading] = useState(true);
    const [replyOpenId, setReplyOpenId] = useState(null);
    const [profileId, setProfileId] = useState(null);
    const [confirm, setConfirm] = useState(null); // { type: 'remove'|'leave'|'delete', id? }
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [badgeAsks, setBadgeAsks] = useState([]);

    const loadHouse = useCallback(async () => {
        setHouse(await getHouse(houseId));
        setLoading(false);
    }, [houseId]);
    useEffect(() => { setLoading(true); loadHouse(); }, [loadHouse]);

    const isMember = !!house && (house.memberIds || []).includes(agentId) && myHouse?.$id === houseId;
    const isOwner = isMember && house.ownerId === agentId;

    const fetchAsks = useCallback(async (reset) => {
        if (reset) setAsksLoading(true);
        const { items, hasMore: more } = await getHouseAsks(houseId, { limit: 10, offset: reset ? 0 : asks.length });
        setAsks(prev => reset ? items : [...prev, ...items.filter(a => !prev.some(p => p.$id === a.$id))]);
        setHasMore(more);
        setAsksLoading(false);
    }, [houseId, asks.length]);
    useEffect(() => { if (isMember) fetchAsks(true); }, [isMember, houseId]);

    const members = useAgents(house?.memberIds);

    // Right column: questions where a member holds the gold badge.
    const memberBadges = useMemo(() => {
        const ids = new Set(house?.memberIds || []);
        return badges.filter(b => ids.has(b.agentId));
    }, [badges, house]);
    useEffect(() => {
        if (!memberBadges.length) { setBadgeAsks([]); return; }
        let cancelled = false;
        getAsksByIds(memberBadges.map(b => b.askId)).then(list => {
            if (cancelled) return;
            const byId = new Map(list.map(a => [a.$id, a]));
            setBadgeAsks(memberBadges.map(b => ({ ...b, ask: byId.get(b.askId) })).filter(b => b.ask));
        });
        return () => { cancelled = true; };
    }, [memberBadges]);

    const runManage = async (fn) => {
        setBusy(true);
        setError('');
        try { await fn(); }
        catch (err) { console.error(err); setError(err.message || 'Something went wrong.'); }
        finally { setBusy(false); setConfirm(null); }
    };

    const rankedHouse = ranked.find(h => h.$id === houseId);

    if (loading) return { center: <div className="cmty-empty"><Spinner /></div> };
    if (!house || !isMember) {
        return {
            center: (
                <>
                    <BackLink label="Back to Community" onClick={onBack} />
                    <p className="cmty-empty">This forum is private — only the members of this house can see it.</p>
                </>
            ),
        };
    }

    const left = (
        <aside className="cmty-panel cmty-side hs-members-panel">
            <h2 className="cmty-panel-title">Members</h2>
            <div className="hs-member-list">
                {(house.memberIds || []).map(id => {
                    const m = members.get(id);
                    const canRemove = isOwner && id !== agentId;
                    return (
                        <div key={id} className="hs-member">
                            <button className="hs-member-btn" onClick={() => setProfileId(id)}>
                                <Diamond src={m?.avatar} size={40} />
                                <span className="cmty-house-name">{m?.name || 'Member'}{id === house.ownerId ? ' (owner)' : ''}</span>
                            </button>
                            {canRemove && (confirm?.type === 'remove' && confirm.id === id ? (
                                <span className="hs-member-actions">
                                    <button className="cmty-link-btn cmty-delete-btn--confirm" disabled={busy}
                                        onClick={() => runManage(async () => { await removeMember(house.$id, id); await loadHouse(); onHouseChanged?.(); })}>
                                        Confirm
                                    </button>
                                    <button className="cmty-link-btn" onClick={() => setConfirm(null)}>Cancel</button>
                                </span>
                            ) : (
                                <button className="cmty-link-btn" onClick={() => setConfirm({ type: 'remove', id })}>Remove</button>
                            ))}
                        </div>
                    );
                })}
            </div>
            <div className="hs-manage">
                {error && <p className="cmty-error">{error}</p>}
                {isOwner ? (
                    confirm?.type === 'delete' ? (
                        <>
                            <p className="hs-muted">Delete {house.name}, its forum and all its requests? This cannot be undone.</p>
                            <div className="hs-actions">
                                <button className="hs-btn hs-btn--danger" disabled={busy}
                                    onClick={() => runManage(async () => { await deleteHouse(house.$id); onHouseChanged?.(); onBack(); })}>
                                    {busy ? 'Deleting…' : 'Delete house'}
                                </button>
                                <button className="hs-btn" onClick={() => setConfirm(null)}>Cancel</button>
                            </div>
                        </>
                    ) : (
                        <button className="cmty-link-btn cmty-delete-btn--confirm" onClick={() => setConfirm({ type: 'delete' })}>Delete house</button>
                    )
                ) : (
                    confirm?.type === 'leave' ? (
                        <div className="hs-actions">
                            <button className="hs-btn hs-btn--danger" disabled={busy}
                                onClick={() => runManage(async () => { await leaveHouse(house.$id, agentId); onHouseChanged?.(); onBack(); })}>
                                Leave {house.name}
                            </button>
                            <button className="hs-btn" onClick={() => setConfirm(null)}>Cancel</button>
                        </div>
                    ) : (
                        <button className="cmty-link-btn cmty-delete-btn--confirm" onClick={() => setConfirm({ type: 'leave' })}>Leave house</button>
                    )
                )}
            </div>
            {profileId && (
                <Overlay>
                    <AgentProfileCard agentId={profileId} onClose={() => setProfileId(null)}
                        viewerAgentId={agentId} viewerMembershipTier={viewerMembershipTier} onShowSubscribe={onShowSubscribe} />
                </Overlay>
            )}
        </aside>
    );

    const right = (
        <aside className="cmty-panel cmty-side hs-badges-panel">
            <RankPill house={rankedHouse} />
            <div className="hs-badge-list">
                {badgeAsks.length === 0 ? (
                    <p className="hs-muted">No gold badges yet. Members earn one when their answer is the most starred on a Community question.</p>
                ) : badgeAsks.map(b => (
                    <button key={b.askId} className="hs-badge-row" onClick={() => onOpenView({ kind: 'ask', askId: b.askId })}>
                        <Diamond src={members.get(b.agentId)?.avatar} size={40} />
                        <span className="cmty-house-name">{b.ask.name}</span>
                        <GoldCheck />
                    </button>
                ))}
            </div>
        </aside>
    );

    const handleReply = async (askIdToReply, text) => {
        const { replyCount } = await addHouseReply(askIdToReply, houseId, text, agentName || '', agentAvatar || '', agentId, null);
        setAsks(prev => prev.map(a => a.$id === askIdToReply ? { ...a, replyCount } : a));
        setReplyOpenId(null);
    };

    const center = askId ? (
        <AskDetail
            askId={askId}
            agentId={agentId}
            onBack={() => window.history.back()}
            onRequireAuth={onRequireAuth}
            loadAsk={getHouseAsk}
            loadReplies={getAllHouseReplies}
            deleteFn={deleteHouseReply}
            enableStars={false}
            showBookmark={false}
            onReply={(text) => addHouseReply(askId, houseId, text, agentName || '', agentAvatar || '', agentId, null)}
        />
    ) : (
        <>
            <BackLink label="Back to Community" onClick={onBack} />
            <div className="hs-intro">
                <h2 className="hs-intro-title">{house.name} — private forum</h2>
                <p>
                    Only the members of {house.name} can see this page. Use it to discuss freely with each other:
                    questions and answers posted here don&apos;t earn stars or gold badges and don&apos;t count in the house ranking.
                    Requests to join your house and requests for expertise appear in the box below.
                </p>
            </div>

            <HouseRequestsBox house={house} agentId={agentId} myEmail={myEmail} isOwner={isOwner}
                onMembersChanged={() => { loadHouse(); onHouseChanged?.(); }} refreshKey={requestsKey} />

            <AskComposer
                agentId={agentId}
                agentName={agentName}
                agentAvatar={agentAvatar}
                onRequireAuth={onRequireAuth}
                createFn={(fields) => createHouseAsk({ ...fields, houseId })}
                onCreated={(ask) => setAsks(prev => [{ ...ask, agent: { $id: agentId, name: agentName, avatar: agentAvatar } }, ...prev])}
            />

            {asksLoading ? (
                <div className="cmty-empty"><Spinner /></div>
            ) : asks.length === 0 ? (
                <p className="cmty-empty">No questions yet — start the conversation.</p>
            ) : (
                <>
                    {asks.map(ask => (
                        <React.Fragment key={ask.$id}>
                            <AskCard
                                ask={ask}
                                showStars={false}
                                showBookmark={false}
                                onOpenComments={() => onOpenView({ kind: 'houseAsk', houseId, askId: ask.$id })}
                                onReply={() => setReplyOpenId(id => id === ask.$id ? null : ask.$id)}
                            />
                            {replyOpenId === ask.$id && <CommentBox autoFocus onSubmit={(text) => handleReply(ask.$id, text)} />}
                        </React.Fragment>
                    ))}
                    {hasMore && (
                        <div className="cmty-more-row">
                            <button className="cmty-link-btn" onClick={() => fetchAsks(false)}>See more questions…</button>
                        </div>
                    )}
                </>
            )}
        </>
    );

    return { left, center, right };
};

// The 3 columns of the private forum, dropped into CommunityPage's layout.
export const HouseForumView = (props) => {
    const { left, center, right } = useHouseForum(props);
    return (
        <>
            {left || <aside className="cmty-panel cmty-side" />}
            <section className="cmty-center">{center}</section>
            {right || <aside className="cmty-panel cmty-side" />}
        </>
    );
};
