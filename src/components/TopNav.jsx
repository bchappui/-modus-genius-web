import React from 'react'
import { FiSearch, FiUser } from 'react-icons/fi'
import './ExplorePage.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const NAV_BG_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c800035bdea516f/view?project=693e8acd001582e2562a';

// Shared "ep-nav" bar for every page. `activeLink` highlights one of the 5
// main links; `disableActiveLink` additionally turns that link into static
// text instead of a button (most self-pages do this — Explore and About are
// the two exceptions that keep their highlighted link clickable).
// `activeRightItem` does the same for the right-side +Create / Favorites
// buttons (CreatePage / FavoritesPage viewing themselves).
const TopNav = ({
    activeLink, disableActiveLink = false, activeRightItem,
    onGoHome, onGoToExplore, onShowGenius, onShowQuotes, onShowNewsletter,
    onShowCreate, onShowFavorites, onShowSubscribe, onLogout, isLoggedIn,
    agentAvatar, onOpenProfile, onOpenSearch,
}) => {
    const renderLink = (key, label, onClick) => {
        const active = activeLink === key;
        if (active && disableActiveLink) {
            return <span className="ep-nav-link ep-nav-link--active">{label}</span>;
        }
        return (
            <button
                className={`ep-nav-link ep-nav-link-btn${active ? ' ep-nav-link--active' : ''}`}
                onClick={onClick}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="ep-nav" style={{ backgroundImage: `url(${NAV_BG_URL})` }}>
            <div className="ep-nav-logo">
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="ep-nav-logo-img" />
                <span className="ep-nav-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</span>
            </div>
            <nav className="ep-nav-links">
                {renderLink('home', 'Home', onGoHome)}
                {renderLink('explore', 'Explore', onGoToExplore)}
                {renderLink('genius', 'Genius', onShowGenius)}
                {renderLink('quotes', 'Quotes', onShowQuotes)}
                {renderLink('newsletter', 'Newsletter', onShowNewsletter)}
            </nav>
            <div className="ep-nav-right">
                {activeRightItem === 'create' ? (
                    <span className="ep-nav-create">+ Create</span>
                ) : (
                    <button className="ep-nav-create" onClick={onShowCreate}>+ Create</button>
                )}
                {activeRightItem === 'favorites' ? (
                    <span className="ep-nav-login ep-nav-login--active">Favorites</span>
                ) : (
                    <button className="ep-nav-login" onClick={onShowFavorites}>Favorites</button>
                )}
                <button className="ep-nav-login" onClick={onLogout}>{isLoggedIn ? 'Log out' : 'Log in'}</button>
                <button className="ep-nav-membership" onClick={onShowSubscribe}>Membership</button>
                <button className="ep-nav-search-btn" onClick={onOpenSearch} aria-label="Search">
                    <FiSearch size={18} className="ep-nav-search-icon" />
                </button>
                {isLoggedIn && (
                    <div className="ep-nav-avatar-wrap">
                        <button className="ep-nav-avatar" onClick={onOpenProfile} aria-label="Edit profile">
                            {agentAvatar ? <img src={agentAvatar} alt="" className="ep-nav-avatar-img" /> : <FiUser size={18} className="ep-nav-avatar-icon" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopNav;
