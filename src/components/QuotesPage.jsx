import React, { useEffect, useState } from 'react'
import { getQuotes } from '../lib/quotes.js'
import Spinner from './Spinner.jsx'
import SearchModal from './SearchModal.jsx'
import TopNav from './TopNav.jsx'
import './ExplorePage.css'
import './HomePage.css'
import './QuotesPage.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

// Rarity tiers — mirrors modus_genius's profile/quotes.tsx category filter.
const RARITIES = ['All', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'exotic', 'mythic'];

const QuotesPage = ({
    onSelectQuote, searchTerm, onSearchChange, onGoHome, onGoToExplore, onShowGenius,
    onShowNewsletter, onShowCreate, onShowFavorites, onShowSubscribe, onLogout, isLoggedIn, movieList, isLoading: searchLoading, errorMessage: searchError,
    agentAvatar, onOpenProfile,
}) => {
    const [quotes, setQuotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [rarity, setRarity] = useState('All');

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setErrorMessage('');
        getQuotes({ category: rarity })
            .then(docs => { if (!cancelled) setQuotes(docs); })
            .catch(e => { console.error('Error fetching quotes', e); if (!cancelled) setErrorMessage('Something went wrong'); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [rarity]);

    return (
        <div className="ep-page">

            <TopNav
                activeLink="quotes" disableActiveLink
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius}
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
                    isLoading={searchLoading}
                    errorMessage={searchError}
                    onSelectProperty={() => {}}
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
                        <path id="qp-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#qp-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="ep-hero-content">
                    <div className="ep-hero-intro">
                        <h1 className="ep-headline">
                            Wisdom from the world's greatest experts
                        </h1>
                        <p className="ep-subtext">
                            Bite-sized quotes worth carrying with you.
                        </p>
                    </div>

                    <h2 className="ep-categories-title">Quotes</h2>
                    <div className="qp-filter-row">
                        {RARITIES.map(r => (
                            <button
                                key={r}
                                className={`qp-filter-btn${rarity === r ? ' qp-filter-btn--active' : ''}`}
                                onClick={() => setRarity(r)}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <Spinner />
                    ) : errorMessage ? (
                        <p className="ep-results-error">{errorMessage}</p>
                    ) : quotes.length === 0 ? (
                        <p className="ep-results-empty">No quotes found.</p>
                    ) : (
                        <div className="ep-results-grid">
                            {quotes.map(quote => (
                                <button
                                    key={quote.$id}
                                    className="hp-hashtag-item"
                                    onClick={() => onSelectQuote(quote)}
                                >
                                    <img src={quote.image || '/no-movie.png'} alt="" className="hp-hashtag-img" />
                                    <div className="hp-hashtag-overlay" />
                                    <span className="hp-hashtag-name">
                                        {quote.author}{quote.surname ? ` ${quote.surname}` : ''}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuotesPage;
