import React, { useEffect, useState } from 'react'
import Search from "./components/Search.jsx";
import Spinner from "./components/Spinner.jsx";
import { databases, account, DATABASE_ID, PROPERTIES_COLLECTION_ID, AGENTS_COLLECTION_ID, Query } from './lib/appwrite.js';
import MiniCard from "./components/MiniCard.jsx";
import CardHome from "./components/CardHome.jsx";
import LoginPage from "./components/LoginPage.jsx";
import FavoritesPage from "./components/FavoritesPage.jsx";
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
    const [typeList, setTypeList] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [showFavorites, setShowFavorites] = useState(false);
    const [agentId, setAgentId] = useState(null);
    const [agentProfile, setAgentProfile] = useState(null);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [likeIds, setLikeIds] = useState([]);
    const [hasCommented, setHasCommented] = useState(false);

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
                window.history.replaceState({}, '', url);
            }
        };
        openSharedProperty();
    }, [authUser]);

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const result = await databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [
                    Query.select(['type']),
                    Query.limit(5000),
                ]);
                const types = [...new Set(result.documents.map(d => d.type).filter(Boolean))].sort();
                setTypeList(types);
            } catch (e) {
                console.error('Error fetching types', e);
            }
        };
        fetchTypes();
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

    const showSearch = !!searchTerm;
    const showTypeView = !searchTerm && !!selectedType;
    const showTypeList = !searchTerm && !selectedType;

    return (
        <main>
            <div className="pattern" />
            <div className="wrapper">
                <header>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => { setShowFavorites(true); setSearchTerm(''); setSelectedType(null); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>
                            Favorites
                        </button>
                        <button onClick={() => account.deleteSession('current').catch(() => {}).finally(() => setAuthUser(null))} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>
                            Log out
                        </button>
                    </div>
                    <img src="./favicon.svg" alt="Hero Banner"/>
                    <h1>Find <span className="text-gradient">Movies</span> You'll Enjoy Without the Hassle</h1>
                    <Search searchTerm={searchTerm} setSearchTerm={(val) => {
                        setSearchTerm(val);
                        if (!val) setSelectedType(null);
                    }} />
                </header>
                {showFavorites ? (
                    <FavoritesPage
                        favoriteIds={favoriteIds}
                        onBack={() => setShowFavorites(false)}
                        onSelect={setSelectedProperty}
                    />
                ) : (
                <section className="all-movies">
                    <h2 className="mt-[40px]">All Movies</h2>
                    {isLoading ? (
                        <Spinner />
                    ) : errorMessage ? (
                        <p className="text-red-500">{errorMessage}</p>
                    ) : showTypeList ? (
                        <ul className="grid grid-cols-2 gap-4 xs:grid-cols-3 md:grid-cols-4">
                            {typeList.map(type => (
                                <li
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className="cursor-pointer bg-dark-100 rounded-2xl p-5 text-white font-bold text-center shadow-inner shadow-light-100/10 hover:bg-light-100/10 transition-colors"
                                >
                                    {type}
                                </li>
                            ))}
                        </ul>
                    ) : showTypeView ? (
                        <>
                            <button
                                onClick={() => setSelectedType(null)}
                                className="text-light-200 text-sm mb-4 hover:text-white transition-colors"
                            >
                                ← Back to types
                            </button>
                            <ul>
                                {movieList.map(property => (
                                    <MiniCard key={property.$id} property={property} onSelect={() => setSelectedProperty(property)} />
                                ))}
                            </ul>
                        </>
                    ) : showSearch ? (
                        <ul>
                            {movieList.map(property => (
                                <MiniCard key={property.$id} property={property} onSelect={() => setSelectedProperty(property)} />
                            ))}
                        </ul>
                    ) : null}
                </section>
                )}
            </div>
            <CardHome
                property={selectedProperty}
                onClose={() => setSelectedProperty(null)}
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
