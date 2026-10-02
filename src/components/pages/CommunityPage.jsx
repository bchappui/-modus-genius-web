import React, { useCallback, useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { getAsks, countAsksByCategory, addReply } from '../../lib/asks.js'
import { getRankedHouses } from '../../lib/houses.js'
import { useHouse } from '../../lib/houseContext.js'
import {
    MEDALLION_URL, CATEGORIES, CATEGORY_IMAGE, SORTS, PAGE_SIZE,
    formatCount, CommentBox, AskComposer, AskCard, AskDetail,
} from './CommunityShared.jsx'
import { HousesPanel, YourRequestsBox, HousePublicView, HousesListView, HouseForumView } from './HousePages.jsx'
import CreateHouseModal from '../modals/CreateHouseModal.jsx'
import WorldMap from './WorldMap.jsx'
import Spinner from '../shared/Spinner.jsx'
import SearchModal from '../modals/SearchModal.jsx'
import TopNav from '../shared/TopNav.jsx'
import './ExplorePage.css'
import './HomePage.css'
import './CommunityPage.css'

// Which Community sub-page is showing. Kept in history.state so the browser's
// back button walks through them (App's popstate keeps showCommunity):
//   null                              → public forum
//   { kind: 'ask', askId }            → a question's comments
//   { kind: 'house', houseId }        → public house page (community3)
//   { kind: 'houses' }                → all houses, paginated
//   { kind: 'houseForum', houseId }   → private house forum (community4)
//   { kind: 'houseAsk', houseId, askId } → a private question's comments
// `communityAskId` is the older key Favorites' "Saved Questions" still sets.
const readView = (state) => {
    if (state?.communityView) return state.communityView;
    if (state?.communityAskId) return { kind: 'ask', askId: state.communityAskId };
    return null;
};

const CommunityForum = ({
    searchTerm, onSearchChange, onGoToExplore, onGoHome, onShowGenius, onShowQuotes, onShowNewsletter, onShowSubscribe, onShowCreate,
    onShowFavorites, onLogout, isLoggedIn, movieList, isLoading, errorMessage, onSelectProperty,
    agentAvatar, onOpenProfile, agentId, agentName, myEmail, onRequireAuth, favoriteIds = [], onToggleFavorite,
    viewerMembershipTier, requestsKey = 0,
}) => {
    const { myHouse, refreshMyHouse } = useHouse();
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [createHouseOpen, setCreateHouseOpen] = useState(false);

    const [category, setCategory] = useState('All');
    const [sort, setSort] = useState('new');
    const [counts, setCounts] = useState({});
    const [asks, setAsks] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [replyOpenId, setReplyOpenId] = useState(null);

    const [ranked, setRanked] = useState([]);
    const [badges, setBadges] = useState([]);
    const [rankLoading, setRankLoading] = useState(true);
    const [myRequestsKey, setMyRequestsKey] = useState(0);

    const [view, setView] = useState(() => readView(window.history.state));

    useEffect(() => {
        const onPopState = (e) => { setView(readView(e.state)); window.scrollTo(0, 0); };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const openView = (next) => {
        window.history.pushState({ ...(window.history.state || {}), communityView: next, communityAskId: null }, '', '');
        setView(next);
        window.scrollTo(0, 0);
    };
    const openAsk = (askId) => openView({ kind: 'ask', askId });
    const closeView = () => openView(null);

    const refreshCounts = () => countAsksByCategory().then(setCounts);
    useEffect(() => { refreshCounts(); }, []);

    const refreshRanking = useCallback(async () => {
        const { ranked: r, badges: b } = await getRankedHouses();
        setRanked(r); setBadges(b); setRankLoading(false);
    }, []);
    useEffect(() => { refreshRanking(); }, [refreshRanking]);

    const fetchAsks = async (reset) => {
        const offset = reset ? 0 : asks.length;
        if (reset) setLoading(true); else setLoadingMore(true);
        const { items, hasMore: more } = await getAsks({ category, sort, limit: PAGE_SIZE, offset });
        setAsks(prev => {
            if (reset) return items;
            const seen = new Set(prev.map(a => a.$id));
            return [...prev, ...items.filter(a => !seen.has(a.$id))];
        });
        setHasMore(more);
        if (reset) setLoading(false); else setLoadingMore(false);
    };

    useEffect(() => { fetchAsks(true); }, [category, sort]);

    const selectCategory = (key) => {
        setCategory(key);
        if (view) closeView();
    };

    const handleReply = async (askId, text) => {
        if (!agentId) { onRequireAuth?.(); return; }
        const { replyCount } = await addReply(askId, text, agentName || '', agentAvatar || '', agentId, null);
        setAsks(prev => prev.map(a => a.$id === askId ? { ...a, replyCount } : a));
        setReplyOpenId(null);
    };

    const handleBookmark = (askId) => {
        if (!agentId) { onRequireAuth?.(); return; }
        onToggleFavorite?.(askId);
    };

    const handleAskCreated = (ask) => {
        // Only prepend when it actually matches the list being viewed.
        if ((category === 'All' || category === ask.type) && sort !== 'popular') {
            setAsks(prev => [{ ...ask, agent: { $id: agentId, name: agentName, avatar: agentAvatar } }, ...prev]);
        }
        refreshCounts();
    };

    const onHouseChanged = () => { refreshMyHouse(); refreshRanking(); };

    const housesPanel = (
        <HousesPanel
            ranked={ranked}
            loading={rankLoading}
            myHouse={myHouse}
            onCreate={() => setCreateHouseOpen(true)}
            onOpenHouse={(houseId) => openView({ kind: 'house', houseId })}
            onSeeMore={() => openView({ kind: 'houses' })}
        />
    );

    const categoriesPanel = (
        <aside className="cmty-panel cmty-side cmty-categories">
            <h2 className="cmty-panel-title">Categories</h2>
            <div className="cmty-category-list">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.key}
                        className={`cmty-category-row${category === cat.key ? ' cmty-category-row--active' : ''}`}
                        onClick={() => selectCategory(cat.key)}
                    >
                        <span className="cmty-pill">
                            <img src={CATEGORY_IMAGE[cat.key]} alt="" className="cmty-pill-icon" />
                            <span className="cmty-pill-label">{cat.key}</span>
                        </span>
                        <span className="cmty-category-count">{formatCount(counts[cat.key])}</span>
                    </button>
                ))}
            </div>
        </aside>
    );

    const forumCenter = view?.kind === 'ask' ? (
        <AskDetail
            askId={view.askId}
            agentId={agentId}
            isBookmarked={favoriteIds.includes(view.askId)}
            onBookmark={() => handleBookmark(view.askId)}
            onBack={() => window.history.back()}
            onRequireAuth={onRequireAuth}
            onReply={async (text) => {
                if (!agentId) { onRequireAuth?.(); return null; }
                return addReply(view.askId, text, agentName || '', agentAvatar || '', agentId, null);
            }}
        />
    ) : (
        <>
            <YourRequestsBox
                agentId={agentId}
                myEmail={myEmail}
                onOpenHouse={(houseId) => openView({ kind: 'house', houseId })}
                refreshKey={myRequestsKey + requestsKey}
            />

            {/* Gold badges come from the same pass as the house ranking. */}
            <WorldMap
                badges={rankLoading ? null : badges}
                agentId={agentId}
                viewerMembershipTier={viewerMembershipTier}
                onShowSubscribe={onShowSubscribe}
                onOpenAsk={openAsk}
            />

            <AskComposer
                agentId={agentId}
                agentName={agentName}
                agentAvatar={agentAvatar}
                onRequireAuth={onRequireAuth}
                onCreated={handleAskCreated}
            />

            <div className="cmty-sort-row">
                {SORTS.map(s => (
                    <button
                        key={s.key}
                        className={`cmty-pill cmty-pill-btn${sort === s.key ? ' cmty-pill--active' : ''}`}
                        onClick={() => setSort(s.key)}
                    >
                        <img src={CATEGORY_IMAGE['Entrepreneurship & Innovation']} alt="" className="cmty-pill-icon" />
                        <span className="cmty-pill-label">{s.label}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="cmty-empty"><Spinner /></div>
            ) : asks.length === 0 ? (
                <p className="cmty-empty">No questions yet.</p>
            ) : (
                <>
                    {asks.map(ask => (
                        <React.Fragment key={ask.$id}>
                            <AskCard
                                ask={ask}
                                isBookmarked={favoriteIds.includes(ask.$id)}
                                onBookmark={() => handleBookmark(ask.$id)}
                                onOpenComments={() => openAsk(ask.$id)}
                                onReply={() => {
                                    if (!agentId) { onRequireAuth?.(); return; }
                                    setReplyOpenId(id => id === ask.$id ? null : ask.$id);
                                }}
                            />
                            {replyOpenId === ask.$id && (
                                <CommentBox autoFocus onSubmit={(text) => handleReply(ask.$id, text)} />
                            )}
                        </React.Fragment>
                    ))}
                    {hasMore && (
                        <div className="cmty-more-row">
                            <button className="cmty-link-btn" onClick={() => fetchAsks(false)} disabled={loadingMore}>
                                {loadingMore ? 'Loading…' : 'See more questions…'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </>
    );

    let layout;
    if (view?.kind === 'house') {
        layout = (
            <div className="cmty-layout cmty-layout--wide">
                <section className="cmty-center cmty-wide-center">
                    <HousePublicView
                        houseId={view.houseId}
                        ranked={ranked}
                        agentId={agentId}
                        myHouse={myHouse}
                        onBack={() => window.history.back()}
                        onOpenForum={(houseId) => openView({ kind: 'houseForum', houseId })}
                        onRequestsChanged={() => setMyRequestsKey(k => k + 1)}
                        viewerMembershipTier={viewerMembershipTier}
                        onShowSubscribe={onShowSubscribe}
                    />
                </section>
            </div>
        );
    } else if (view?.kind === 'houses') {
        layout = (
            <div className="cmty-layout cmty-layout--wide">
                <section className="cmty-center cmty-wide-center">
                    <HousesListView
                        ranked={ranked}
                        loading={rankLoading}
                        onBack={() => window.history.back()}
                        onOpenHouse={(houseId) => openView({ kind: 'house', houseId })}
                    />
                </section>
            </div>
        );
    } else if (view?.kind === 'houseForum' || view?.kind === 'houseAsk') {
        layout = (
            <div className="cmty-layout">
                <HouseForumView
                    key={view.houseId}
                    houseId={view.houseId}
                    askId={view.kind === 'houseAsk' ? view.askId : null}
                    agentId={agentId}
                    agentName={agentName}
                    agentAvatar={agentAvatar}
                    myEmail={myEmail}
                    myHouse={myHouse}
                    ranked={ranked}
                    badges={badges}
                    onOpenView={openView}
                    onBack={closeView}
                    onHouseChanged={onHouseChanged}
                    onRequireAuth={onRequireAuth}
                    viewerMembershipTier={viewerMembershipTier}
                    onShowSubscribe={onShowSubscribe}
                    requestsKey={requestsKey}
                />
            </div>
        );
    } else {
        layout = (
            <div className="cmty-layout">
                {categoriesPanel}
                <section className="cmty-center">{forumCenter}</section>
                {housesPanel}
            </div>
        );
    }

    return (
        <div className="ep-page">

            <TopNav
                activeLink="community" disableActiveLink={!view}
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius} onShowQuotes={onShowQuotes}
                onShowNewsletter={onShowNewsletter} onShowCommunity={closeView}
                onShowCreate={onShowCreate} onShowFavorites={onShowFavorites} onShowSubscribe={onShowSubscribe}
                onLogout={onLogout} isLoggedIn={isLoggedIn}
                agentAvatar={agentAvatar} onOpenProfile={onOpenProfile}
                onOpenSearch={() => setSearchModalOpen(true)}
            />

            {searchModalOpen && (
                <SearchModal
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={onSelectProperty}
                    onClose={() => setSearchModalOpen(false)}
                />
            )}

            {createHouseOpen && (
                <CreateHouseModal
                    agentId={agentId}
                    onClose={() => setCreateHouseOpen(false)}
                    onCreated={(house) => {
                        setCreateHouseOpen(false);
                        onHouseChanged();
                        openView({ kind: 'houseForum', houseId: house.$id });
                    }}
                />
            )}

            <div className="ep-hero cmty-hero">
                <div className="ep-hero-medallion cmty-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                {layout}
            </div>
        </div>
    );
};

// ── Locked view (no Extra) — "community 2" mockup ──
// Only one slide's copy exists so far; add the others here and the arrows /
// dots (same as HomePage's hero carousel) start rotating through them.
const LOCKED_SLIDES = [
    { headline: 'Join a growing community where thousands of members experiment, learn, and grow together' },
    // Read-only previews of the two Community world maps (nothing clickable).
    { map: 'members' },
    { map: 'questions' },
];
const LOCKED_ROTATE_MS = 5000;

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

const CommunityLocked = (props) => {
    const {
        searchTerm, onSearchChange, onGoToExplore, onGoHome, onShowGenius, onShowQuotes, onShowNewsletter, onShowSubscribe, onShowCreate,
        onShowFavorites, onLogout, isLoggedIn, movieList, isLoading, errorMessage, onSelectProperty,
        agentAvatar, onOpenProfile, onSpeakWithExperts,
    } = props;
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [slideIndex, setSlideIndex] = useState(0);
    const [hovered, setHovered] = useState(false);
    const count = LOCKED_SLIDES.length;

    // Auto-rotation, same 5s rhythm as the Community maps; restarts after a
    // manual change (arrows / dots).
    // Paused while the pointer is over a map slide, so it can be zoomed.
    const onMap = hovered && !!LOCKED_SLIDES[slideIndex]?.map;
    useEffect(() => {
        if (count <= 1 || onMap) return;
        const id = setTimeout(() => setSlideIndex(prev => (prev + 1) % count), LOCKED_ROTATE_MS);
        return () => clearTimeout(id);
    }, [count, slideIndex, onMap]);

    return (
        <div className="ep-page">
            <TopNav
                activeLink="community" disableActiveLink
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius} onShowQuotes={onShowQuotes}
                onShowNewsletter={onShowNewsletter}
                onShowCreate={onShowCreate} onShowFavorites={onShowFavorites} onShowSubscribe={onShowSubscribe}
                onLogout={onLogout} isLoggedIn={isLoggedIn}
                agentAvatar={agentAvatar} onOpenProfile={onOpenProfile}
                onOpenSearch={() => setSearchModalOpen(true)}
            />

            {searchModalOpen && (
                <SearchModal
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={onSelectProperty}
                    onClose={() => setSearchModalOpen(false)}
                />
            )}

            <div className="ep-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="cmty-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#cmty-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="hp-hero-content">
                    <div className="hp-intro hp-row-wrap cmty-locked-intro">
                        <button
                            className="hp-row-arrow hp-row-arrow--left"
                            onClick={() => setSlideIndex(prev => (prev - 1 + count) % count)}
                            aria-label="Previous slide"
                        >
                            <FiChevronLeft size={22} />
                        </button>
                        <button
                            className="hp-row-arrow hp-row-arrow--right"
                            onClick={() => setSlideIndex(prev => (prev + 1) % count)}
                            aria-label="Next slide"
                        >
                            <FiChevronRight size={22} />
                        </button>
                        <div className="hp-slide-viewport" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
                            <div
                                className="hp-slide-track"
                                style={{
                                    width: `${count * 100}%`,
                                    transform: `translateX(-${slideIndex * (100 / count)}%)`,
                                }}
                            >
                                {LOCKED_SLIDES.map((slide, i) => (
                                    <div key={i} className={`hp-slide-content cmty-locked-slide${slide.map ? ' cmty-locked-slide--map' : ''}`} style={{ width: `${100 / count}%` }}>
                                        {slide.map
                                            ? <WorldMap readOnly only={slide.map} badges={[]} onPreviewClick={onSpeakWithExperts} />
                                            : <h1 className="hp-headline cmty-locked-headline">{slide.headline}</h1>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="hp-dots">
                            {LOCKED_SLIDES.map((slide, i) => (
                                <button
                                    key={i}
                                    className={`hp-dot${i === slideIndex ? ' hp-dot--active' : ''}`}
                                    aria-label={`Slide ${i + 1}`}
                                    onClick={() => setSlideIndex(i)}
                                />
                            ))}
                        </div>
                        <button className="cmty-house-btn cmty-locked-btn" onClick={onSpeakWithExperts}>
                            Speak With Our Experts
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Community is an Extra (or Premium) feature — everyone else gets the locked
// page. `accessLoading` covers the moment between login and the agent
// profile (membershipTier) arriving, so members don't flash the locked view.
const CommunityPage = ({ hasAccess, accessLoading, ...props }) => {
    if (accessLoading) {
        return (
            <div className="ep-page">
                <TopNav activeLink="community" disableActiveLink {...props} />
                <div className="ep-hero"><div className="cmty-empty"><Spinner /></div></div>
            </div>
        );
    }
    return hasAccess ? <CommunityForum {...props} /> : <CommunityLocked {...props} />;
};

export { AskCard };
export default CommunityPage;
