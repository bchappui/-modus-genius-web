import React, { useState } from 'react'
import { FiClock } from 'react-icons/fi'
import SearchModal from './SearchModal.jsx'
import CreateModal from './CreateModal.jsx'
import TopNav from './TopNav.jsx'
import './ExplorePage.css'
import './SubscribePage.css'
import './CreatePage.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const WREATH_URL     = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47d694002e3ef9f89a/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

// Same placeholder photos as SubscribePage (Pravatar — safe for mockups).
const AVATAR_URLS = [
    'https://i.pravatar.cc/300?img=32',
    'https://i.pravatar.cc/300?img=47',
    'https://i.pravatar.cc/300?img=12',
    'https://i.pravatar.cc/300?img=25',
    'https://i.pravatar.cc/300?img=8',
];

const CreatePage = ({
    searchTerm, onSearchChange, onGoToExplore, onGoHome, onShowGenius, onShowQuotes, onShowNewsletter, onShowSubscribe,
    onShowFavorites, onLogout, isLoggedIn, movieList, isLoading, errorMessage, onSelectProperty,
    agentAvatar, onOpenProfile,
}) => {
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    return (
        <div className="ep-page">

            <TopNav
                activeRightItem="create"
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius}
                onShowQuotes={onShowQuotes} onShowNewsletter={onShowNewsletter}
                onShowFavorites={onShowFavorites} onShowSubscribe={onShowSubscribe}
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

            {createModalOpen && (
                <CreateModal onClose={() => setCreateModalOpen(false)} />
            )}

            {/* ── HERO — same medallion technique as ExplorePage ── */}
            <div className="ep-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="cp-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#cp-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="ep-hero-content">
                    <div className="ep-hero-intro">
                        <h1 className="ep-headline cp-headline">
                            Your expertise deserves a global stage.
                        </h1>
                        <p className="ep-subtext">
                            Share your model, method, or artifact with millions worldwide.<br />
                            Gain visibility among the brightest minds in the movement.<br />
                            Your contribution could earn a place in the{' '}
                            <button className="cp-genius-mention" onClick={onShowGenius}>
                                Genius<sup>10</sup>
                            </button>{' '}
                            ranking.
                        </p>

                        <div className="cp-cta-row">
                            <div className="cp-social-row">
                                <img src={WREATH_URL} alt="" className="cp-bg-wreath" />
                                <div className="sp-avatars">
                                    {AVATAR_URLS.map((url) => (
                                        <img key={url} src={url} alt="" className="sp-avatar cp-avatar" />
                                    ))}
                                </div>
                            </div>

                            <div className="cp-start">
                                <button className="cp-start-btn" onClick={() => setCreateModalOpen(true)}>Start</button>
                                <span className="cp-start-caption">
                                    <FiClock size={13} />
                                    Takes 1 minute
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatePage;
