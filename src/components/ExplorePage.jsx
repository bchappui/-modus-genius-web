import React, { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { SKILL_CATEGORIES, getCategoryImageUrl } from '../lib/categories.js'
import MiniCard from './MiniCard.jsx'
import Spinner from './Spinner.jsx'
import SearchModal from './SearchModal.jsx'
import './ExplorePage.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const NAV_BG_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c800035bdea516f/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

const ExplorePage = ({
    searchTerm, onSearchChange, onSelectCategory, propertiesCount, onShowFavorites, onLogout,
    selectedType, onGoToExplore, onShowSubscribe, onGoHome, onShowGenius, movieList, isLoading, errorMessage, onSelectProperty,
}) => {
    const showResults = !!searchTerm || !!selectedType;
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    return (
        <div className="ep-page">

            {/* ── DECORATIVE TOP NAV — matches the PowerPoint design, not yet wired to real pages.
                Favorites/Log out (real actions) live in ep-nav-right below. */}
            <div className="ep-nav" style={{ backgroundImage: `url(${NAV_BG_URL})` }}>
                <div className="ep-nav-logo">
                    <img src={LOGO_TEXT_URL} alt="Modus Genius" className="ep-nav-logo-img" />
                    <span className="ep-nav-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</span>
                </div>
                <nav className="ep-nav-links">
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onGoHome}>Home</button>
                    <button className="ep-nav-link ep-nav-link--active ep-nav-link-btn" onClick={onGoToExplore}>Explore</button>
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onShowGenius}>Genius</button>
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onShowSubscribe}>Newsletter</button>
                </nav>
                <div className="ep-nav-right">
                    <span className="ep-nav-create">+ Create</span>
                    <button className="ep-nav-login" onClick={onShowFavorites}>Favorites</button>
                    <button className="ep-nav-login" onClick={onLogout}>Log out</button>
                    <span className="ep-nav-membership">Membership</span>
                    <button className="ep-nav-search-btn" onClick={() => setSearchModalOpen(true)} aria-label="Search">
                        <FiSearch size={18} className="ep-nav-search-icon" />
                    </button>
                </div>
            </div>

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

            {/* ── HERO ── */}
            <div className="ep-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>

                {/* Independent from the medallion image — its own box, so it can be moved
                    without disturbing the image position. viewBox keeps the same 1399x1124
                    reference frame the circle math (center 693,470 r=460) was measured in. */}
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        {/* Concentric with the wreath (same center 693,470) but a bigger radius
                            (495 vs the wreath's own ~460), so the text traces a parallel arc in
                            the open background OUTSIDE the wreath, instead of sitting on top of
                            its leaves/the face. 7 o'clock to 1 o'clock through the top, 180°,
                            open (non-closed) path so wide letter-spacing never gets truncated. */}
                        <path id="ep-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#ep-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="ep-hero-content">
                    <div className="ep-hero-intro">
                        <h1 className="ep-headline">
                            Upskill in 10 minutes or less
                        </h1>
                        <p className="ep-subtext">
                            Explore our library of {propertiesCount != null ? `more than ${propertiesCount}` : 'hundreds of'} cards from the world's biggest experts.
                            <br />
                            Get instant access today.
                        </p>

                        <div className="ep-search-row">
                            <input
                                className="ep-search-input"
                                type="text"
                                placeholder="What do you want to learn?"
                                value={searchTerm}
                                onChange={e => onSearchChange(e.target.value)}
                            />
                            <button className="ep-search-btn" aria-label="Search">
                                <FiSearch size={18} />
                            </button>
                        </div>
                    </div>

                    {showResults ? (
                        <>
                            <h2 className="ep-categories-title">
                                {searchTerm ? `Results for "${searchTerm}"` : selectedType}
                            </h2>
                            {isLoading ? (
                                <Spinner />
                            ) : errorMessage ? (
                                <p className="ep-results-error">{errorMessage}</p>
                            ) : movieList.length === 0 ? (
                                <p className="ep-results-empty">No cards found.</p>
                            ) : (
                                <div className="ep-results-grid">
                                    {movieList.map(property => (
                                        <MiniCard key={property.$id} property={property} onSelect={() => onSelectProperty(property)} />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <h2 className="ep-categories-title">Categories</h2>
                            <div className="ep-categories-grid">
                                {SKILL_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.key}
                                        className="ep-category-card"
                                        onClick={() => onSelectCategory(cat.key)}
                                    >
                                        <img src={getCategoryImageUrl(cat.imageFileId)} alt="" className="ep-category-icon" />
                                        <span className="ep-category-label">{cat.key}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExplorePage;
