import React, { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import SearchModal from './SearchModal.jsx'
import TopNav from './TopNav.jsx'
import './ExplorePage.css'
import './NewsletterPage.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

// No newsletter-issues collection exists yet (mirrors SubscribePage's
// placeholder avatars) — same 3 sample issues as the reference mockup.
const ISSUES = [
    {
        id: 1,
        badge: 'FREE CARD INSIDE!',
        title: 'AI Visual Content 101:',
        subtitle: 'Stunning creations in 7 days',
    },
    {
        id: 2,
        badge: 'FREE CARD INSIDE!',
        title: 'AI Visual Content 101:',
        subtitle: 'Stunning creations in 7 days',
    },
    {
        id: 3,
        badge: 'FREE CARD INSIDE!',
        title: 'AI Visual Content 101:',
        subtitle: 'Stunning creations in 7 days',
    },
];

const NewsletterPage = ({
    searchTerm, onSearchChange, onGoToExplore, onGoHome, onShowGenius, onShowQuotes, onShowSubscribe, onShowCreate,
    onShowFavorites, onLogout, isLoggedIn, movieList, isLoading, errorMessage, onSelectProperty,
    agentAvatar, onOpenProfile,
}) => {
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [postSearch, setPostSearch] = useState('');

    return (
        <div className="ep-page">

            <TopNav
                activeLink="newsletter" disableActiveLink
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius} onShowQuotes={onShowQuotes}
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

            {/* ── HERO — same medallion technique as ExplorePage ── */}
            <div className="ep-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="np-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#np-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="ep-hero-content">
                    <div className="ep-hero-intro">
                        <h1 className="ep-headline np-headline">
                            Get curated bite-size advices and tools just for you, delivered weekly.
                        </h1>
                        <p className="ep-subtext">
                            Explore for free our previous issues designed and taught by top global experts.
                        </p>

                        <div className="ep-search-row">
                            <input
                                className="ep-search-input"
                                type="text"
                                placeholder="Search posts..."
                                value={postSearch}
                                onChange={e => setPostSearch(e.target.value)}
                            />
                            <button className="ep-search-btn" aria-label="Search">
                                <FiSearch size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="np-popular-row">
                        <h2 className="ep-categories-title">Most Popular</h2>
                        <button className="np-view-all-btn">View All</button>
                    </div>

                    <div className="np-card-grid">
                        {ISSUES.map(issue => (
                            <div key={issue.id} className="np-card">
                                <div className="np-card-thumb" />
                                <div className="np-card-badge-row">
                                    <span className="np-card-badge">
                                        <span className="np-card-badge-icon" aria-hidden="true" />
                                        <span className="np-card-badge-text">{issue.badge}</span>
                                    </span>
                                    <span className="np-card-title-num">💌#{String(issue.id).padStart(2, '0')}</span>
                                </div>
                                <div className="np-card-body">
                                    <h3 className="np-card-title">{issue.title}</h3>
                                    <p className="np-card-subtitle">{issue.subtitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="np-banner">
                        <h3 className="np-banner-text">
                            Upskill in 10 minutes or less.<br />
                            With the world's best experts.
                        </h3>
                        <button className="np-banner-btn" onClick={onShowSubscribe}>Subscribe</button>
                    </div>

                    <h2 className="ep-categories-title">Recent Posts</h2>

                    <div className="np-recent-grid">
                        {ISSUES.map(issue => (
                            <div key={issue.id} className="np-recent-card">
                                <div className="np-recent-thumb" />
                                <div className="np-card-badge-row">
                                    <span className="np-card-badge">
                                        <span className="np-card-badge-icon" aria-hidden="true" />
                                        <span className="np-card-badge-text">{issue.badge}</span>
                                    </span>
                                    <span className="np-card-title-num">💌#{String(issue.id).padStart(2, '0')}</span>
                                </div>
                                <div className="np-card-body">
                                    <h3 className="np-card-title">{issue.title}</h3>
                                    <p className="np-card-subtitle">{issue.subtitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="np-see-all-row">
                        <button className="np-view-all-btn">See All</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsletterPage;
