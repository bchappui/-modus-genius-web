import React from 'react'
import { FiUser } from 'react-icons/fi'
import './ExplorePage.css'
import './SubscribePage.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

// Free-to-use placeholder headshot photos (Pravatar — a public mock-avatar
// service, safe for prototypes/mockups; swap for real subscriber photos later).
const AVATAR_URLS = [
    'https://i.pravatar.cc/96?img=32',
    'https://i.pravatar.cc/96?img=47',
    'https://i.pravatar.cc/96?img=12',
    'https://i.pravatar.cc/96?img=25',
];

const SubscribePage = ({ onBack, onLoginClick }) => {
    return (
        <div className="sp-page">
            <button className="sp-logo-btn ep-nav-logo" onClick={onBack} aria-label="Back to Explore">
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="ep-nav-logo-img" />
                <span className="ep-nav-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</span>
            </button>
            <button className="sp-login-btn" onClick={onLoginClick}>
                <FiUser size={15} />
                Login
            </button>

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

                <div className="sp-content">
                    <h1 className="sp-headline">
                        Upskill in 10 minutes or less.<br />
                        With the world's best experts.
                    </h1>

                    <p className="sp-subtext">
                        Each week, receive bite-size advices and tools to elevate your business
                        management skills and lead with impact.
                    </p>
                    <p className="sp-subtext">
                        You get <strong>unlimited access to 1000+</strong> practical step-by-step
                        strategies designed and taught by top global experts.
                    </p>

                    <div className="sp-beehiiv-embed">
                        <script async src="https://subscribe-forms.beehiiv.com/v3/loader.js" data-beehiiv-form="81460cc6-cd7c-47c9-8bde-1bbd1919adfb" />
                    </div>
                    <script type="text/javascript" async src="https://subscribe-forms.beehiiv.com/attribution.js" />

                    <div className="sp-social-proof">
                        <div className="sp-avatars">
                            {AVATAR_URLS.map((url) => (
                                <img key={url} src={url} alt="" className="sp-avatar" />
                            ))}
                        </div>
                        <div className="sp-proof-text">
                            <span className="sp-stars">★★★★★</span>
                            <span className="sp-subscriber-count">Join 1,000 subscribers</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SubscribePage
