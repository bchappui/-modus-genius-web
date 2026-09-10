import React, { useEffect, useState } from 'react'
import SearchModal from '../modals/SearchModal.jsx'
import TopNav from '../shared/TopNav.jsx'
import { SKILL_CATEGORIES } from '../../lib/categories.js'
import { getHofWinner, getRankWinner } from '../../lib/hof.js'
import './ExplorePage.css'
import './GeniusPage.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const GENIUS_LOGO_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c5d9001c25e6bdb2/view?project=693e8acd001582e2562a';
const ICON_HOF_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c5e1000228981165/view?project=693e8acd001582e2562a';
const ICON_YEAR_URL   = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c5ea0016f1ae9a73/view?project=693e8acd001582e2562a';
const ICON_RADAR_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c5f30020b8eceef5/view?project=693e8acd001582e2562a';
const ICON_SEASON_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47c630003698871b45/view?project=693e8acd001582e2562a';

const HOF_WREATH_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47d694002e3ef9f89a/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

// Tab keys match modus_genius's ranks.tsx "tab" values exactly (Query.equal
// against agent_rankings/agent_rankings_hof is case-sensitive: "Year", not "YEAR").
const TABS = [
    { key: 'HOF', label: 'HOF', icon: ICON_HOF_URL },
    { key: 'Year', label: 'Year', icon: ICON_YEAR_URL },
    { key: 'Season', label: 'Season', icon: ICON_SEASON_URL },
    { key: 'Radar', label: 'Radar', icon: ICON_RADAR_URL },
];

// Mirrors modus_genius's ranks.tsx categoryTitles.
const SECTION_TITLES = {
    HOF: 'HOF - Selection Process',
    Year: 'Year - Annual Champions',
    Season: 'Season - Current Season Leaders',
    Radar: 'Radar - Live Rankings',
};

// Countdown helpers — mirrors modus_genius's ranks.tsx exactly (UTC-based
// period boundaries: Radar = rolling week, Season = calendar quarter, Year =
// calendar year). HOF has no period to count down to, same as there.
function getStartOfWeekMonday(date) {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
function getNextRadarEnd(now) {
    const start = getStartOfWeekMonday(now);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);
    return end;
}
function getNextSeasonEnd(now) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    let startMonth = 0;
    if (month >= 3 && month < 6) startMonth = 3;
    else if (month >= 6 && month < 9) startMonth = 6;
    else if (month >= 9) startMonth = 9;
    return new Date(Date.UTC(year, startMonth + 3, 1));
}
function getNextYearEnd(now) {
    return new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
}
function formatCountdown(ms) {
    if (ms <= 0) return '0D:00H:00M:00S';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const h = hours % 24, m = minutes % 60, s = seconds % 60;
    return `${days}D:${String(h).padStart(2, '0')}H:${String(m).padStart(2, '0')}M:${String(s).padStart(2, '0')}S`;
}

// Mirrors modus_genius's ranks.tsx: years start at 2026 (product launch) and
// run up to the real current year — not a fixed-length rolling window.
const CURRENT_YEAR = new Date().getFullYear();
const HOF_YEARS = Array.from({ length: CURRENT_YEAR - 2026 + 1 }, (_, i) => 2026 + i);

// Overall/aggregate categories (mirrors modus_genius's source-filter "modes"
// for the Radar/Season/Year tabs: Genius = no filter, Creator = source
// "like", Advisor = source "star") — shown ahead of the per-skill categories.
const HOF_EXTRA_CATEGORIES = [
    { key: 'Genius', roleTitle: 'The Genius' },
    { key: 'Creator', roleTitle: 'The Creator' },
    { key: 'Advisor', roleTitle: 'The Advisor' },
];

// flagcdn.com — free flag-image CDN, used instead of modus_genius's
// react-native-country-flag (native-only package) or unreliable emoji fonts.
const getFlagImageUrl = (isoCode) => (
    isoCode && isoCode.length === 2 ? `https://flagcdn.com/w80/${isoCode.toLowerCase()}.png` : null
);

const GeniusPage = ({
    searchTerm, onSearchChange, onGoToExplore, onGoHome, onShowNewsletter, onShowQuotes, onShowCreate, onShowSubscribe,
    onShowFavorites, onLogout, isLoggedIn, movieList, isLoading, errorMessage, onSelectProperty,
    agentAvatar, onOpenProfile,
}) => {
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('HOF');
    const [hofYear, setHofYear] = useState(HOF_YEARS[0]);
    const [hofWinners, setHofWinners] = useState({});
    const [hofLoading, setHofLoading] = useState(true);
    const [rankWinners, setRankWinners] = useState({});
    const [rankLoading, setRankLoading] = useState(true);

    useEffect(() => {
        if (activeTab !== 'HOF') return;
        let cancelled = false;
        setHofLoading(true);
        Promise.all(
            [...HOF_EXTRA_CATEGORIES, ...SKILL_CATEGORIES].map(c =>
                getHofWinner({ category: c.key, year: hofYear }).then(winner => [c.key, winner])
            )
        ).then(entries => {
            if (cancelled) return;
            setHofWinners(Object.fromEntries(entries));
            setHofLoading(false);
        });
        return () => { cancelled = true; };
    }, [activeTab, hofYear]);

    // Radar / Season / Year — same categories as HOF, but the top 1 comes
    // from "agent_rankings" (live scores), not the year-archived HOF table.
    useEffect(() => {
        if (activeTab === 'HOF') return;
        let cancelled = false;
        setRankLoading(true);
        Promise.all(
            [...HOF_EXTRA_CATEGORIES, ...SKILL_CATEGORIES].map(c =>
                getRankWinner({ tab: activeTab, category: c.key }).then(winner => [c.key, winner])
            )
        ).then(entries => {
            if (cancelled) return;
            setRankWinners(Object.fromEntries(entries));
            setRankLoading(false);
        });
        return () => { cancelled = true; };
    }, [activeTab]);

    const winners = activeTab === 'HOF' ? hofWinners : rankWinners;
    const winnersLoading = activeTab === 'HOF' ? hofLoading : rankLoading;

    const [countdown, setCountdown] = useState('');
    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            let endTime;
            if (activeTab === 'Radar') endTime = getNextRadarEnd(now);
            else if (activeTab === 'Season') endTime = getNextSeasonEnd(now);
            else if (activeTab === 'Year') endTime = getNextYearEnd(now);
            else { setCountdown(''); return; }
            setCountdown(formatCountdown(endTime.getTime() - now.getTime()));
        };
        updateCountdown();
        if (activeTab === 'HOF') return;
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [activeTab]);

    return (
        <div className="ep-page">

            <TopNav
                activeLink="genius" disableActiveLink
                onGoHome={onGoHome} onGoToExplore={onGoToExplore}
                onShowQuotes={onShowQuotes} onShowNewsletter={onShowNewsletter}
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

                        {countdown && (
                            <div className="gp-countdown-row">
                                <span className="gp-countdown-timer">
                                    <span className="gp-countdown-dot" />
                                    <span className="gp-countdown-text">{countdown}</span>
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="gp-section">
                        <h2 className="hp-top10-title">{SECTION_TITLES[activeTab]}</h2>
                        <p className="gp-section-text">
                            The definitive list of the most influential experts that have made a
                            significant and lasting contribution to the movement.
                        </p>

                        {activeTab === 'HOF' && (
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
                        )}

                        {[...HOF_EXTRA_CATEGORIES, ...SKILL_CATEGORIES].map(c => {
                            const winner = winners[c.key];
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
                                        {winnersLoading ? (
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
                                                <p className="gp-hof-title">{winner.agent?.title || c.roleTitle}</p>
                                            </>
                                        ) : (
                                            <p className="gp-hof-empty">
                                                {activeTab === 'HOF' ? `No ${hofYear} winner yet.` : 'No data yet.'}
                                            </p>
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
