import React, { useEffect, useState } from 'react'
import Spinner from "./components/shared/Spinner.jsx";
import { databases, account, DATABASE_ID, PROPERTIES_COLLECTION_ID, AGENTS_COLLECTION_ID, Query } from './lib/appwrite.js';
import CardHome from "./components/overlays/CardHome.jsx";
import QuoteHome from "./components/overlays/QuoteHome.jsx";
import QuotesPage from "./components/pages/QuotesPage.jsx";
import LoginPage from "./components/pages/LoginPage.jsx";
import FavoritesPage from "./components/pages/FavoritesPage.jsx";
import ExplorePage from "./components/pages/ExplorePage.jsx";
import SubscribePage from "./components/pages/SubscribePage.jsx";
import HomePage from "./components/pages/HomePage.jsx";
import GeniusPage from "./components/pages/GeniusPage.jsx";
import NewsletterPage from "./components/pages/NewsletterPage.jsx";
import CreatePage from "./components/pages/CreatePage.jsx";
import AboutPage from "./components/pages/AboutPage.jsx";
import ThanksArchive from "./components/pages/ThanksArchive.jsx";
import ExitIntentModal from "./components/modals/ExitIntentModal.jsx";
import NewsletterExitModal from "./components/modals/NewsletterExitModal.jsx";
import AuthRequiredModal from "./components/modals/AuthRequiredModal.jsx";
import EditProfileModal from "./components/modals/EditProfileModal.jsx";
import MonthlyLimitModal from "./components/modals/MonthlyLimitModal.jsx";
import { enrichWithAgents } from './lib/properties.js';
import { getFavoriteIds, toggleFavorite } from './lib/favorites.js';
import { getLikeIds, toggleLike } from './lib/likes.js';
import { hasUserCommented } from './lib/comments.js';
import { getQuoteById, hasUserCommentedQuote } from './lib/quotes.js';
import { updateAgent, getCurrentMonthKey } from './lib/agents.js';
import { redeemGiftCode, getGiftUnlockedPropertyIds } from './lib/giftcodes.js';

const App = () => {
    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [movieList, setMovieList] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [showFavorites, setShowFavorites] = useState(false);
    const [showSubscribe, setShowSubscribe] = useState(false);
    const [showHome, setShowHome] = useState(true);
    const [showGenius, setShowGenius] = useState(false);
    const [showQuotes, setShowQuotes] = useState(false);
    const [showNewsletter, setShowNewsletter] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [showThanksArchive, setShowThanksArchive] = useState(false);
    const [agentId, setAgentId] = useState(null);
    const [agentProfile, setAgentProfile] = useState(null);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [likeIds, setLikeIds] = useState([]);
    const [hasCommented, setHasCommented] = useState(false);
    const [hasCommentedQuote, setHasCommentedQuote] = useState(false);
    const [propertiesCount, setPropertiesCount] = useState(null);
    const [exitIntentOpen, setExitIntentOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [limitedProperty, setLimitedProperty] = useState(null);

    // Mirrors the render ternary below: Favorites only actually renders once
    // every other page flag is false and showFavorites is true.
    const isFavoritesPage = !showLogin && !showHome && !showAbout && !showSubscribe
        && !showCreate && !showNewsletter && !showGenius && !showQuotes && !showThanksArchive && showFavorites;

    // Browsing the site never requires an account — only opening a card
    // (and, consistently, viewing Favorites) does. Wrap any handler that
    // should be gated with this instead of calling it directly.
    const requireAuth = (fn) => (...args) => {
        if (!authUser) { setAuthModalOpen(true); return; }
        fn(...args);
    };

    // Opening a card while logged out: stash it as a ?property=/?quote= deep
    // link (same param the ShareModal effects below already know how to
    // restore) before showing the auth modal, so it survives both an inline
    // email/password login AND Google OAuth's full-page redirect, and reopens
    // right after — instead of dropping the visitor on the Home page.
    // Free (non-gift, non-member) accounts get one distinct card per calendar
    // month — reopening that same card again doesn't cost anything, only
    // trying a *different* card once the month's slot is already spent does.
    const requireAuthForProperty = (property) => {
        if (!authUser) {
            const url = new URL(window.location.href);
            url.searchParams.set('property', property.$id);
            window.history.replaceState(null, '', url);
            setAuthModalOpen(true);
            return;
        }

        if (agentProfile?.unlockedPropertyIds?.includes(property.$id)) { navigateTo({ selectedProperty: property }); return; }

        const month = getCurrentMonthKey();
        const usedThisMonth = agentProfile?.freeCardMonth === month;
        const sameCard = usedThisMonth && agentProfile?.freeCardPropertyId === property.$id;

        if (!usedThisMonth || sameCard) {
            if (!usedThisMonth) {
                setAgentProfile(prev => prev ? { ...prev, freeCardMonth: month, freeCardPropertyId: property.$id } : prev);
                updateAgent(agentId, { freeCardMonth: month, freeCardPropertyId: property.$id })
                    .catch(e => console.error('Error recording monthly card use', e));
            }
            navigateTo({ selectedProperty: property });
            return;
        }

        setLimitedProperty(property);
        setLimitModalOpen(true);
    };

    const requireAuthForQuote = (quote) => {
        if (authUser) { navigateTo({ selectedQuote: quote }); return; }
        const url = new URL(window.location.href);
        url.searchParams.set('quote', quote.$id);
        window.history.replaceState(null, '', url);
        setAuthModalOpen(true);
    };

    // Nav's "Log out" button doubles as "Log in" when logged out — same spot,
    // opposite action. Goes straight to the login page (the user already
    // expressed intent to log in, unlike the gated-action modal).
    const handleAuthAction = () => {
        if (authUser) {
            account.deleteSession('current').catch(() => {}).finally(() => setAuthUser(null));
        } else {
            setShowLogin(true);
        }
    };

    // Keeps the nav avatar/name in sync right after EditProfileModal saves,
    // without waiting for the next resolveAgentId round-trip.
    const handleProfileSaved = ({ name, avatar }) => {
        setAgentProfile(prev => prev ? { ...prev, name, avatar } : prev);
    };

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
                const resolvedAgentId = doc?.$id || authUser.$id;
                const unlockedPropertyIds = await getGiftUnlockedPropertyIds(resolvedAgentId).catch(() => []);
                setAgentId(resolvedAgentId);
                setAgentProfile({
                    name: doc?.name || authUser.name || 'Anonymous',
                    avatar: doc?.avatar || '',
                    freeCardMonth: doc?.freeCardMonth || '',
                    freeCardPropertyId: doc?.freeCardPropertyId || '',
                    unlockedPropertyIds,
                });
            } catch (e) {
                console.error('Error resolving agent id', e);
                setAgentId(authUser.$id);
                setAgentProfile({ name: authUser.name || 'Anonymous', avatar: '', freeCardMonth: '', freeCardPropertyId: '', unlockedPropertyIds: [] });
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

    const handleQuoteCommentCountChange = (commentCount) => {
        setSelectedQuote(prev => prev ? { ...prev, commentCount } : prev);
    };

    useEffect(() => {
        if (!selectedQuote || !agentId) { setHasCommentedQuote(false); return; }
        hasUserCommentedQuote(selectedQuote.$id, agentId)
            .then(setHasCommentedQuote)
            .catch(e => console.error('Error checking own quote comment', e));
    }, [selectedQuote?.$id, agentId]);

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

    // Same deep-link pattern as above, for ShareModal's (?quote=<id>) links.
    useEffect(() => {
        if (!authUser) return;
        const params = new URLSearchParams(window.location.search);
        const quoteId = params.get('quote');
        if (!quoteId) return;

        const openSharedQuote = async () => {
            try {
                setSelectedQuote(await getQuoteById(quoteId));
            } catch (e) {
                console.error('Error opening shared quote', e);
            } finally {
                const url = new URL(window.location.href);
                url.searchParams.delete('quote');
                window.history.replaceState({ selectedQuoteId: quoteId }, '', url);
            }
        };
        openSharedQuote();
    }, [authUser]);

    // Redeems a gift code validated in AuthRequiredModal before login/signup —
    // stashed as ?giftcode=<codeDocId> so it survives Google OAuth's full-page
    // redirect too. Waits on agentId (not just authUser) since redemption
    // needs the agents-collection document id, not the raw account id.
    useEffect(() => {
        if (!agentId) return;
        const params = new URLSearchParams(window.location.search);
        const giftCodeId = params.get('giftcode');
        if (!giftCodeId) return;

        redeemGiftCode(giftCodeId, agentId)
            .then(doc => setAgentProfile(prev => prev
                ? { ...prev, unlockedPropertyIds: [...(prev.unlockedPropertyIds || []), doc.propertyId] }
                : prev))
            .catch(e => console.error('Error redeeming gift code', e))
            .finally(() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('giftcode');
                window.history.replaceState(null, '', url);
            });
    }, [agentId]);

    // Landing spot for visitors coming back from the beehiiv newsletter signup
    // form. Point beehiiv's "redirect after subscribe" URL at this site with
    // ?thanks=1 appended to land here instead of wherever they started.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (!params.get('thanks')) return;
        navigateTo({ showThanksArchive: true, showHome: false });
        const url = new URL(window.location.href);
        url.searchParams.delete('thanks');
        window.history.replaceState(null, '', url);
    }, []);

    useEffect(() => {
        databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [Query.limit(1)])
            .then(result => setPropertiesCount(result.total))
            .catch(e => console.error('Error fetching properties count', e));
    }, []);

    // Exit-intent: pops a "before you go" modal once the cursor leaves the
    // page toward the browser chrome (tab bar / close button) at the top of
    // the viewport — the classic desktop exit-intent trick. Fires once per
    // page context (Subscribe / Favorites / everything else), only once the
    // user is logged into the app. Re-arms on navigation between those
    // contexts so Subscribe's promo modal and the newsletter modal elsewhere
    // each get their own shot, instead of one global "used up" flag blocking
    // the other for the rest of the tab.
    useEffect(() => {
        if (!authUser) return;
        let shown = false;
        const onMouseOut = (e) => {
            if (shown || e.clientY > 10 || e.relatedTarget) return;
            shown = true;
            setExitIntentOpen(true);
        };
        document.addEventListener('mouseout', onMouseOut);
        return () => document.removeEventListener('mouseout', onMouseOut);
    }, [authUser, showSubscribe, isFavoritesPage]);

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
            showQuotes: patch.showQuotes !== undefined ? patch.showQuotes : showQuotes,
            showNewsletter: patch.showNewsletter !== undefined ? patch.showNewsletter : showNewsletter,
            showCreate: patch.showCreate !== undefined ? patch.showCreate : showCreate,
            showAbout: patch.showAbout !== undefined ? patch.showAbout : showAbout,
            showThanksArchive: patch.showThanksArchive !== undefined ? patch.showThanksArchive : showThanksArchive,
            selectedProperty: patch.selectedProperty !== undefined ? patch.selectedProperty : selectedProperty,
            selectedQuote: patch.selectedQuote !== undefined ? patch.selectedQuote : selectedQuote,
        };
        window.history.pushState({
            selectedType: next.selectedType,
            showFavorites: next.showFavorites,
            showSubscribe: next.showSubscribe,
            showHome: next.showHome,
            showGenius: next.showGenius,
            showQuotes: next.showQuotes,
            showNewsletter: next.showNewsletter,
            showCreate: next.showCreate,
            showAbout: next.showAbout,
            showThanksArchive: next.showThanksArchive,
            selectedPropertyId: next.selectedProperty?.$id || null,
            selectedQuoteId: next.selectedQuote?.$id || null,
        }, '', '');
        setSelectedType(next.selectedType);
        setShowFavorites(next.showFavorites);
        setShowSubscribe(next.showSubscribe);
        setShowHome(next.showHome);
        setShowGenius(next.showGenius);
        setShowQuotes(next.showQuotes);
        setShowNewsletter(next.showNewsletter);
        setShowCreate(next.showCreate);
        setShowAbout(next.showAbout);
        setShowThanksArchive(next.showThanksArchive);
        setSelectedProperty(next.selectedProperty);
        setSelectedQuote(next.selectedQuote);
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
        setShowQuotes(!!state?.showQuotes);
        setShowNewsletter(!!state?.showNewsletter);
        setShowCreate(!!state?.showCreate);
        setShowAbout(!!state?.showAbout);
        setShowThanksArchive(!!state?.showThanksArchive);

        const propId = state?.selectedPropertyId || null;
        if (!propId) { setSelectedProperty(null); }
        else {
            databases.getDocument(DATABASE_ID, PROPERTIES_COLLECTION_ID, propId)
                .then(doc => enrichWithAgents([doc]))
                .then(([enriched]) => setSelectedProperty(enriched))
                .catch(e => console.error('Error restoring property from history', e));
        }

        const quoteId = state?.selectedQuoteId || null;
        if (!quoteId) { setSelectedQuote(null); }
        else {
            getQuoteById(quoteId)
                .then(setSelectedQuote)
                .catch(e => console.error('Error restoring quote from history', e));
        }
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

    const goToExplore = () => { setSearchTerm(''); navigateTo({ selectedType: null, showFavorites: false, showSubscribe: false, showHome: false, showGenius: false, showQuotes: false, showNewsletter: false, showCreate: false, showAbout: false }); };

    return (
        <main>
            {showLogin ? (
                <LoginPage
                    onLoginSuccess={() => { account.get().then(setAuthUser); setShowLogin(false); }}
                    onBack={() => setShowLogin(false)}
                    onGoHome={() => { setShowLogin(false); navigateTo({ showHome: true }); }}
                    onGoToExplore={() => { setShowLogin(false); goToExplore(); }}
                    onShowGenius={() => { setShowLogin(false); navigateTo({ showGenius: true }); }}
                    onShowQuotes={() => { setShowLogin(false); navigateTo({ showQuotes: true }); }}
                    onShowNewsletter={() => { setShowLogin(false); navigateTo({ showNewsletter: true }); }}
                    onShowCreate={() => { setShowLogin(false); navigateTo({ showCreate: true }); }}
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                />
            ) : showHome ? (
                <HomePage
                    agentId={agentId}
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showHome: false })}
                    onShowGenius={() => navigateTo({ showGenius: true, showHome: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showHome: false })}
                    onShowCreate={() => navigateTo({ showCreate: true, showHome: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showHome: false })}
                    onLearnMore={() => navigateTo({ showAbout: true, showHome: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showHome: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setProfileModalOpen(true)}
                />
            ) : showAbout ? (
                <AboutPage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoHome={() => navigateTo({ showHome: true, showAbout: false })}
                    onGoToExplore={goToExplore}
                    onShowGenius={() => navigateTo({ showGenius: true, showAbout: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showAbout: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showAbout: false })}
                    onShowCreate={() => navigateTo({ showCreate: true, showAbout: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showAbout: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showAbout: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setProfileModalOpen(true)}
                />
            ) : showThanksArchive ? (
                <ThanksArchive
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoHome={() => navigateTo({ showHome: true, showThanksArchive: false })}
                    onGoToExplore={goToExplore}
                    onShowGenius={() => navigateTo({ showGenius: true, showThanksArchive: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showThanksArchive: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showThanksArchive: false })}
                    onShowCreate={() => navigateTo({ showCreate: true, showThanksArchive: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showThanksArchive: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showThanksArchive: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setProfileModalOpen(true)}
                />
            ) : showSubscribe ? (
                <SubscribePage
                    onBack={() => navigateTo({ showSubscribe: false })}
                    onLoginClick={handleAuthAction}
                />
            ) : showCreate ? (
                <CreatePage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onGoHome={() => navigateTo({ showHome: true, showCreate: false })}
                    onShowGenius={() => navigateTo({ showGenius: true, showCreate: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showCreate: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showCreate: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showCreate: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showCreate: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setProfileModalOpen(true)}
                />
            ) : showNewsletter ? (
                <NewsletterPage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onGoHome={() => navigateTo({ showHome: true, showNewsletter: false })}
                    onShowGenius={() => navigateTo({ showGenius: true, showNewsletter: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showNewsletter: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showNewsletter: false })}
                    onShowCreate={() => navigateTo({ showCreate: true, showNewsletter: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showNewsletter: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setProfileModalOpen(true)}
                />
            ) : showGenius ? (
                <GeniusPage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onGoHome={() => navigateTo({ showHome: true, showGenius: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showGenius: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showGenius: false })}
                    onShowCreate={() => navigateTo({ showCreate: true, showGenius: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showGenius: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showGenius: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setProfileModalOpen(true)}
                />
            ) : showQuotes ? (
                <QuotesPage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onGoHome={() => navigateTo({ showHome: true, showQuotes: false })}
                    onShowGenius={() => navigateTo({ showGenius: true, showQuotes: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showQuotes: false })}
                    onShowCreate={() => navigateTo({ showCreate: true, showQuotes: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showQuotes: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectQuote={requireAuthForQuote}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showQuotes: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setProfileModalOpen(true)}
                />
            ) : !showFavorites ? (
                <ExplorePage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onSelectCategory={handleSelectCategory}
                    selectedType={selectedType}
                    onGoToExplore={goToExplore}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true })}
                    onGoHome={() => navigateTo({ showHome: true })}
                    onShowGenius={() => navigateTo({ showGenius: true })}
                    onShowQuotes={() => navigateTo({ showQuotes: true })}
                    onShowCreate={() => navigateTo({ showCreate: true })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    propertiesCount={propertiesCount}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setProfileModalOpen(true)}
                />
            ) : (
                <FavoritesPage
                    favoriteIds={favoriteIds}
                    onSelect={(property) => navigateTo({ selectedProperty: property })}
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoHome={() => navigateTo({ showHome: true, showFavorites: false })}
                    onGoToExplore={goToExplore}
                    onShowGenius={() => navigateTo({ showGenius: true, showFavorites: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showFavorites: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showFavorites: false })}
                    onShowCreate={() => navigateTo({ showCreate: true, showFavorites: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showFavorites: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setProfileModalOpen(true)}
                />
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
            <QuoteHome
                quote={selectedQuote}
                onClose={() => navigateTo({ selectedQuote: null })}
                currentUserId={agentId}
                currentUserName={agentProfile?.name}
                currentUserAvatar={agentProfile?.avatar}
                onCommentCountChange={handleQuoteCommentCountChange}
                hasCommented={hasCommentedQuote}
                onOwnCommentChange={setHasCommentedQuote}
            />
            {exitIntentOpen && showSubscribe && (
                <ExitIntentModal onClose={() => setExitIntentOpen(false)} />
            )}
            {exitIntentOpen && !showSubscribe && !isFavoritesPage && !showThanksArchive && (
                <NewsletterExitModal
                    onClose={() => setExitIntentOpen(false)}
                />
            )}
            {authModalOpen && (
                <AuthRequiredModal
                    onClose={() => setAuthModalOpen(false)}
                    onLoginSuccess={() => { account.get().then(setAuthUser); setAuthModalOpen(false); }}
                />
            )}
            {profileModalOpen && agentId && (
                <EditProfileModal
                    agentId={agentId}
                    onClose={() => setProfileModalOpen(false)}
                    onSaved={handleProfileSaved}
                />
            )}
            {limitModalOpen && agentId && (
                <MonthlyLimitModal
                    agentId={agentId}
                    property={limitedProperty}
                    onClose={() => { setLimitModalOpen(false); setLimitedProperty(null); }}
                    onGiftCodeRedeemed={() => {
                        setAgentProfile(prev => prev
                            ? { ...prev, unlockedPropertyIds: [...(prev.unlockedPropertyIds || []), limitedProperty?.$id] }
                            : prev);
                        setLimitModalOpen(false);
                        if (limitedProperty) navigateTo({ selectedProperty: limitedProperty });
                        setLimitedProperty(null);
                    }}
                />
            )}
        </main>
    )
}

export default App
