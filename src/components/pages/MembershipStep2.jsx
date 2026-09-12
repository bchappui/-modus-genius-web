import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { FiCheck, FiX, FiInfo } from 'react-icons/fi'
import { FaBookOpen, FaCopy, FaBoxOpen, FaUsers, FaUserPlus, FaGift } from 'react-icons/fa'
import TopNav from '../shared/TopNav.jsx'
import SearchModal from '../modals/SearchModal.jsx'
import SeasonPassModal from '../modals/SeasonPassModal.jsx'
import './ExplorePage.css'
import './SubscribePage.css'
import './MembershipWizard.css'
import { BILLING_PERIODS, PLAN_COMPARISON_ROWS } from '../../lib/membership.js'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const GUARANTEE_BADGE_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6aa468fa0015f5cba7b6/view?project=693e8acd001582e2562a';
const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

const ROW_ICONS = {
    newsletter: FaBookOpen,
    cards: FaCopy,
    decks: FaBoxOpen,
    community: FaUsers,
    profiles: FaUserPlus,
    seasonpass: FaGift,
};

function formatCountdown(ms) {
    if (ms <= 0) return '00H 00M 00S';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`;
}

// Membership wizard, step 2 of 3 — plan comparison table. Two continuous
// colored columns (not per-row cell shading) run behind the check/X marks,
// via CSS grid with explicit row placement — matches the supplied mockup's
// "pill" column look rather than a plain striped table. Clicking either
// column selects it (Extra pre-selected); Continue carries that choice to
// Step 3 without charging anything yet.
const MembershipStep2 = ({
    isLoggedIn, onContinue,
    onGoHome, onGoToExplore, onShowGenius, onShowQuotes, onShowNewsletter,
    onShowCreate, onShowFavorites, onLogout, agentAvatar, onOpenProfile,
    searchTerm, onSearchChange, movieList, isLoading: searchLoading, errorMessage, onSelectProperty,
}) => {
    const [billing, setBilling] = useState('monthly');
    const [selected, setSelected] = useState('extra');
    const [countdown, setCountdown] = useState('');
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [seasonPassModalOpen, setSeasonPassModalOpen] = useState(false);
    const period = BILLING_PERIODS[billing];

    // The hint ("2 months free") needs to sit centered directly under the
    // "Annual" button specifically — not under the toggle group as a whole —
    // so its arrow reads as pointing at Annual rather than drifting toward
    // Lifetime. Button widths depend on their label text, so that offset is
    // measured from the actual DOM rather than assumed from fixed widths.
    const toggleRowRef = useRef(null);
    const annualBtnRef = useRef(null);
    const [annualCenter, setAnnualCenter] = useState(null);

    useLayoutEffect(() => {
        if (!toggleRowRef.current || !annualBtnRef.current) return;
        // .mw-billing-hint is positioned absolute against .mw-billing-toggle-row
        // (the transform on that row makes it the containing block, regardless
        // of the toggle itself also being position: relative) — so this offset
        // must be measured from the row, not from the toggle pill.
        const rowRect = toggleRowRef.current.getBoundingClientRect();
        const btnRect = annualBtnRef.current.getBoundingClientRect();
        setAnnualCenter(btnRect.left - rowRect.left - btnRect.width * 0.08);
    }, []);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            setCountdown(formatCountdown(midnight.getTime() - now.getTime()));
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="sp-page">
            <TopNav
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius}
                onShowQuotes={onShowQuotes} onShowNewsletter={onShowNewsletter}
                onShowCreate={onShowCreate} onShowFavorites={onShowFavorites} onShowSubscribe={() => {}}
                onLogout={onLogout} isLoggedIn={isLoggedIn}
                agentAvatar={agentAvatar} onOpenProfile={onOpenProfile}
                onOpenSearch={() => setSearchModalOpen(true)}
            />

            <div className="mw-offer-banner">
                <span className="mw-offer-highlight">70% OFF TODAY ONLY</span>
                Offer ends in <span className="mw-offer-timer">{countdown}</span>
            </div>

            {searchModalOpen && (
                <SearchModal
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    movieList={movieList}
                    isLoading={searchLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={onSelectProperty}
                    onClose={() => setSearchModalOpen(false)}
                />
            )}

            {seasonPassModalOpen && (
                <SeasonPassModal
                    onClose={() => setSeasonPassModalOpen(false)}
                    onGetSeasonPass={() => {
                        setSelected('extra');
                        setSeasonPassModalOpen(false);
                    }}
                />
            )}

            <div className="sp-hero mw-step2-hero-padding">
                <img src={GUARANTEE_BADGE_URL} alt="100% money back guarantee" className="mw-guarantee-badge-top" />
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="mw2-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#mw2-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="mw-step-content mw-step-content--wide">
                    <p className="mw-step-label">Step 2 of 3</p>
                    <h1 className="mw-step-heading">Choose the plan that's right for you</h1>

                    <div className="mw-billing-toggle-row" ref={toggleRowRef}>
                        <div className="mw-billing-toggle">
                            {Object.values(BILLING_PERIODS).map(p => (
                                <button
                                    key={p.key}
                                    ref={p.key === 'annual' ? annualBtnRef : undefined}
                                    className={billing === p.key ? 'mw-billing-toggle-btn--active' : ''}
                                    onClick={() => setBilling(p.key)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <p
                            className="mw-billing-hint"
                            style={annualCenter != null ? { left: annualCenter } : { visibility: 'hidden' }}
                        >
                            <span className="mw-billing-hint-text">{BILLING_PERIODS.annual.hint}</span>
                            <svg className="mw-billing-hint-arrow" width="20" height="28" viewBox="0 0 20 28" fill="none">
                                <path d="M3 25Q14 25 15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                                <path d="M9 11L15 6L19 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                        </p>
                    </div>

                    <div className="mw-plan-table">
                        <div
                            className={`mw-plan-col-bg mw-plan-col-bg--essentials${selected === 'essentials' ? ' mw-plan-col-bg--gold mw-plan-col-bg--selected' : ''}`}
                            style={{ gridColumn: 3, gridRow: `1 / span ${PLAN_COMPARISON_ROWS.length + 1}` }}
                            onClick={() => setSelected('essentials')}
                        />
                        <div className="mw-plan-benefits-label" style={{ gridColumn: 1, gridRow: 1 }}>Benefits</div>
                        <div
                            className={`mw-plan-col-bg mw-plan-col-bg--extra${selected === 'extra' ? ' mw-plan-col-bg--gold mw-plan-col-bg--selected' : ''}`}
                            style={{ gridColumn: 4, gridRow: `1 / span ${PLAN_COMPARISON_ROWS.length + 1}` }}
                            onClick={() => setSelected('extra')}
                        />
                        <div className="mw-plan-header-divider" style={{ gridColumn: '1 / -1', gridRow: 1, alignSelf: 'end' }} />

                        <div
                            className={`mw-plan-col-head mw-plan-col-head--essentials${selected === 'essentials' ? ' mw-plan-col-head--gold-text' : ''}`}
                            style={{ gridColumn: 3, gridRow: 1 }}
                            onClick={() => setSelected('essentials')}
                        >
                            <div className="mw-plan-col-name">Essentials</div>
                            <div className="mw-plan-col-price">
                                CHF {period.essentialsPrice}{period.priceSuffix}
                                {period.essentialsStrike && <span className="mw-plan-col-strike">CHF {period.essentialsStrike}</span>}
                            </div>
                        </div>
                        <div
                            className={`mw-plan-col-head mw-plan-col-head--extra${selected === 'extra' ? ' mw-plan-col-head--gold-text' : ''}`}
                            style={{ gridColumn: 4, gridRow: 1 }}
                            onClick={() => setSelected('extra')}
                        >
                            <span className="mw-plan-badge">Most popular</span>
                            <div className="mw-plan-col-name">Extra</div>
                            <div className="mw-plan-col-price">
                                CHF {period.extraPrice}{period.priceSuffix}
                                {period.extraStrike && <span className="mw-plan-col-strike">CHF {period.extraStrike}</span>}
                            </div>
                        </div>

                        {PLAN_COMPARISON_ROWS.map((row, i) => {
                            const RowIcon = ROW_ICONS[row.icon];
                            const gridRow = i + 2;
                            return (
                                <React.Fragment key={row.label}>
                                    {row.description ? (
                                        <div
                                            className="mw-plan-row-highlight"
                                            style={{ gridColumn: 1, gridRow, cursor: 'pointer' }}
                                            onClick={() => setSeasonPassModalOpen(true)}
                                        >
                                            <RowIcon size={18} />
                                            <div>
                                                <p className="mw-plan-row-highlight-title">{row.label}</p>
                                                <p className="mw-plan-row-highlight-text">{row.description}</p>
                                            </div>
                                            <FiInfo className="mw-plan-row-highlight-info" size={17} />
                                        </div>
                                    ) : (
                                        <div className="mw-plan-row-label" style={{ gridColumn: 1, gridRow }}>
                                            <RowIcon size={18} />
                                            {row.label}
                                        </div>
                                    )}
                                    <div className="mw-plan-cell" style={{ gridColumn: 3, gridRow }}>
                                        {row.essentials
                                            ? <span className="mw-plan-mark mw-plan-mark--yes"><FiCheck size={15} strokeWidth={3} /></span>
                                            : <span className="mw-plan-mark mw-plan-mark--no"><FiX size={15} strokeWidth={3} /></span>}
                                    </div>
                                    <div className="mw-plan-cell" style={{ gridColumn: 4, gridRow }}>
                                        {row.extra
                                            ? <span className="mw-plan-mark mw-plan-mark--yes"><FiCheck size={15} strokeWidth={3} /></span>
                                            : <span className="mw-plan-mark mw-plan-mark--no"><FiX size={15} strokeWidth={3} /></span>}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mw-sticky-bar">
                <button className="mw-continue-btn" onClick={() => onContinue(selected, billing)}>Continue</button>
            </div>
        </div>
    );
};

export default MembershipStep2;
