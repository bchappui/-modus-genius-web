import React, { useEffect, useRef, useState } from 'react'
import './CardHome.css'
import './AgentProfileCard.css'
import { MdAccountCircle, MdBarChart, MdBookmark, MdStyle, MdBadge, MdInfo, MdPlace, MdWork, MdEmail, MdFileDownload, MdStars, MdPerson } from 'react-icons/md'
import { FaLinkedin, FaCertificate } from 'react-icons/fa'
import { IoHeartCircle } from 'react-icons/io5'
import { FiX } from 'react-icons/fi'
import { COUNTRIES } from '../../lib/countries.js'
import ShareModal from '../modals/ShareModal.jsx'
import Spinner from '../shared/Spinner.jsx'
import { captureNode, downloadDataUrl } from '../../lib/domCapture.js'
import { getUserProgress, getLevelQuotas, calculateProgression } from '../../lib/levels.js'
import { getLikesStatsForAgent } from '../../lib/likes.js'
import { getStarsStatsForAgent } from '../../lib/stars.js'
import { getFavoriteIds } from '../../lib/favorites.js'
import { getPropertiesByIds, getPropertiesByAgent } from '../../lib/properties.js'
import { CATEGORY_IMAGE_ID, CATEGORY_SHORT_ROLE } from '../../lib/categories.js'
import { getFileViewUrl } from '../../lib/agents.js'

/* MCIcons "share" — curved right-arrow, same glyph reused across this app's overlays.
   Color matches CardReader's .cr-heart/.cr-comment default (inactive) state,
   rgb(185,200,235) — not gold, which CardReader reserves for an active/liked state. */
const MciShare = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="rgb(185,200,235)">
        <path d="M21,12L14,5V9C7,10 4,15 3,20C5.5,16.5 9,14.9 14,14.9V19L21,12Z" />
    </svg>
);

/* Gold gradient defs for the banner's heart/star/verified icons — mirrors
   modus_genius's GradientofGold(2) MaskedView components, which replace
   those icons' own color prop with a gold gradient fill. */
const BannerSvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="apc-rc-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgb(246,207,129)" />
                <stop offset="50%"  stopColor="rgb(201,151,44)" />
                <stop offset="100%" stopColor="rgb(246,207,129)" />
            </linearGradient>
        </defs>
    </svg>
);

/* Small circular "modus genius" logo shown bottom-right of the footer bar */
const FOOTER_LOGO_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';
/* Fixed rank-diamond background image, same constant as AgentProfileCard's own level diamond */
const DIAMOND_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a1c4f100011bbb241f0/view?project=693e8acd001582e2562a';

const toRoman = (n) => {
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let out = '';
    for (let i = 0; i < vals.length; i++)
        while (n >= vals[i]) { out += syms[i]; n -= vals[i]; }
    return out;
};
const splitRoman = (s) => {
    if (s.length <= 3) return s;
    const mid = Math.ceil(s.length / 2);
    return `${s.slice(0, mid)}\n${s.slice(mid)}`;
};

const getFlagImageUrl = (isoCode) => (
    isoCode && isoCode.length === 2 ? `https://flagcdn.com/w80/${isoCode.toLowerCase()}.png` : null
);
const countryName = (code) => COUNTRIES.find(c => c.code === code?.toUpperCase())?.name || code;

const TABS = [
    { key: 'infos',     icon: MdAccountCircle, label: 'INFOS' },
    { key: 'skills',    icon: MdBarChart,      label: 'SKILLS' },
    { key: 'favorites', icon: MdBookmark,      label: 'FAVORITES' },
    { key: 'creations', icon: MdStyle,         label: 'CREATIONS' },
];

// Mirrors modus_genius's TopBannerProfile (the current version — not the
// unused TopBannerProfileCard): a big standalone diamond avatar, a small
// gold level-diamond touching its bottom tip, hearts/stars pill counters
// flanking that small diamond, the agent's name + a gold rosette badge, and
// a "member since" caption — sits above the field sections in the Infos tab.
const ProfileBanner = ({ agent }) => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!agent?.$id) return;
        let cancelled = false;
        (async () => {
            try {
                const [quotas, progress] = await Promise.all([getLevelQuotas(), getUserProgress(agent.$id)]);
                const calc = calculateProgression(progress.totalHearts, progress.totalStars, quotas.hearts, quotas.stars);
                if (!cancelled) setStats({
                    hearts: progress.totalHearts,
                    stars: progress.totalStars,
                    heartsNeeded: calc.heartsNeeded,
                    starsNeeded: calc.starsNeeded,
                    currentLevel: progress.currentLevel ?? 1,
                });
            } catch (e) {
                console.error('ProfileBanner progression error:', e);
            }
        })();
        return () => { cancelled = true; };
    }, [agent?.$id]);

    const memberSinceYear = agent?.$createdAt ? new Date(agent.$createdAt).getFullYear() : '2023';

    return (
        <div className="apc-rc-banner">
            <BannerSvgDefs />

            <div className="apc-rc-banner-avatar">
                <div className="apc-rc-banner-avatar-frame">
                    <div className="apc-rc-banner-avatar-gold" />
                    <div className="apc-rc-banner-avatar-inner">
                        {agent?.avatar
                            ? <img src={agent.avatar} className="apc-rc-banner-avatar-img" alt="" />
                            : <MdPerson size={44} color="rgb(137,162,189)" style={{ transform: 'rotate(-45deg)' }} />}
                    </div>
                </div>
            </div>

            <div className="apc-rc-banner-level">
                <div className="apc-rc-banner-level-frame">
                    <div className="apc-rc-banner-level-gold" />
                    <div className="apc-rc-banner-level-inner">
                        <img src={DIAMOND_URL} className="apc-rc-banner-level-img" alt="" />
                        <div className="apc-rc-banner-level-dim" />
                        <span className="apc-rc-banner-level-roman">{splitRoman(toRoman(stats?.currentLevel ?? 1))}</span>
                    </div>
                </div>
            </div>

            <div className="apc-rc-banner-row">
                <div className="apc-rc-banner-pill apc-rc-banner-pill-left">
                    <div className="apc-rc-banner-pill-icon">
                        <IoHeartCircle size={32} style={{ fill: 'url(#apc-rc-g-gold) rgb(201,151,44)' }} />
                    </div>
                    <div className="apc-rc-banner-pill-nums">
                        <span className="apc-rc-banner-count">{stats?.hearts ?? 0}</span>
                        <span className="apc-rc-banner-needed">{stats?.heartsNeeded ?? '—'}</span>
                    </div>
                </div>

                <div className="apc-rc-banner-pill-spacer" />

                <div className="apc-rc-banner-pill apc-rc-banner-pill-right">
                    <div className="apc-rc-banner-pill-nums">
                        <span className="apc-rc-banner-count">{stats?.stars ?? 0}</span>
                        <span className="apc-rc-banner-needed">{stats?.starsNeeded ?? '—'}</span>
                    </div>
                    <div className="apc-rc-banner-pill-icon">
                        <MdStars size={28} style={{ fill: 'url(#apc-rc-g-gold) rgb(201,151,44)' }} />
                    </div>
                </div>
            </div>

            <div className="apc-rc-banner-name-row">
                <span className="apc-rc-banner-name">{agent?.name} {agent?.surname}</span>
                <FaCertificate size={18} style={{ fill: 'url(#apc-rc-g-gold) rgb(201,151,44)' }} />
            </div>
            <span className="apc-rc-banner-member">GOLD MEMBER SINCE {memberSinceYear}</span>
        </div>
    );
};

const InfosTab = ({ agent }) => (
    <>
        {agent?.title && (
            <div className="apc-rc-section">
                <MdBadge size={26} color="rgb(237,185,95)" className="apc-rc-section-icon" />
                <span className="apc-rc-section-title">TITLE</span>
                <span className="apc-rc-section-content">{agent.title}</span>
            </div>
        )}
        {agent?.Iamlookingfor && (
            <div className="apc-rc-section">
                <MdInfo size={26} color="rgb(237,185,95)" className="apc-rc-section-icon" />
                <span className="apc-rc-section-title">I AM LOOKING FOR...</span>
                <span className="apc-rc-section-content">{agent.Iamlookingfor}</span>
            </div>
        )}
        {agent?.Location && (
            <div className="apc-rc-section">
                <MdPlace size={26} color="rgb(237,185,95)" className="apc-rc-section-icon" />
                <span className="apc-rc-section-title">LOCATION</span>
                {getFlagImageUrl(agent.Location) && (
                    <img src={getFlagImageUrl(agent.Location)} alt="" className="apc-rc-flag" />
                )}
                <span className="apc-rc-section-content">{countryName(agent.Location)}</span>
            </div>
        )}
        {agent?.Experience && (
            <div className="apc-rc-section">
                <MdWork size={26} color="rgb(237,185,95)" className="apc-rc-section-icon" />
                <span className="apc-rc-section-title">EXPERIENCE</span>
                <span className="apc-rc-section-content">{agent.Experience}</span>
            </div>
        )}
        {agent?.LinkedIn && (
            <div className="apc-rc-section">
                <FaLinkedin size={24} color="rgb(237,185,95)" className="apc-rc-section-icon" />
                <span className="apc-rc-section-title">LINKEDIN</span>
                <a
                    className="apc-rc-section-content"
                    href={agent.LinkedIn.startsWith('http') ? agent.LinkedIn : `https://${agent.LinkedIn}`}
                    target="_blank" rel="noopener noreferrer"
                >
                    {agent.LinkedIn}
                </a>
            </div>
        )}
        {agent?.email && (
            <div className="apc-rc-section">
                <MdEmail size={26} color="rgb(237,185,95)" className="apc-rc-section-icon" />
                <span className="apc-rc-section-title">EMAIL</span>
                <span className="apc-rc-section-content">{agent.email}</span>
            </div>
        )}
    </>
);

// Opens a property the same way ShareModal's copied links do — App.jsx already
// has a useEffect that reads ?property=<id> on load and opens that card.
const openProperty = (propertyId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('property', propertyId);
    window.location.href = url.toString();
};

// Mirrors modus_genius's SkillsScreen: two sections (likes broken down by
// property type = "Creator Skills", stars broken down by type = "Advisor
// Skills"), each with a dominant-category rank badge and a progress bar per
// category the agent has any activity in.
const SkillsTab = ({ agent }) => {
    const [likesByType, setLikesByType] = useState({});
    const [starsByType, setStarsByType] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!agent?.$id) return;
        let cancelled = false;
        (async () => {
            try {
                const [likes, stars] = await Promise.all([
                    getLikesStatsForAgent(agent.$id),
                    getStarsStatsForAgent(agent.$id),
                ]);
                if (!cancelled) { setLikesByType(likes); setStarsByType(stars); }
            } catch (e) {
                console.error('SkillsTab stats error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [agent?.$id]);

    if (loading) return <div className="apc-rc-placeholder"><Spinner /></div>;

    const dominantCategory = (stats) => {
        const entries = Object.entries(stats);
        if (!entries.length) return null;
        const max = Math.max(...entries.map(([, c]) => c));
        return entries.find(([, c]) => c === max)?.[0] ?? null;
    };

    const StatBar = ({ label, value, maxValue }) => (
        <div className="apc-rc-statbar">
            {CATEGORY_IMAGE_ID[label] && (
                <img src={getFileViewUrl(CATEGORY_IMAGE_ID[label])} alt="" className="apc-rc-statbar-icon" />
            )}
            <div className="apc-rc-statbar-body">
                <div className="apc-rc-statbar-header">
                    <span className="apc-rc-statbar-label">{label.toUpperCase()}</span>
                    <span className="apc-rc-statbar-value">{value}</span>
                </div>
                <div className="apc-rc-statbar-track">
                    <div className="apc-rc-statbar-fill" style={{ width: `${(value / maxValue) * 100}%` }} />
                </div>
            </div>
        </div>
    );

    const likesDominant = dominantCategory(likesByType);
    const starsDominant = dominantCategory(starsByType);
    const likesTitle = likesDominant ? (CATEGORY_SHORT_ROLE[likesDominant] || `${likesDominant} Specialist`) : 'Newcomer';
    const starsTitle = starsDominant ? (CATEGORY_SHORT_ROLE[starsDominant] || `${starsDominant} Expert`) : 'Rising Star';
    const maxLikes = Math.max(...Object.values(likesByType), 1);
    const maxStars = Math.max(...Object.values(starsByType), 1);

    return (
        <>
            <div className="apc-rc-skills-section">
                <IoHeartCircle size={34} style={{ fill: 'url(#apc-rc-g-gold) rgb(201,151,44)' }} />
                <span className="apc-rc-section-title" style={{ marginTop: 4 }}>CREATOR SKILLS</span>
                <div className="apc-rc-rank-badge">{likesTitle.toUpperCase()}</div>
                {Object.keys(likesByType).length === 0
                    ? <div className="apc-rc-section-content">No likes yet</div>
                    : Object.entries(likesByType).map(([type, count]) => (
                        <StatBar key={type} label={type} value={count} maxValue={maxLikes} />
                    ))}
            </div>
            <div className="apc-rc-skills-section">
                <MdStars size={34} style={{ fill: 'url(#apc-rc-g-gold) rgb(201,151,44)' }} />
                <span className="apc-rc-section-title" style={{ marginTop: 4 }}>ADVISOR SKILLS</span>
                <div className="apc-rc-rank-badge">{starsTitle.toUpperCase()}</div>
                {Object.keys(starsByType).length === 0
                    ? <div className="apc-rc-section-content">No stars yet</div>
                    : Object.entries(starsByType).map(([type, count]) => (
                        <StatBar key={type} label={type} value={count} maxValue={maxStars} />
                    ))}
            </div>
        </>
    );
};

// Shared 2-column grid for Favorites/Creations — same visual layer as this
// app's own hp-hashtag-item tiles (image + bottom gradient + name), just
// sized for the narrower card instead of the homepage's horizontal rail.
const PropertyGrid = ({ properties, emptyText }) => {
    if (!properties.length) return <div className="apc-rc-placeholder">{emptyText}</div>;
    return (
        <div className="apc-rc-grid">
            {properties.map(property => (
                <button key={property.$id} className="apc-rc-grid-item" onClick={() => openProperty(property.$id)}>
                    <img src={property.background || '/no-movie.png'} alt="" className="apc-rc-grid-img" />
                    <div className="apc-rc-grid-overlay" />
                    <span className="apc-rc-grid-name">{property.name}</span>
                </button>
            ))}
        </div>
    );
};

const FavoritesTab = ({ agent }) => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!agent?.$id) return;
        let cancelled = false;
        (async () => {
            try {
                const ids = await getFavoriteIds(agent.$id);
                const props = ids.length ? await getPropertiesByIds(ids) : [];
                if (!cancelled) setProperties(props);
            } catch (e) {
                console.error('FavoritesTab error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [agent?.$id]);

    if (loading) return <div className="apc-rc-placeholder"><Spinner /></div>;
    return <PropertyGrid properties={properties} emptyText="No favorites yet." />;
};

const CreationsTab = ({ agent }) => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!agent?.$id) return;
        let cancelled = false;
        (async () => {
            try {
                const props = await getPropertiesByAgent(agent.$id);
                if (!cancelled) setProperties(props);
            } catch (e) {
                console.error('CreationsTab error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [agent?.$id]);

    if (loading) return <div className="apc-rc-placeholder"><Spinner /></div>;
    return <PropertyGrid properties={properties} emptyText="No creations yet." />;
};

// Reads the agent's "trading card" like a mini profile sheet — opened from the
// touch-app button on AgentProfileCard. Mirrors modus_genius's ProfileSheetContent
// tab bar (Infos/Skills/Favorites/Creations).
const AgentReadCard = ({ agent, onClose }) => {
    const [activeTab, setActiveTab] = useState('infos');
    const [shareOpen, setShareOpen] = useState(false);
    const cardRef = useRef(null);
    const activeTabDef = TABS.find(t => t.key === activeTab);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        try {
            const dataUrl = await captureNode(cardRef.current);
            const safeName = (agent ? `${agent.name}-${agent.surname}` : 'profile').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            downloadDataUrl(dataUrl, `${safeName || 'profile'}-card.png`);
        } catch (e) {
            console.error('Error generating image', e);
            alert('Could not generate the image.');
        }
    };

    return (
        <>
        <div className="pm-overlay" onClick={onClose}>
            <div className="pm-wrapper" onClick={e => e.stopPropagation()}>
                <div className="pm-topbar">
                    <button className="pm-ctrl-btn pm-ctrl-close" onClick={onClose}>
                        <FiX size={30} color="rgb(137,162,189)" />
                    </button>
                </div>
                <div className="apc-rc-outer">
                    <div className="apc-rc-card" ref={cardRef}>
                        <div className="apc-rc-bg-gradient-1" />
                        <div className="apc-rc-bg-gradient-2" />

                        <div className="apc-rc-tabbar">
                            {TABS.map(({ key, icon: Icon }) => (
                                <button
                                    key={key}
                                    className={`apc-rc-tab${activeTab === key ? ' active' : ''}`}
                                    onClick={() => setActiveTab(key)}
                                >
                                    <Icon size={21} />
                                </button>
                            ))}
                        </div>

                        <div className="apc-rc-header">
                            <div className="apc-rc-header-bar">
                                <div className="apc-rc-header-spacer" />
                                <div className="apc-rc-header-title-area">
                                    <span className="apc-rc-header-title">{activeTabDef.label}</span>
                                </div>
                            </div>
                            <div className="apc-rc-header-row2">
                                <div className="apc-rc-header-rect" />
                                <div className="apc-rc-header-triangle" />
                            </div>
                            <div className="apc-rc-header-logo-area">
                                <activeTabDef.icon size={40} color="rgb(237,185,95)" />
                            </div>
                        </div>

                        <div className="apc-rc-content">
                            <ProfileBanner agent={agent} />
                            {activeTab === 'infos' && <InfosTab agent={agent} />}
                            {activeTab === 'skills' && <SkillsTab agent={agent} />}
                            {activeTab === 'favorites' && <FavoritesTab agent={agent} />}
                            {activeTab === 'creations' && <CreationsTab agent={agent} />}
                        </div>

                        <div className="apc-rc-footer">
                            <div className="apc-rc-footer-row1">
                                <div className="apc-rc-footer-triangle" />
                                <div className="apc-rc-footer-rect" />
                            </div>
                            <div className="apc-rc-footer-bar">
                                <div className="apc-rc-footer-buttons">
                                    <button className="apc-rc-footer-btn" onClick={handleDownload}>
                                        <MdFileDownload size={24} color="rgb(185,200,235)" />
                                    </button>
                                    <button className="apc-rc-footer-btn" onClick={() => setShareOpen(true)}>
                                        <MciShare />
                                    </button>
                                </div>
                                <div className="apc-rc-footer-logo-spacer" />
                            </div>
                            <div className="apc-rc-footer-logo-area">
                                <img src={FOOTER_LOGO_URL} alt="" className="apc-rc-footer-logo" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {shareOpen && (
            <ShareModal
                id={agent?.$id}
                name={agent ? `${agent.name} ${agent.surname}` : undefined}
                paramName="agent"
                onClose={() => setShareOpen(false)}
            />
        )}
        </>
    );
};

export default AgentReadCard;
