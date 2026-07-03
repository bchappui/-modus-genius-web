import React, { useEffect, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import SearchModal from './SearchModal.jsx'
import { SKILL_CATEGORIES } from '../lib/categories.js'
import { getHofWinner } from '../lib/hof.js'
import './ExplorePage.css'
import './GeniusPage.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const NAV_BG_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c800035bdea516f/view?project=693e8acd001582e2562a';
const GENIUS_LOGO_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c5d9001c25e6bdb2/view?project=693e8acd001582e2562a';
const ICON_HOF_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c5e1000228981165/view?project=693e8acd001582e2562a';
const ICON_YEAR_URL   = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c5ea0016f1ae9a73/view?project=693e8acd001582e2562a';
const ICON_RADAR_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c5f30020b8eceef5/view?project=693e8acd001582e2562a';
const ICON_SEASON_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c630003698871b45/view?project=693e8acd001582e2562a';

const HOF_WREATH_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47d694002e3ef9f89a/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

const TABS = [
    { key: 'HOF', label: 'HOF', icon: ICON_HOF_URL },
    { key: 'YEAR', label: 'Year', icon: ICON_YEAR_URL },
    { key: 'SEASON', label: 'Season', icon: ICON_SEASON_URL },
    { key: 'RADAR', label: 'Radar', icon: ICON_RADAR_URL },
];

const CURRENT_YEAR = new Date().getFullYear();
const HOF_YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

// flagcdn.com — free flag-image CDN, used instead of modus_genius's
// react-native-country-flag (native-only package) or unreliable emoji fonts.
const getFlagImageUrl = (isoCode) => (
    isoCode && isoCode.length === 2 ? `https://flagcdn.com/w80/${isoCode.toLowerCase()}.png` : null
);

const GeniusPage = ({
    searchTerm, onSearchChange, onGoToExplore, onGoHome, onShowSubscribe,
    onShowFavorites, onLogout, movieList, isLoading, errorMessage, onSelectProperty,
}) => {
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('HOF');
    const [hofYear, setHofYear] = useState(CURRENT_YEAR);
    const [hofWinners, setHofWinners] = useState({});
    const [hofLoading, setHofLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setHofLoading(true);
        Promise.all(
            SKILL_CATEGORIES.map(c => getHofWinner({ category: c.key, year: hofYear }).then(winner => [c.key, winner]))
        ).then(entries => {
            if (cancelled) return;
            setHofWinners(Object.fromEntries(entries));
            setHofLoading(false);
        });
        return () => { cancelled = true; };
    }, [hofYear]);

    return (
        <div className="ep-page">

            {/* ── DECORATIVE TOP NAV — same as ExplorePage, "Genius" active here ── */}
            <div className="ep-nav" style={{ backgroundImage: `url(${NAV_BG_URL})` }}>
                <div className="ep-nav-logo">
                    <img src={LOGO_TEXT_URL} alt="Modus Genius" className="ep-nav-logo-img" />
                    <span className="ep-nav-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</span>
                </div>
                <nav className="ep-nav-links">
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onGoHome}>Home</button>
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onGoToExplore}>Explore</button>
                    <span className="ep-nav-link ep-nav-link--active">Genius</span>
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

            {/* ── HERO — same medallion technique as ExplorePage ── */}
            <div className="ep-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="gp-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#gp-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="hp-hero-content">
                    <div className="gp-intro">
                        <div className="gp-genius-wordmark">
                            <img src={GENIUS_LOGO_URL} alt="Genius" className="gp-genius-logo" />
                            <sup className="gp-genius-10">10</sup>
                        </div>
                        <h2 className="gp-tagline">
                            Learn from the world's greatest experts
                        </h2>
                        <p className="gp-subtext">
                            The definitive list of the most influential experts that have made a
                            significant and lasting contribution to the movement.
                        </p>

                        <div className="gp-tabs">
                            {TABS.map(({ key, label, icon }) => (
                                <button
                                    key={key}
                                    className={`gp-tab${activeTab === key ? ' gp-tab--active' : ''}`}
                                    onClick={() => setActiveTab(key)}
                                >
                                    <img src={icon} alt="" className="gp-tab-icon" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="gp-section">
                        <h2 className="hp-top10-title">HOF - Selection Process</h2>
                        <p className="gp-section-text">
                            The definitive list of the most influential experts that have made a
                            significant and lasting contribution to the movement.
                        </p>

                        <div className="gp-hof-years">
                            {HOF_YEARS.map(y => (
                                <button
                                    key={y}
                                    className={`gp-hof-year-btn${hofYear === y ? ' gp-hof-year-btn--active' : ''}`}
                                    onClick={() => setHofYear(y)}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>

                        {SKILL_CATEGORIES.map(c => {
                            const winner = hofWinners[c.key];
                            return (
                                <div key={c.key} className="gp-hof-entry">
                                    <h3 className="gp-hof-category-title">{c.key}</h3>
                                    <div className="gp-hof-winner">
                                        <div className="gp-hof-wreath-body">
                                            <img src={HOF_WREATH_URL} alt="" className="gp-hof-wreath-img" />
                                            <div className="gp-hof-card-wrap">
                                                {winner?.agent?.avatar ? (
                                                    <img src={winner.agent.avatar} alt="" className="gp-hof-card" />
                                                ) : (
                                                    <div className="gp-hof-card gp-hof-card--placeholder" />
                                                )}
                                            </div>
                                        </div>
                                        {hofLoading ? (
                                            <p className="gp-hof-empty">Loading…</p>
                                        ) : winner ? (
                                            <>
                                                {getFlagImageUrl(winner.agent?.Location) && (
                                                    <img
                                                        src={getFlagImageUrl(winner.agent?.Location)}
                                                        alt={winner.agent?.Location}
                                                        className="gp-hof-flag"
                                                    />
                                                )}
                                                <p className="gp-hof-name">{winner.agent?.name} {winner.agent?.surname}</p>
                                                <p className="gp-hof-title">{c.roleTitle}</p>
                                            </>
                                        ) : (
                                            <p className="gp-hof-empty">No {hofYear} winner yet.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeniusPage;
