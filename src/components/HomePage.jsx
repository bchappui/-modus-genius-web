import React, { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import {
    getTop10Properties, getMissedProperties, getMostWantedProperties,
    getClassicsProperties, getNewProperties, getMGSelectsProperties,
} from '../lib/discover.js'
import { useUserTopHashtags } from '../lib/useUserTopHashtags.js'
import SearchModal from './SearchModal.jsx'
import CreateModal from './CreateModal.jsx'
import TopNav from './TopNav.jsx'
import './ExplorePage.css'
import './HomePage.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

// Carousel slides — auto-rotates. The "Join the Global Movement" / "#DISRUPTIVY"
// caption only belongs to the first slide; later slides can have their own
// caption (or none) via these same fields.
const CAROUSEL_SLIDES = [
    {
        image: 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47b7fe0018f1432219/view?project=693e8acd001582e2562a',
        headline: 'Join the Global Movement',
        hashtag: '#DISRUPTIVY',
    },
    {
        image: 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47b8d300355431a43d/view?project=693e8acd001582e2562a',
        large: true,
    },
    {
        image: 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a47b93e0013fa52cb3b/view?project=693e8acd001582e2562a',
        large: true,
    },
    {
        type: 'wreath',
        wreathImage: 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/699b04810011f3feb029/view?project=693e8acd001582e2562a',
        headline: 'Join the 1% climbing to the top',
        lines: [
            'Share your idea with millions worldwide.',
            'Gain visibility among the brightest minds in the movement.',
        ],
        buttonLabel: 'Start',
    },
];

// ── Generic horizontal carousel section — mirrors renderRecommendationSection
// in modus_genius: numbered gold ranks for Top 10, plain tiles for everything else.
// Arrow buttons (not a visible scrollbar) drive the horizontal scroll, per image 13.
const CarouselSection = ({ title, items, loading, showNumbers, onSelectProperty }) => {
    const rowRef = useRef(null);
    const scrollByAmount = (dir) => {
        const row = rowRef.current;
        if (!row) return;
        row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: 'smooth' });
    };

    return (
        <div className="hp-section">
            <h2 className="hp-top10-title">{title}</h2>
            {loading ? (
                <p className="hp-row-hint">Loading…</p>
            ) : !items || items.length === 0 ? (
                <p className="hp-row-hint">No cards found.</p>
            ) : (
                <div className="hp-row-wrap">
                    <button className="hp-row-arrow hp-row-arrow--left" onClick={() => scrollByAmount(-1)} aria-label="Scroll left">
                        <FiChevronLeft size={22} />
                    </button>
                    <div className={showNumbers ? 'hp-top10-row' : 'hp-hashtag-row'} ref={rowRef}>
                        {showNumbers ? (
                            items.map((property, i) => (
                                <button key={property.$id} className="hp-top10-item" onClick={() => onSelectProperty(property)}>
                                    <span className="hp-top10-rank">{i + 1}</span>
                                    <img src={property.background || '/no-movie.png'} alt={property.name} className="hp-top10-img" />
                                </button>
                            ))
                        ) : (
                            items.map(property => (
                                <button key={property.$id} className="hp-hashtag-item" onClick={() => onSelectProperty(property)}>
                                    <img src={property.background || '/no-movie.png'} alt="" className="hp-hashtag-img" />
                                    <div className="hp-hashtag-overlay" />
                                    <span className="hp-hashtag-name">{property.name}</span>
                                </button>
                            ))
                        )}
                    </div>
                    <button className="hp-row-arrow hp-row-arrow--right" onClick={() => scrollByAmount(1)} aria-label="Scroll right">
                        <FiChevronRight size={22} />
                    </button>
                </div>
            )}
        </div>
    );
};

const HomePage = ({
    agentId, searchTerm, onSearchChange, onShowFavorites, onLogout, isLoggedIn,
    onGoToExplore, onShowNewsletter, onShowGenius, onShowQuotes, onShowCreate, onShowSubscribe, onLearnMore, movieList, isLoading, errorMessage, onSelectProperty,
    agentAvatar, onOpenProfile,
}) => {
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const { sections: hashtagSections } = useUserTopHashtags(agentId);

    const [slideIndex, setSlideIndex] = useState(0);
    useEffect(() => {
        if (CAROUSEL_SLIDES.length <= 1) return;
        const id = setInterval(() => {
            setSlideIndex(prev => (prev + 1) % CAROUSEL_SLIDES.length);
        }, 4000);
        return () => clearInterval(id);
    }, []);

    const [top10, setTop10] = useState({ data: [], loading: true });
    const [missed, setMissed] = useState({ data: [], loading: true });
    const [newIn, setNewIn] = useState({ data: [], loading: true });
    const [mostWanted, setMostWanted] = useState({ data: [], loading: true });
    const [classics, setClassics] = useState({ data: [], loading: true });
    const [mgSelects, setMgSelects] = useState({ data: [], loading: true });

    useEffect(() => {
        getTop10Properties().then(data => setTop10({ data, loading: false }));
        getMissedProperties().then(data => setMissed({ data, loading: false }));
        getNewProperties().then(data => setNewIn({ data, loading: false }));
        getMostWantedProperties().then(data => setMostWanted({ data, loading: false }));
        getClassicsProperties().then(data => setClassics({ data, loading: false }));
        getMGSelectsProperties().then(data => setMgSelects({ data, loading: false }));
    }, []);

    return (
        <div className="ep-page">

            <TopNav
                activeLink="home" disableActiveLink
                onGoToExplore={onGoToExplore} onShowGenius={onShowGenius}
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
                        <path id="hp-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#hp-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="hp-hero-content">
                    {/* ── Carousel — auto-rotates; each slide's own caption (if any) ── */}
                    <div className="hp-intro hp-row-wrap">
                        <button
                            className="hp-row-arrow hp-row-arrow--left"
                            onClick={() => setSlideIndex(prev => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
                            aria-label="Previous slide"
                        >
                            <FiChevronLeft size={22} />
                        </button>
                        <button
                            className="hp-row-arrow hp-row-arrow--right"
                            onClick={() => setSlideIndex(prev => (prev + 1) % CAROUSEL_SLIDES.length)}
                            aria-label="Next slide"
                        >
                            <FiChevronRight size={22} />
                        </button>
                        <div className="hp-slide-viewport">
                            <div
                                className="hp-slide-track"
                                style={{
                                    width: `${CAROUSEL_SLIDES.length * 100}%`,
                                    transform: `translateX(-${slideIndex * (100 / CAROUSEL_SLIDES.length)}%)`,
                                }}
                            >
                                {CAROUSEL_SLIDES.map((slide, i) => (
                                    <div key={i} className="hp-slide-content" style={{ width: `${100 / CAROUSEL_SLIDES.length}%` }}>
                                        {slide.type === 'wreath' ? (
                                            <div className="hp-wreath-slide">
                                                <h1 className="hp-headline">{slide.headline}</h1>
                                                <div className="hp-wreath-body">
                                                    <img src={slide.wreathImage} alt="" className="hp-wreath-img" />
                                                    <div className="hp-wreath-text">
                                                        {slide.lines.map(line => (
                                                            <p key={line} className="hp-wreath-line">{line}</p>
                                                        ))}
                                                        <p className="hp-wreath-line">
                                                            Your contribution could earn a place in the{' '}
                                                            <em className="hp-wreath-genius">GENIUS<sup>10</sup></em> ranking.
                                                        </p>
                                                    </div>
                                                    <button className="hp-learn-btn hp-wreath-btn" onClick={() => setCreateModalOpen(true)}>{slide.buttonLabel}</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {slide.headline && (
                                                    <h1 className="hp-headline">
                                                        {slide.headline}
                                                    </h1>
                                                )}
                                                {slide.hashtag && (
                                                    <p className="hp-hashtag">{slide.hashtag}</p>
                                                )}
                                                <img
                                                    src={slide.image}
                                                    alt=""
                                                    className={`hp-badge${slide.large ? ' hp-badge--large' : ''}`}
                                                />
                                                {slide.headline && (
                                                    <button className="hp-learn-btn" onClick={onLearnMore}>Learn More</button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="hp-dots">
                            {CAROUSEL_SLIDES.map((slide, i) => (
                                <button
                                    key={i}
                                    className={`hp-dot${i === slideIndex ? ' hp-dot--active' : ''}`}
                                    aria-label={`Slide ${i + 1}`}
                                    onClick={() => setSlideIndex(i)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 1. Top 10 */}
                    <CarouselSection title="Top 10" items={top10.data} loading={top10.loading} showNumbers onSelectProperty={onSelectProperty} />
                    {/* 2. #Hashtag 1 */}
                    {hashtagSections[0] && (
                        <CarouselSection title={`#${hashtagSections[0].hashtagName}`} items={hashtagSections[0].properties} loading={hashtagSections[0].loading} onSelectProperty={onSelectProperty} />
                    )}
                    {/* 3. In Case You Missed It */}
                    <CarouselSection title="In Case You Missed It" items={missed.data} loading={missed.loading} onSelectProperty={onSelectProperty} />
                    {/* 4. #Hashtag 2 */}
                    {hashtagSections[1] && (
                        <CarouselSection title={`#${hashtagSections[1].hashtagName}`} items={hashtagSections[1].properties} loading={hashtagSections[1].loading} onSelectProperty={onSelectProperty} />
                    )}
                    {/* 5. New In */}
                    <CarouselSection title="New In" items={newIn.data} loading={newIn.loading} onSelectProperty={onSelectProperty} />
                    {/* 6. #Hashtag 3 */}
                    {hashtagSections[2] && (
                        <CarouselSection title={`#${hashtagSections[2].hashtagName}`} items={hashtagSections[2].properties} loading={hashtagSections[2].loading} onSelectProperty={onSelectProperty} />
                    )}
                    {/* 7. Most Wanted */}
                    <CarouselSection title="Most Wanted" items={mostWanted.data} loading={mostWanted.loading} onSelectProperty={onSelectProperty} />
                    {/* 8. #Hashtag 4 */}
                    {hashtagSections[3] && (
                        <CarouselSection title={`#${hashtagSections[3].hashtagName}`} items={hashtagSections[3].properties} loading={hashtagSections[3].loading} onSelectProperty={onSelectProperty} />
                    )}
                    {/* 9. Classics */}
                    <CarouselSection title="Classics" items={classics.data} loading={classics.loading} onSelectProperty={onSelectProperty} />
                    {/* 10. #Hashtag 5 */}
                    {hashtagSections[4] && (
                        <CarouselSection title={`#${hashtagSections[4].hashtagName}`} items={hashtagSections[4].properties} loading={hashtagSections[4].loading} onSelectProperty={onSelectProperty} />
                    )}
                    {/* 11. MG Selects */}
                    <CarouselSection title="MG Selects" items={mgSelects.data} loading={mgSelects.loading} onSelectProperty={onSelectProperty} />
                    {/* 12-15. #Hashtag 6-9 */}
                    {hashtagSections.slice(5, 9).map(section => (
                        <CarouselSection key={section.hashtagId} title={`#${section.hashtagName}`} items={section.properties} loading={section.loading} onSelectProperty={onSelectProperty} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
