import React, { useCallback, useEffect, useState } from 'react'
import Spinner from "./components/shared/Spinner.jsx";
import { databases, account, DATABASE_ID, PROPERTIES_COLLECTION_ID, Query } from './lib/appwrite.js';
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
import CommunityPage from "./components/pages/CommunityPage.jsx";
import CreatePage from "./components/pages/CreatePage.jsx";
import AboutPage from "./components/pages/AboutPage.jsx";
import ThanksArchive from "./components/pages/ThanksArchive.jsx";
import ExitIntentModal from "./components/modals/ExitIntentModal.jsx";
import NewsletterExitModal from "./components/modals/NewsletterExitModal.jsx";
import WhereToStartModal from "./components/modals/WhereToStartModal.jsx";
import AuthRequiredModal from "./components/modals/AuthRequiredModal.jsx";
import EditProfileModal from "./components/modals/EditProfileModal.jsx";
import AccountMenuModal from "./components/overlays/AccountMenuModal.jsx";
import CelebrationManager from "./components/overlays/celebration/CelebrationManager.jsx";
import OutOfFreeCardsModal from "./components/modals/OutOfFreeCardsModal.jsx";
import OutOfEssentialsCardsModal from "./components/modals/OutOfEssentialsCardsModal.jsx";
import SeasonPassRequiredModal from "./components/modals/SeasonPassRequiredModal.jsx";
import UpgradeToExtraModal from "./components/modals/UpgradeToExtraModal.jsx";
import HouseNotifications from "./components/overlays/HouseNotifications.jsx";
import { HouseContext } from './lib/houseContext.js';
import { getHouseOfAgent } from './lib/houses.js';
import { enrichWithAgents } from './lib/properties.js';
import { getFavoriteIds, toggleFavorite } from './lib/favorites.js';
import { getLikeIds, toggleLike } from './lib/likes.js';
import { hasUserCommented } from './lib/comments.js';
import { getQuoteById, hasUserCommentedQuote } from './lib/quotes.js';
import { updateAgent, getCurrentMonthKey, getOrCreateAgentForAccount } from './lib/agents.js';
import { redeemGiftCode, getGiftUnlockedPropertyIds } from './lib/giftcodes.js';
import { getPropertyAccessDecision, getTier } from './lib/membership.js';
import { getCurrentSeasonKey } from './lib/seasons.js';
import { getPropertiesByIds } from './lib/properties.js';

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
    const [showCommunity, setShowCommunity] = useState(false);
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
    const [wtsOpen, setWtsOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [subscribeTierPreset, setSubscribeTierPreset] = useState(null);
    const [geniusInitialTab, setGeniusInitialTab] = useState(null);
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [limitedProperty, setLimitedProperty] = useState(null);
    const [limitReason, setLimitReason] = useState('monthly-limit');
    const [upgradeExtraOpen, setUpgradeExtraOpen] = useState(false);
    const [myHouse, setMyHouse] = useState(null);
    // Bumped on realtime request changes so the request boxes re-fetch.
    const [houseRequestsKey, setHouseRequestsKey] = useState(0);

    // Mirrors the render ternary below: Favorites only actually renders once
    // every other page flag is false and showFavorites is true.
    const isFavoritesPage = !showLogin && !showHome && !showAbout && !showSubscribe
        && !showCreate && !showNewsletter && !showCommunity && !showGenius && !showQuotes && !showThanksArchive && showFavorites;

    // Same mirroring, for the other end of that ternary — Explore is what
    // renders when every other page flag (including Favorites) is false.
    const isExplorePage = !showLogin && !showHome && !showAbout && !showSubscribe
        && !showCreate && !showNewsletter && !showCommunity && !showGenius && !showQuotes && !showThanksArchive && !showFavorites;

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
        const decision = getPropertyAccessDecision(agentProfile, property, month);

        if (!decision.allowed) {
            setLimitedProperty(property);
            setLimitReason(decision.reason);
            setLimitModalOpen(true);
            return;
        }

        // Record quota usage for tiers with a numeric monthly cap (free: one
        // slot, essentials: up to N distinct ids) — unlimited tiers (extra/
        // premium) have nothing to record.
        if (decision.tier.key === 'free') {
            const usedThisMonth = agentProfile?.freeCardMonth === month;
            if (!usedThisMonth) {
                setAgentProfile(prev => prev ? { ...prev, freeCardMonth: month, freeCardPropertyId: property.$id } : prev);
                updateAgent(agentId, { freeCardMonth: month, freeCardPropertyId: property.$id })
                    .catch(e => console.error('Error recording monthly card use', e));
            }
        } else if (decision.tier.cardsPerMonth != null) {
            const usedThisMonth = agentProfile?.essentialsCardMonth === month;
            const usedIds = usedThisMonth ? (agentProfile?.essentialsCardPropertyIds || []) : [];
            if (!usedIds.includes(property.$id)) {
                const nextIds = [...usedIds, property.$id];
                setAgentProfile(prev => prev ? { ...prev, essentialsCardMonth: month, essentialsCardPropertyIds: nextIds } : prev);
                updateAgent(agentId, { essentialsCardMonth: month, essentialsCardPropertyIds: nextIds })
                    .catch(e => console.error('Error recording monthly card use', e));
            }
        }

        navigateTo({ selectedProperty: property });
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

    // Test-mode "checkout" — no payment processor yet, so choosing a tier or
    // buying a Season Pass applies immediately. Swap these for real Stripe
    // calls (post-payment-success callbacks) once that's wired up.
    const handleSelectMembershipTier = (tierKey) => {
        if (!agentId) return;
        const membershipTierSince = new Date().toISOString();
        setAgentProfile(prev => prev ? { ...prev, membershipTier: tierKey, membershipTierSince } : prev);
        updateAgent(agentId, { membershipTier: tierKey, membershipTierSince })
            .catch(e => console.error('Error updating membership tier', e));
    };

    const handleBuySeasonPass = () => {
        if (!agentId) return;
        const seasonKey = getCurrentSeasonKey();
        setAgentProfile(prev => prev ? { ...prev, seasonPassSeasonKey: seasonKey } : prev);
        updateAgent(agentId, { seasonPassSeasonKey: seasonKey })
            .catch(e => console.error('Error updating season pass', e));
    };

    const handleCancelSeasonPass = () => {
        if (!agentId) return;
        setAgentProfile(prev => prev ? { ...prev, seasonPassSeasonKey: '' } : prev);
        updateAgent(agentId, { seasonPassSeasonKey: '' })
            .catch(e => console.error('Error canceling season pass', e));
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
                // Creates the agents doc if this account has none yet (accounts
                // made on this site never got one — see getOrCreateAgentForAccount).
                const doc = await getOrCreateAgentForAccount(authUser);
                const resolvedAgentId = doc?.$id || authUser.$id;
                const unlockedPropertyIds = await getGiftUnlockedPropertyIds(resolvedAgentId).catch(() => []);
                setAgentId(resolvedAgentId);
                setAgentProfile({
                    name: doc?.name || authUser.name || 'Anonymous',
                    email: doc?.email || authUser.email || '',
                    avatar: doc?.avatar || '',
                    freeCardMonth: doc?.freeCardMonth || '',
                    freeCardPropertyId: doc?.freeCardPropertyId || '',
                    unlockedPropertyIds,
                    membershipTier: doc?.membershipTier || 'free',
                    membershipTierSince: doc?.membershipTierSince || '',
                    seasonPassSeasonKey: doc?.seasonPassSeasonKey || '',
                    essentialsCardMonth: doc?.essentialsCardMonth || '',
                    essentialsCardPropertyIds: doc?.essentialsCardPropertyIds || [],
                });
            } catch (e) {
                console.error('Error resolving agent id', e);
                setAgentId(authUser.$id);
                setAgentProfile({
                    name: authUser.name || 'Anonymous', avatar: '', freeCardMonth: '', freeCardPropertyId: '', unlockedPropertyIds: [],
                    membershipTier: 'free', seasonPassSeasonKey: '', essentialsCardMonth: '', essentialsCardPropertyIds: [],
                });
            }
        };
        resolveAgentId();
    }, [authUser]);

    useEffect(() => {
        if (!agentId) { setFavoriteIds([]); return; }
        getFavoriteIds(agentId).then(setFavoriteIds).catch(e => console.error('Error fetching favorites', e));
    }, [agentId]);

    // Houses (Community, Extra/Premium only): the viewer's own house drives
    // TopNav's round house button and the notification modals.
    const housesEnabled = !!agentId && ['extra', 'premium'].includes(getTier(agentProfile?.membershipTier).key);
    const refreshMyHouse = useCallback(() => {
        if (!agentId || !housesEnabled) { setMyHouse(null); return; }
        getHouseOfAgent(agentId).then(setMyHouse).catch(e => console.error('Error loading house', e));
    }, [agentId, housesEnabled]);
    useEffect(() => { refreshMyHouse(); }, [refreshMyHouse]);
    const onHouseRequestsChanged = useCallback(() => { setHouseRequestsKey(k => k + 1); refreshMyHouse(); }, [refreshMyHouse]);

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

    // Community's "Speak With Our Experts" sends logged-out visitors to the
    // login page; this flag (sessionStorage, so it survives Google OAuth's
    // full-page redirect back to "/") brings them to Community once logged in.
    useEffect(() => {
        if (!authUser) return;
        let pending = false;
        try { pending = sessionStorage.getItem('postLoginCommunity') === '1'; sessionStorage.removeItem('postLoginCommunity'); } catch (e) {}
        if (!pending) return;
        navigateTo({
            showCommunity: true, selectedType: null, showFavorites: false, showSubscribe: false, showHome: false,
            showGenius: false, showQuotes: false, showNewsletter: false, showCreate: false, showAbout: false, showThanksArchive: false,
        });
    }, [authUser]);

    useEffect(() => {
        databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [Query.limit(1)])
            .then(result => setPropertiesCount(result.total))
            .catch(e => console.error('Error fetching properties count', e));
    }, []);

    // Once per browser tab: sessionStorage is cleared when the tab closes,
    // so a fresh tab (or a hard reload after closing it) can show these
    // interstitials again, but repeat visits to the same page within one
    // tab's lifetime won't keep re-triggering them.
    const hasShownThisSession = (key) => {
        try { return sessionStorage.getItem(key) === '1'; } catch (e) { return false; }
    };
    const markShownThisSession = (key) => {
        try { sessionStorage.setItem(key, '1'); } catch (e) {}
    };

    // Exit-intent: pops a "before you go" modal once the cursor leaves the
    // page toward the browser chrome (tab bar / close button) at the top of
    // the viewport — the classic desktop exit-intent trick. Fires once per
    // page context (Subscribe / everything else) per tab, only once the
    // user is logged into the app.
    useEffect(() => {
        if (!authUser) return;
        const sessionKey = showSubscribe ? 'exitIntentShown_subscribe' : 'exitIntentShown_general';
        if (hasShownThisSession(sessionKey)) return;
        let shown = false;
        const onMouseOut = (e) => {
            if (shown || e.clientY > 10 || e.relatedTarget) return;
            shown = true;
            markShownThisSession(sessionKey);
            setExitIntentOpen(true);
        };
        document.addEventListener('mouseout', onMouseOut);
        return () => document.removeEventListener('mouseout', onMouseOut);
    }, [authUser, showSubscribe, isFavoritesPage]);

    // WhereToStartModal (personality-test pitch): shown on Explore via the
    // exit-intent trick, OR on Home after a 10s dwell — two different "about
    // to disengage / already engaged" signals for two different page shapes.
    // Once per tab (see hasShownThisSession above), not once per Home visit.
    useEffect(() => {
        if (!authUser || !(isExplorePage || showHome)) return;
        if (hasShownThisSession('wtsShown')) return;
        let shown = false;
        const trigger = () => { if (!shown) { shown = true; markShownThisSession('wtsShown'); setWtsOpen(true); } };
        const onMouseOut = (e) => {
            if (!isExplorePage || e.clientY > 10 || e.relatedTarget) return;
            trigger();
        };
        document.addEventListener('mouseout', onMouseOut);
        const timer = showHome ? setTimeout(trigger, 10000) : null;
        return () => {
            document.removeEventListener('mouseout', onMouseOut);
            if (timer) clearTimeout(timer);
        };
    }, [authUser, isExplorePage, showHome]);

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
            showCommunity: patch.showCommunity !== undefined ? patch.showCommunity : showCommunity,
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
            showCommunity: next.showCommunity,
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
        setShowCommunity(next.showCommunity);
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
        setShowCommunity(!!state?.showCommunity);
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

    const goToExplore = () => { setSearchTerm(''); navigateTo({ selectedType: null, showFavorites: false, showSubscribe: false, showHome: false, showGenius: false, showQuotes: false, showNewsletter: false, showCommunity: false, showCreate: false, showAbout: false }); };
    const goToCommunity = () => navigateTo({ showCommunity: true, selectedType: null, showFavorites: false, showSubscribe: false, showHome: false, showGenius: false, showQuotes: false, showNewsletter: false, showCreate: false, showAbout: false, showThanksArchive: false });
    // Opens a Community sub-view (see CommunityPage's readView) from anywhere.
    // CommunityPage reads history.state on mount, and listens to popstate when
    // it's already open — hence the synthetic popstate.
    const openCommunityView = (view) => {
        goToCommunity();
        window.history.replaceState({ ...(window.history.state || {}), communityView: view, communityAskId: null }, '', '');
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
        window.scrollTo(0, 0);
    };

    return (
        <HouseContext.Provider value={{ myHouse, housesEnabled, refreshMyHouse, openCommunityView }}>
        <main>
            {showLogin ? (
                <LoginPage
                    onLoginSuccess={() => { account.get().then(setAuthUser); setShowLogin(false); }}
                    onBack={() => { try { sessionStorage.removeItem('postLoginCommunity'); } catch (e) {} setShowLogin(false); }}
                    onGoHome={() => { setShowLogin(false); navigateTo({ showHome: true }); }}
                    onGoToExplore={() => { setShowLogin(false); goToExplore(); }}
                    onShowGenius={() => { setShowLogin(false); navigateTo({ showGenius: true }); }}
                    onShowNewsletter={() => { setShowLogin(false); navigateTo({ showNewsletter: true }); }}
                    onShowCommunity={() => { setShowLogin(false); goToCommunity(); }}
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
                    onShowCommunity={goToCommunity}
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
                    onOpenProfile={() => setAccountMenuOpen(true)}
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
                    onShowCommunity={goToCommunity}
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
                    onOpenProfile={() => setAccountMenuOpen(true)}
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
                    onShowCommunity={goToCommunity}
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
                    onOpenProfile={() => setAccountMenuOpen(true)}
                />
            ) : showSubscribe ? (
                <SubscribePage
                    onBack={() => navigateTo({ showSubscribe: false })}
                    onLoginClick={handleAuthAction}
                    isLoggedIn={!!authUser}
                    onAccountCreated={() => account.get().then(setAuthUser)}
                    onSelectTier={handleSelectMembershipTier}
                    initialTier={subscribeTierPreset}
                    onClearTierPreset={() => setSubscribeTierPreset(null)}
                    onGoHome={() => navigateTo({ showHome: true, showSubscribe: false })}
                    onGoToExplore={() => { goToExplore(); }}
                    onShowGenius={() => navigateTo({ showGenius: true, showSubscribe: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showSubscribe: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showSubscribe: false })}
                    onShowCommunity={goToCommunity}
                    onShowCreate={() => navigateTo({ showCreate: true, showSubscribe: false })}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showSubscribe: false }))}
                    onLogout={handleAuthAction}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setAccountMenuOpen(true)}
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
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
                    onShowCommunity={goToCommunity}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showCreate: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showCreate: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setAccountMenuOpen(true)}
                    agentName={agentProfile?.name}
                    agentSurname={agentProfile?.surname}
                    agentEmail={authUser?.email}
                />
            ) : showNewsletter ? (
                <NewsletterPage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onGoHome={() => navigateTo({ showHome: true, showNewsletter: false, showCommunity: false })}
                    onShowGenius={() => navigateTo({ showGenius: true, showNewsletter: false, showCommunity: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showNewsletter: false, showCommunity: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showNewsletter: false, showCommunity: false })}
                    onShowCreate={() => navigateTo({ showCreate: true, showNewsletter: false, showCommunity: false })}
                    onShowCommunity={goToCommunity}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showNewsletter: false, showCommunity: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setAccountMenuOpen(true)}
                />
            ) : showCommunity ? (
                <CommunityPage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onGoHome={() => navigateTo({ showHome: true, showCommunity: false })}
                    onShowGenius={() => navigateTo({ showGenius: true, showCommunity: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showCommunity: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showCommunity: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showCommunity: false })}
                    onShowCreate={() => navigateTo({ showCreate: true, showCommunity: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={requireAuthForProperty}
                    onShowFavorites={requireAuth(() => navigateTo({ showFavorites: true, showCommunity: false }))}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setAccountMenuOpen(true)}
                    agentId={authUser ? agentId : null}
                    agentName={agentProfile?.name}
                    myEmail={agentProfile?.email}
                    viewerMembershipTier={getTier(agentProfile?.membershipTier).key}
                    requestsKey={houseRequestsKey}
                    onRequireAuth={() => setAuthModalOpen(true)}
                    hasAccess={['extra', 'premium'].includes(getTier(agentProfile?.membershipTier).key)}
                    accessLoading={!!authUser && !agentProfile}
                    onSpeakWithExperts={() => {
                        if (!authUser) {
                            try { sessionStorage.setItem('postLoginCommunity', '1'); } catch (e) {}
                            setShowLogin(true);
                            return;
                        }
                        setUpgradeExtraOpen(true);
                    }}
                    favoriteIds={favoriteIds}
                    onToggleFavorite={handleToggleFavorite}
                />
            ) : showGenius ? (
                <GeniusPage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onGoHome={() => navigateTo({ showHome: true, showGenius: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showGenius: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showGenius: false })}
                    onShowCommunity={goToCommunity}
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
                    onOpenProfile={() => setAccountMenuOpen(true)}
                    initialTab={geniusInitialTab}
                />
            ) : showQuotes ? (
                <QuotesPage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoToExplore={goToExplore}
                    onGoHome={() => navigateTo({ showHome: true, showQuotes: false })}
                    onShowGenius={() => navigateTo({ showGenius: true, showQuotes: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showQuotes: false })}
                    onShowCommunity={goToCommunity}
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
                    onOpenProfile={() => setAccountMenuOpen(true)}
                />
            ) : !showFavorites ? (
                <ExplorePage
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onSelectCategory={handleSelectCategory}
                    selectedType={selectedType}
                    onGoToExplore={goToExplore}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true })}
                    onShowCommunity={goToCommunity}
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
                    onOpenProfile={() => setAccountMenuOpen(true)}
                />
            ) : (
                <FavoritesPage
                    favoriteIds={favoriteIds}
                    onToggleFavorite={handleToggleFavorite}
                    onOpenAsk={(askId) => openCommunityView({ kind: 'ask', askId })}
                    onSelect={(property) => navigateTo({ selectedProperty: property })}
                    searchTerm={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); if (val) setSelectedType(null); }}
                    onGoHome={() => navigateTo({ showHome: true, showFavorites: false })}
                    onGoToExplore={goToExplore}
                    onShowGenius={() => navigateTo({ showGenius: true, showFavorites: false })}
                    onShowQuotes={() => navigateTo({ showQuotes: true, showFavorites: false })}
                    onShowNewsletter={() => navigateTo({ showNewsletter: true, showFavorites: false })}
                    onShowCommunity={goToCommunity}
                    onShowCreate={() => navigateTo({ showCreate: true, showFavorites: false })}
                    onShowSubscribe={() => navigateTo({ showSubscribe: true, showFavorites: false })}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onLogout={handleAuthAction}
                    isLoggedIn={!!authUser}
                    agentAvatar={agentProfile?.avatar}
                    onOpenProfile={() => setAccountMenuOpen(true)}
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
                viewerAgentId={agentId}
                viewerMembershipTier={getTier(agentProfile?.membershipTier).key}
                onShowSubscribe={() => navigateTo({
                    showSubscribe: true, selectedProperty: null, showHome: false, showAbout: false,
                    showFavorites: false, showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false,
                    showQuotes: false, showThanksArchive: false,
                })}
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
            {wtsOpen && (
                <WhereToStartModal
                    onClose={() => setWtsOpen(false)}
                    onGetStarted={() => setWtsOpen(false)}
                />
            )}
            {exitIntentOpen && !showSubscribe && !isExplorePage && !isFavoritesPage && !showThanksArchive && getTier(agentProfile?.membershipTier).key === 'free' && (
                <NewsletterExitModal
                    onClose={() => setExitIntentOpen(false)}
                    onGetStarted={() => {
                        setExitIntentOpen(false);
                        navigateTo({
                            showSubscribe: true, selectedProperty: null, showHome: false, showAbout: false,
                            showFavorites: false, showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false,
                            showQuotes: false, showThanksArchive: false,
                        });
                    }}
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
                    onBack={() => { setProfileModalOpen(false); setAccountMenuOpen(true); }}
                    onSaved={handleProfileSaved}
                />
            )}
            {accountMenuOpen && agentId && (
                <AccountMenuModal
                    agentId={agentId}
                    authEmail={authUser?.email}
                    onClose={() => setAccountMenuOpen(false)}
                    onEditProfile={() => { setAccountMenuOpen(false); setProfileModalOpen(true); }}
                    onShowFavorites={() => {
                        setAccountMenuOpen(false);
                        navigateTo({
                            showFavorites: true, showHome: false, showAbout: false, showSubscribe: false,
                            showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false, showQuotes: false,
                            showThanksArchive: false,
                        });
                    }}
                    onShowQuotes={() => {
                        setAccountMenuOpen(false);
                        navigateTo({
                            showQuotes: true, showHome: false, showAbout: false, showSubscribe: false,
                            showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false, showFavorites: false,
                            showThanksArchive: false,
                        });
                    }}
                    onShowSubscribe={() => {
                        setAccountMenuOpen(false);
                        navigateTo({
                            showSubscribe: true, showHome: false, showAbout: false, showFavorites: false,
                            showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false, showQuotes: false,
                            showThanksArchive: false,
                        });
                    }}
                    onGetNextTier={(tierKey) => {
                        setAccountMenuOpen(false);
                        setSubscribeTierPreset(tierKey);
                        navigateTo({
                            showSubscribe: true, showHome: false, showAbout: false, showFavorites: false,
                            showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false, showQuotes: false,
                            showThanksArchive: false,
                        });
                    }}
                    onLogout={() => { setAccountMenuOpen(false); handleAuthAction(); }}
                />
            )}
            {agentId && (
                <CelebrationManager
                    agentId={agentId}
                    onOpenQuote={(quoteId) => {
                        getQuoteById(quoteId).then(quote => {
                            if (!quote) return;
                            navigateTo({
                                selectedQuote: quote, showHome: false, showAbout: false, showSubscribe: false,
                                showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false, showFavorites: false,
                                showQuotes: false, showThanksArchive: false,
                            });
                        });
                    }}
                    onOpenProperty={(propertyId) => {
                        getPropertiesByIds([propertyId]).then(properties => {
                            const property = properties[0];
                            if (!property) return;
                            navigateTo({
                                selectedProperty: property, showHome: false, showAbout: false, showSubscribe: false,
                                showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false, showFavorites: false,
                                showQuotes: false, showThanksArchive: false,
                            });
                        });
                    }}
                    onOpenRanks={(tab) => {
                        setGeniusInitialTab(tab || null);
                        navigateTo({
                            showGenius: true, showHome: false, showAbout: false, showSubscribe: false,
                            showCreate: false, showNewsletter: false, showCommunity: false, showFavorites: false,
                            showQuotes: false, showThanksArchive: false,
                        });
                    }}
                />
            )}
            {housesEnabled && (
                <HouseNotifications
                    agentId={agentId}
                    myHouse={myHouse}
                    myEmail={agentProfile?.email}
                    onOpenView={openCommunityView}
                    onChanged={onHouseRequestsChanged}
                />
            )}
            {upgradeExtraOpen && (
                <UpgradeToExtraModal
                    onClose={() => setUpgradeExtraOpen(false)}
                    onUpgrade={() => {
                        setUpgradeExtraOpen(false);
                        setSubscribeTierPreset('extra');
                        navigateTo({
                            showSubscribe: true, selectedProperty: null, showHome: false, showAbout: false,
                            showFavorites: false, showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false,
                            showQuotes: false, showThanksArchive: false,
                        });
                    }}
                />
            )}
            {limitModalOpen && agentId && limitReason === 'season-pass-required' && (
                <SeasonPassRequiredModal
                    onClose={() => { setLimitModalOpen(false); setLimitedProperty(null); }}
                    onGetSeasonPass={() => {
                        setLimitModalOpen(false);
                        setLimitedProperty(null);
                        navigateTo({
                            showSubscribe: true, selectedProperty: null, showHome: false, showAbout: false,
                            showFavorites: false, showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false,
                            showQuotes: false, showThanksArchive: false,
                        });
                    }}
                />
            )}
            {limitModalOpen && agentId && limitReason === 'monthly-limit' && getTier(agentProfile?.membershipTier).key === 'free' && (
                <OutOfFreeCardsModal
                    onClose={() => { setLimitModalOpen(false); setLimitedProperty(null); }}
                    onContinue={() => {
                        setLimitModalOpen(false);
                        setLimitedProperty(null);
                        navigateTo({
                            showSubscribe: true, selectedProperty: null, showHome: false, showAbout: false,
                            showFavorites: false, showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false,
                            showQuotes: false, showThanksArchive: false,
                        });
                    }}
                />
            )}
            {limitModalOpen && agentId && limitReason === 'monthly-limit' && getTier(agentProfile?.membershipTier).key !== 'free' && (
                <OutOfEssentialsCardsModal
                    onClose={() => { setLimitModalOpen(false); setLimitedProperty(null); }}
                    onContinue={() => {
                        setLimitModalOpen(false);
                        setLimitedProperty(null);
                        navigateTo({
                            showSubscribe: true, selectedProperty: null, showHome: false, showAbout: false,
                            showFavorites: false, showCreate: false, showNewsletter: false, showCommunity: false, showGenius: false,
                            showQuotes: false, showThanksArchive: false,
                        });
                    }}
                />
            )}
        </main>
        </HouseContext.Provider>
    )
}

export default App
