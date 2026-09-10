import React from 'react'
import { FiUser, FiCheck } from 'react-icons/fi'
import './ExplorePage.css'
import './SubscribePage.css'
import { VISIBLE_TIERS, SEASON_PASS_PRICE, hasSeasonPass, getTier } from '../../lib/membership.js'
import { getCurrentSeasonKey } from '../../lib/seasons.js'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

const SubscribePage = ({ onBack, onLoginClick, isLoggedIn, agentProfile, onSelectTier, onBuySeasonPass, onCancelSeasonPass }) => {
    const currentTierKey = agentProfile?.membershipTier || 'free';
    const seasonPassActive = hasSeasonPass(agentProfile);
    const seasonPassBundled = getTier(currentTierKey).includesSeasonPass;

    return (
        <div className="sp-page">
            <button className="sp-logo-btn ep-nav-logo" onClick={onBack} aria-label="Back to Explore">
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="ep-nav-logo-img" />
                <span className="ep-nav-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</span>
            </button>
            {!isLoggedIn && (
                <button className="sp-login-btn" onClick={onLoginClick}>
                    <FiUser size={15} />
                    Login
                </button>
            )}

            <div className="sp-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="sp-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#sp-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="sp-content sp-content--plans">
                    <h1 className="sp-headline">Choose your membership</h1>
                    <p className="sp-subtext">
                        Pick the plan that fits how much you want to learn — upgrade, downgrade,
                        or add a Season Pass any time.
                    </p>

                    <div className="sp-plans-grid">
                        {VISIBLE_TIERS.map(tier => {
                            const isCurrent = isLoggedIn && currentTierKey === tier.key;
                            return (
                                <div key={tier.key} className={`sp-plan-card${tier.key === 'extra' ? ' sp-plan-card--featured' : ''}`}>
                                    {tier.key === 'extra' && <span className="sp-plan-badge">Best value</span>}
                                    <h3 className="sp-plan-name">{tier.label}</h3>
                                    <p className="sp-plan-price">
                                        {tier.price === 0 ? 'Free' : <>${tier.price}<span className="sp-plan-period">/{tier.billingPeriod}</span></>}
                                    </p>
                                    <ul className="sp-plan-perks">
                                        {tier.perks.map(perk => (
                                            <li key={perk}><FiCheck size={14} /> {perk}</li>
                                        ))}
                                    </ul>
                                    <button
                                        className="sp-plan-btn"
                                        disabled={isCurrent}
                                        onClick={() => isLoggedIn ? onSelectTier(tier.key) : onLoginClick()}
                                    >
                                        {isCurrent ? 'Current plan' : isLoggedIn ? `Choose ${tier.label}` : 'Log in to subscribe'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="sp-season-pass-card">
                        <div>
                            <h3 className="sp-plan-name">Season Pass</h3>
                            <p className="sp-season-pass-text">
                                Early access to every new card for {getCurrentSeasonKey()} — no membership required.
                                Included automatically with Extra.
                            </p>
                        </div>
                        <button
                            className="sp-plan-btn sp-plan-btn--outline"
                            disabled={isLoggedIn && seasonPassBundled}
                            onClick={() => {
                                if (!isLoggedIn) return onLoginClick();
                                if (seasonPassActive) return onCancelSeasonPass();
                                return onBuySeasonPass();
                            }}
                        >
                            {!isLoggedIn ? 'Log in to buy'
                                : seasonPassBundled ? 'Included in your plan'
                                : seasonPassActive ? 'Active this season — cancel'
                                : `Buy for $${SEASON_PASS_PRICE.toFixed(2)}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SubscribePage
