import React, { useState } from 'react'
import './ExplorePage.css'
import './SubscribePage.css'
import './LoginPage.css'
import './MembershipWizard.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

// Membership wizard, step 3 of 3 — payment details. No mockup was supplied
// for this step and no payment processor is wired up yet (Stripe comes
// later) — this is a placeholder form; Continue activates the plan directly
// in test mode, same as everywhere else in the app.
const MembershipStep3 = ({ onBack, tierLabel, onComplete }) => {
    const [form, setForm] = useState({ name: '', number: '', expiry: '', cvv: '' });
    const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    return (
        <div className="sp-page">
            <button className="sp-logo-btn ep-nav-logo" onClick={onBack} aria-label="Back to Explore">
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="ep-nav-logo-img" />
                <span className="ep-nav-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</span>
            </button>

            <div className="sp-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="mw3-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#mw3-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="mw-step-content">
                    <p className="mw-step-label">Step 3 of 3</p>
                    <h1 className="mw-step-heading">Enter your payment details</h1>
                    <p className="mw-step-subtext">You're seconds away from unlocking {tierLabel}.</p>

                    <div className="lp-form" style={{ maxWidth: 480 }}>
                        <input className="lp-input" placeholder="Name on card" value={form.name} onChange={update('name')} />
                        <input className="lp-input" placeholder="Card number" value={form.number} onChange={update('number')} />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input className="lp-input" placeholder="MM / YY" value={form.expiry} onChange={update('expiry')} />
                            <input className="lp-input" placeholder="CVV" value={form.cvv} onChange={update('cvv')} />
                        </div>
                        <button className="mw-continue-btn" onClick={onComplete}>Complete membership</button>
                        <p className="mw-test-mode-note">
                            Payments aren't live yet — Continue activates {tierLabel} directly (test mode).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MembershipStep3;
