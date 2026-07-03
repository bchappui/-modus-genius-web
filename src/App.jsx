import React, { useEffect, useState } from 'react'
import Spinner from "./components/Spinner.jsx";
import { databases, account, DATABASE_ID, PROPERTIES_COLLECTION_ID, AGENTS_COLLECTION_ID, Query } from './lib/appwrite.js';
import CardHome from "./components/CardHome.jsx";
import LoginPage from "./components/LoginPage.jsx";
import FavoritesPage from "./components/FavoritesPage.jsx";
import ExplorePage from "./components/ExplorePage.jsx";
import SubscribePage from "./components/SubscribePage.jsx";
import HomePage from "./components/HomePage.jsx";
import GeniusPage from "./components/GeniusPage.jsx";
import { enrichWithAgents } from './lib/properties.js';
import { getFavoriteIds, toggleFavorite } from './lib/favorites.js';
import { getLikeIds, toggleLike } from './lib/likes.js';
import { hasUserCommented } from './lib/comments.js';

const App = () => {
    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [movieList, setMovieList] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [showFavorites, setShowFavorites] = useState(false);
    const [showSubscribe, setShowSubscribe] = useState(false);
    const [showHome, setShowHome] = useState(true);
    const [showGenius, setShowGenius] = useState(false);
    const [agentId, setAgentId] = useState(null);
    const [agentProfile, setAgentProfile] = useState(null);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [likeIds, setLikeIds] = useState([]);
    const [hasCommented, setHasCommented] = useState(false);
    const [propertiesCount, setPropertiesCount] = useState(null);

    useEffect(() => {
        account.get()
            .then(user => setAuthUser(user))
            .catch(() => setAuthUser(null))
            .finally(() => setAuthLoading(false));
    }, []);

    // favorites.userId stores the `agents` document $id, linked to the
    // Appwrite account via the agent's `accountId` field — not the raw account $id.
    useEffect(() => {
        if (!authUser) { setAgentId(null); setAgentProfile(null); return; }
        const resolveAgentId = async () => {
            try {
                const result = await databases.listDocuments(DATABASE_ID, AGENTS_COLLECTION_ID, [
                    Query.equal('accountId', authUser.$id),
                    Query.limit(1),
                ]);
                const doc = result.documents[0];
                setAgentId(doc?.$id || authUser.$id);
                setAgentProfile({ name: doc?.name || authUser.name || 'Anonymous', avatar: doc?.avatar || '' });
            } catch (e) {
                console.error('Error resolving agent id', e);
                setAgentId(authUser.$id);
                setAgentProfile({ name: authUser.name || 'Anonymous', avatar: '' });
            }
        };
        resolveAgentId();
    }, [authUser]);

    useEffect(() => {
        if (!agentId) { setFavoriteIds([]); return; }
        getFavoriteIds(agentId).then(setFavoriteIds).catch(e => console.error('Error fetching favorites', e));
    }, [agentId]);

    const handleToggleFavorite = async (propertyId) => {
        if (!agentId) return;
        try {
            const { status } = await toggleFavorite(agentId, propertyId);
            setFavoriteIds(prev => status === 'added'
                ? [...prev, propertyId]
                : prev.filter(id => id !== propertyId));
        } catch (e) {
            console.error('Error toggling favorite', e);
            alert(e.message || 'Could not update favorites.');
        }
    };

    useEffect(() => {
        if (!agentId) { setLikeIds([]); return; }
        getLikeIds(agentId).then(setLikeIds).catch(e => console.error('Error fetching likes', e));
    }, [agentId]);

    const handleToggleLike = async (property) => {
        if (!agentId || !property) return;
        try {
            const { status, likeCount } = await toggleLike(agentId, property.$id, property.type, property.agent?.$id || '');
            setLikeIds(prev => status === 'added'
                ? [...prev, property.$id]
                : prev.filter(id => id !== property.$id));
            setSelectedProperty(prev => prev && prev.$id === property.$id ? { ...prev, likeCount } : prev);
        } catch (e) {
            console.error('Error toggling like', e);
        }
    };

    const handleCommentCountChange = (reviewCount) => {
        setSelectedProperty(prev => prev ? { ...prev, reviewCount } : prev);
    };

    useEffect(() => {
        if (!selectedProperty || !agentProfile?.name) { setHasCommented(false); return; }
        hasUserCommented(selectedProperty.$id, agentProfile.name)
            .then(setHasCommented)
            .catch(e => console.error('Error checking own comment', e));
    }, [selectedProperty?.$id, agentProfile?.name]);

    // Deep link from ShareModal's copied/shared URL (?property=<id>) — open that
    // card directly once logged in, then strip the param so a later refresh
    // doesn't keep reopening it.
    useEffect(() => {
        if (!authUser) return;
        const params = new URLSearchParams(window.location.search);
        const propertyId = params.get('property');
        if (!propertyId) return;

        const openSharedProperty = async () => {
            try {
                const doc = await databases.getDocument(DATABASE_ID, PROPERTIES_COLLECTION_ID, propertyId);
                const [enriched] = await enrichWithAgents([doc]);
                setSelectedProperty(enriched);
            } catch (e) {
                console.error('Error opening shared property', e);
            } finally {
                const url = new URL(window.location.href);
                url.searchParams.delete('property');
                window.history.replaceState({ selectedPropertyId: propertyId }, '', url);
            }
        };
        openSharedProperty();
    }, [authUser]);

    useEffect(() => {
        databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [Query.limit(1)])
            .then(result => setPropertiesCount(result.total))
            .catch(e => console.error('Error fetching properties count', e));
    }, []);

    // Every navigational action (category, favorites, subscribe, opening a card)
    // pushes a history entry so the browser's back button always steps back
    // within the app instead of leaving it entirely (e.g. to the Google OAuth
    // redirect page). `patch` only needs to name what's changing — everything
    // else carries over from the current view.
    const navigateTo = (patch) => {
        const next = {
            selectedType: patch.selectedType !== undefined ? patch.selectedType : selectedType,
            showFavorites: patch.showFavorites !== undefined ? patch.showFavorites : showFavorites,
            showSubscribe: patch.showSubscribe !== undefined ? patch.showSubscribe : showSubscribe,
            showHome: patch.showHome !== undefined ? patch.showHome : showHome,
            showGenius: patch.showGenius !== undefined ? patch.showGenius : showGenius,
            selectedProperty: patch.selectedProperty !== undefined ? patch.selectedProperty : selectedProperty,
        };
        window.history.pushState({
            selectedType: next.selectedType,
            showFavorites: next.showFavorites,
            showSubscribe: next.showSubscribe,
            showHome: next.showHome,
            showGenius: next.showGenius,
            selectedPropertyId: next.selectedProperty?.$id || null,
        }, '', '');
        setSelectedType(next.selectedType);
        setShowFavorites(next.showFavorites);
        setShowSubscribe(next.showSubscribe);
        setShowHome(next.showHome);
        setShowGenius(next.showGenius);
        setSelectedProperty(next.selectedProperty);
    };

    const handleSelectCategory = (type) => {
        setSearchTerm('');
        navigateTo({ selectedType: type });
    };

    const applyHistoryState = (state) => {
        setSelectedType(state?.selectedType || null);
        setShowFavorites(!!state?.showFavorites);
        setShowSubscribe(!!state?.showSubscribe);
        setShowHome(!!state?.showHome);
        setShowGenius(!!state?.showGenius);
        const propId = state?.selectedPropertyId || null;
        if (!propId) { setSelectedProperty(null); return; }
        databases.getDocument(DATABASE_ID, PROPERTIES_COLLECTION_ID, propId)
            .then(doc => enrichWithAgents([doc]))
            .then(([enriched]) => setSelectedProperty(enriched))
            .catch(e => console.error('Error restoring property from history', e));
    };

    useEffect(() => {
        const onPopState = (e) => applyHistoryState(e.state);
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    useEffect(() => {
        if (!searchTerm && !selectedType) {
            setMovieList([]);
            return;
        }

        const fetchProperties = async () => {
            setIsLoading(true);
            setErrorMessage('');
            try {
                let documents;
                if (searchTerm) {
                    const [byName, byDesc] = await Promise.all([
                        databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [Query.search('name', searchTerm), Query.limit(1000)]),
                        databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [Query.search('description', searchTerm), Query.limit(1000)]),
                    ]);
                    const seen = new Set();
                    documents = [...byName.documents, ...byDesc.documents].filter(d => seen.has(d.$id) ? false : seen.add(d.$id));
                } else {
                    const result = await databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [
                        Query.equal('type', selectedType),
                        Query.limit(1000),
                    ]);
                    documents = result.documents;
                }
                setMovieList(await enrichWithAgents(documents));
            } catch (error) {
                console.error(error);
                setErrorMessage('Something went wrong');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProperties();
    }, [searchTerm, selectedType]);

    if (authLoading) return (
        <div style={{ minHeight: '100vh', background: '#030014', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner />
        </div>
    );

    if (!authUser) return (
        <LoginPage onLoginSuccess={() => account.get().then(setAuthUser)} />
    );

    const goToExplore = () => { setSearchTerm(''); navigateTo({ selectedType: null, showFavorites: false, showSubscribe: false, showHome: false, showGenius: false }); };

    return (
        <main>
            {showHome ? (
                <HomePage
                    agentId={agentId}
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showHome: false })}
                    onShowGenius={() => navigateTo({ showGenius: true, showHome: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={(property) => navigateTo({ selectedProperty: property })}
                    onShowFavorites={() => navigateTo({ showFavorites: true, showHome: false })}
                    onLogout={() => account.deleteSession('current').catch(() => {}).finally(() => setAuthUser(null))}
                />
            ) : showSubscribe ? (
                <SubscribePage
                    onBack={() => navigateTo({ showSubscribe: false })}
                    onLoginClick={() => account.deleteSession('current').catch(() => {}).finally(() => setAuthUser(null))}
                />
            ) : showGenius ? (
                <GeniusPage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onGoHome={() => navigateTo({ showHome: true, showGenius: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showGenius: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={(property) => navigateTo({ selectedProperty: property })}
                    onShowFavorites={() => navigateTo({ showFavorites: true, showGenius: false })}
                    onLogout={() => account.deleteSession('current').catch(() => {}).finally(() => setAuthUser(null))}
                />
            ) : !showFavorites ? (
                <ExplorePage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onSelectCategory={handleSelectCategory}
                    selectedType={selectedType}
                    onGoToExplore={goToExplore}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true })}
                    onGoHome={() => navigateTo({ showHome: true })}
                    onShowGenius={() => navigateTo({ showGenius: true })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={(property) => navigateTo({ selectedProperty: property })}
                    propertiesCount={propertiesCount}
                    onShowFavorites={() => navigateTo({ showFavorites: true })}
                    onLogout={() => account.deleteSession('current').catch(() => {}).finally(() => setAuthUser(null))}
                />
            ) : (
            <>
            <div className="pattern" />
            <div className="wrapper">
                <header>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => navigateTo({ showFavorites: false })} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>
                            Back to Explore
                        </button>
                        <button onClick={() => account.deleteSession('current').catch(() => {}).finally(() => setAuthUser(null))} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>
                            Log out
                        </button>
                    </div>
                    <img src="./favicon.svg" alt="Hero Banner"/>
                    <h1>Find <span className="text-gradient">Movies</span> You'll Enjoy Without the Hassle</h1>
                </header>
                <FavoritesPage
                    favoriteIds={favoriteIds}
                    onBack={() => navigateTo({ showFavorites: false })}
                    onSelect={(property) => navigateTo({ selectedProperty: property })}
                />
            </div>
            </>
            )}
            <CardHome
                property={selectedProperty}
                onClose={() => navigateTo({ selectedProperty: null })}
                isFavorite={!!selectedProperty && favoriteIds.includes(selectedProperty.$id)}
                onToggleFavorite={() => selectedProperty && handleToggleFavorite(selectedProperty.$id)}
                isLiked={!!selectedProperty && likeIds.includes(selectedProperty.$id)}
                onToggleLike={() => selectedProperty && handleToggleLike(selectedProperty)}
                currentUserName={agentProfile?.name}
                currentUserAvatar={agentProfile?.avatar}
                onCommentCountChange={handleCommentCountChange}
                hasCommented={hasCommented}
                onOwnCommentChange={setHasCommented}
            />
        </main>
    )
}

export default App
