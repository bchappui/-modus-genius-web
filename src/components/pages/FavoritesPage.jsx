import React, { useEffect, useState } from 'react'
import { databases, DATABASE_ID, PROPERTIES_COLLECTION_ID, Query } from '../../lib/appwrite.js'
import { enrichWithAgents } from '../../lib/properties.js'
import { getAsksByIds } from '../../lib/asks.js'
import { AskCard } from './CommunityPage.jsx'
import Spinner from '../shared/Spinner.jsx'
import SearchModal from '../modals/SearchModal.jsx'
import TopNav from '../shared/TopNav.jsx'
import './ExplorePage.css'
import './HomePage.css'
import './CommunityPage.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

const FavoritesPage = ({
    favoriteIds, onSelect, searchTerm, onSearchChange, onGoHome, onGoToExplore, onShowGenius, onShowQuotes,
    onShowNewsletter, onShowCommunity, onShowCreate, onShowSubscribe, onLogout, isLoggedIn, movieList, isLoading: searchLoading, errorMessage: searchError,
    agentAvatar, onOpenProfile, onToggleFavorite, onOpenAsk,
}) => {
    const [properties, setProperties] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [savedAsks, setSavedAsks] = useState([])
    const [asksLoading, setAsksLoading] = useState(true)

    // Bookmarked Community questions live in the same favorites collection
    // (propertyId = ask $id). Un-bookmarking here drops the card right away
    // since favoriteIds changes.
    useEffect(() => {
        let cancelled = false
        setAsksLoading(true)
        getAsksByIds(favoriteIds).then(asks => {
            if (cancelled) return
            setSavedAsks(asks)
            setAsksLoading(false)
        })
        return () => { cancelled = true }
    }, [favoriteIds])

    useEffect(() => {
        if (favoriteIds.length === 0) {
            setProperties([])
            setIsLoading(false)
            return
        }

        const fetchProperties = async () => {
            setIsLoading(true)
            setErrorMessage('')
            try {
                const propsResult = await databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [
                    Query.equal('$id', favoriteIds),
                    Query.limit(1000),
                ])
                setProperties(await enrichWithAgents(propsResult.documents))
            } catch (error) {
                console.error('Error fetching favorites', error)
                setErrorMessage('Something went wrong')
            } finally {
                setIsLoading(false)
            }
        }

        fetchProperties()
    }, [favoriteIds])

    return (
        <div className="ep-page">

            <TopNav
                activeRightItem="favorites"
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius} onShowQuotes={onShowQuotes}
                onShowNewsletter={onShowNewsletter} onShowCommunity={onShowCommunity}
                onShowCreate={onShowCreate} onShowSubscribe={onShowSubscribe}
                onLogout={onLogout} isLoggedIn={isLoggedIn}
                agentAvatar={agentAvatar} onOpenProfile={onOpenProfile}
                onOpenSearch={() => setSearchModalOpen(true)}
            />

            {searchModalOpen && (
                <SearchModal
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    movieList={movieList}
                    isLoading={searchLoading}
                    errorMessage={searchError}
                    onSelectProperty={onSelect}
                    onClose={() => setSearchModalOpen(false)}
                />
            )}

            {/* ── HERO — same medallion technique as ExplorePage ── */}
            <div className="ep-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="fp-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#fp-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="ep-hero-content">
                    <h2 className="ep-categories-title">Saved Cards</h2>
                    {isLoading ? (
                        <Spinner />
                    ) : errorMessage ? (
                        <p className="ep-results-error">{errorMessage}</p>
                    ) : properties.length === 0 ? (
                        <p className="ep-results-empty">You haven't favorited any cards yet.</p>
                    ) : (
                        <div className="ep-results-grid">
                            {properties.map(property => (
                                <button
                                    key={property.$id}
                                    className="hp-hashtag-item"
                                    onClick={() => onSelect(property)}
                                >
                                    <img src={property.background || '/no-movie.png'} alt="" className="hp-hashtag-img" />
                                    <div className="hp-hashtag-overlay" />
                                    <span className="hp-hashtag-name">{property.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <h2 className="ep-categories-title">Saved Questions</h2>
                    {asksLoading ? (
                        <Spinner />
                    ) : savedAsks.length === 0 ? (
                        <p className="ep-results-empty">You haven't saved any questions yet.</p>
                    ) : (
                        <div className="cmty-saved-grid">
                            {savedAsks.map(ask => (
                                <div
                                    key={ask.$id}
                                    className="cmty-panel cmty-saved-item"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onOpenAsk?.(ask.$id)}
                                    onKeyDown={e => { if (e.key === 'Enter') onOpenAsk?.(ask.$id); }}
                                >
                                    <AskCard
                                        ask={ask}
                                        isBookmarked
                                        // Un-bookmark without also opening the question.
                                        onBookmark={e => { e.stopPropagation(); onToggleFavorite?.(ask.$id); }}
                                        onOpenComments={e => { e.stopPropagation(); onOpenAsk?.(ask.$id); }}
                                        hideReply
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FavoritesPage
