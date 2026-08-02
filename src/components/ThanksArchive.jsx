import React, { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import SearchModal from './SearchModal.jsx'
import TopNav from './TopNav.jsx'
import './ExplorePage.css'
import './HomePage.css'
import './NewsletterPage.css'
import './ThanksArchive.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

// Each "In this newsletter, you can expect:" item is now its own carousel
// slide (title repeated on every one), instead of all 3 sharing one slide.
const EXPECT_ITEMS = [
    "Actionable insights from the world's best top business experts",
    'Real opportunities to connect with the Modus Genius community',
    "FREE Starter Decks to help you learn practical, must-have skills like leadership, problem-solving, innovation and others across 300+ cards.",
];
const SLIDE_COUNT = 1 + EXPECT_ITEMS.length; // 0: "You're in!" welcome, 1-3: one expect item each

// Same 3 placeholder issues as NewsletterPage's "Most Popular" row — no
// newsletter-issues collection exists yet, see that file's note.
const ISSUES = [
    {
        id: 1,
        badge: 'VISUAL • GENIUS',
        title: 'AI Visual Content 101:',
        subtitle: 'Stunning creations in 7 days',
    },
    {
        id: 2,
        badge: 'VISUAL • GENIUS',
        title: 'AI Visual Content 101:',
        subtitle: 'Stunning creations in 7 days',
    },
    {
        id: 3,
        badge: 'VISUAL • GENIUS',
        title: 'AI Visual Content 101:',
        subtitle: 'Stunning creations in 7 days',
    },
];

// Landing page for visitors coming back from the beehiiv newsletter signup
// form (see App.jsx's ?thanks=1 deep link — beehiiv's own "redirect after
// subscribe" setting needs to point at that URL for this to show up
// automatically after a real signup).
const ThanksArchive = ({
    searchTerm, onSearchChange, onGoHome, onGoToExplore, onShowGenius, onShowQuotes, onShowNewsletter,
    onShowCreate, onShowFavorites, onShowSubscribe, onLogout, isLoggedIn, movieList, isLoading, errorMessage, onSelectProperty,
    agentAvatar, onOpenProfile,
}) => {
    const [searchModalOpen, setSearchModalOpen] = useState(false);

    // Auto-rotating carousel between the "You're in!" welcome slide and the
    // "In this newsletter..." slides — same interval pattern as HomePage's
    // hero image carousel.
    const [slideIndex, setSlideIndex] = useState(0);
    useEffect(() => {
        const id = setInterval(() => {
            setSlideIndex(prev => (prev + 1) % SLIDE_COUNT);
        }, 8000);
        return () => clearInterval(id);
    }, []);

    // Slides vary a lot in height (one line vs. a long paragraph) — measure
    // the active slide and size the viewport to match instead of a fixed
    // height, so short slides don't leave a big gap before the dots and the
    // long one doesn't get clipped/overlap what's below.
    const slideRefs = useRef([]);
    const [slideHeight, setSlideHeight] = useState(null);
    useEffect(() => {
        const el = slideRefs.current[slideIndex];
        if (el) setSlideHeight(el.offsetHeight);
    }, [slideIndex]);

    return (
        <div className="ep-page">

            <TopNav
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius} onShowQuotes={onShowQuotes}
                onShowNewsletter={onShowNewsletter} onShowCreate={onShowCreate} onShowFavorites={onShowFavorites} onShowSubscribe={onShowSubscribe}
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
                        <path id="ta-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#ta-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="ep-hero-content">
                    <div className="ep-hero-intro ta-intro">
                        <div className="ta-carousel">
                            <div className="ta-carousel-viewport-wrap hp-row-wrap">
                                <button
                                    className="hp-row-arrow hp-row-arrow--left"
                                    onClick={() => setSlideIndex(prev => (prev - 1 + SLIDE_COUNT) % SLIDE_COUNT)}
                                    aria-label="Previous slide"
                                >
                                    <FiChevronLeft size={22} />
                                </button>
                                <button
                                    className="hp-row-arrow hp-row-arrow--right"
                                    onClick={() => setSlideIndex(prev => (prev + 1) % SLIDE_COUNT)}
                                    aria-label="Next slide"
                                >
                                    <FiChevronRight size={22} />
                                </button>
                                <div className="ta-slide-viewport" style={slideHeight ? { height: slideHeight } : undefined}>
                                    <div
                                        className="ta-slide-track"
                                        style={{
                                            width: `${SLIDE_COUNT * 100}%`,
                                            transform: `translateX(-${slideIndex * (100 / SLIDE_COUNT)}%)`,
                                        }}
                                    >
                                        <div className="ta-slide" ref={el => (slideRefs.current[0] = el)} style={{ width: `${100 / SLIDE_COUNT}%` }}>
                                            <h1 className="ep-headline np-headline">YOU'RE IN!</h1>
                                            <p className="hp-hashtag ta-welcome">
                                                NOW GO CHECK YOUR INBOX WE'VE GOT A SURPRISE FOR YOU<br /><span className="ta-emoji ta-gift-emoji">🎁</span>
                                            </p>
                                        </div>
                                        {EXPECT_ITEMS.map((item, i) => (
                                            <div key={i} className="ta-slide" ref={el => (slideRefs.current[i + 1] = el)} style={{ width: `${100 / SLIDE_COUNT}%` }}>
                                                <p className="ep-headline ta-expect">In this newsletter, you can expect:</p>
                                                <ul className="ta-checklist">
                                                    <li className="ta-line"><span className="ta-emoji">✔️</span><span className="ta-checklist-item"> {item}</span></li>
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="hp-dots">
                                {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
                                    <button
                                        key={i}
                                        className={`hp-dot${i === slideIndex ? ' hp-dot--active' : ''}`}
                                        onClick={() => setSlideIndex(i)}
                                        aria-label={`Show slide ${i + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                        <p className="ep-headline ta-first-issue">
                            Your first issue lands soon, but in the meantime, let's get you going with some of the most popular content:
                        </p>
                    </div>

                    <div className="np-card-grid ta-vignette-grid">
                        {ISSUES.map(issue => (
                            <div key={issue.id} className="np-card">
                                <span className="np-card-badge">{issue.badge}</span>
                                <div className="np-card-body">
                                    <h3 className="np-card-title">{issue.title}</h3>
                                    <p className="np-card-subtitle">{issue.subtitle}</p>
                                </div>
                            </div>
                        ))}
                        <div className="ta-cta-row">
                            <button className="np-banner-btn ta-start-btn" onClick={onShowNewsletter}>EXPLORE MORE TOPICS</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThanksArchive;
