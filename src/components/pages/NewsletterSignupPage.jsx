import React, { useEffect, useRef, useState } from 'react'
import { FiUser } from 'react-icons/fi'
import './ExplorePage.css'
import './SubscribePage.css'
import './NewsletterSignupPage.css'

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

// The original beehiiv newsletter signup page (SubscribePage before it became
// the Membership wizard on 2026-09-10, commit eca527c), restored unchanged.
// Two beehiiv forms for the same newsletter: the original one on desktop, a
// phone-sized design below 640px. Only the one matching the screen is loaded.
const BEEHIIV_FORM_ID = '81460cc6-cd7c-47c9-8bde-1bbd1919adfb';
const BEEHIIV_MOBILE_FORM_ID = 'b362bbb5-53af-4c96-9d1d-7e3647544977';
const PHONE_QUERY = '(max-width: 640px)';

// Waitlist variant (?waitlist=1): same page, no Login button, its own beehiiv
// forms. The "Join waitlist" button text lives in the beehiiv form itself
// (beehiiv draws it), so these must point to forms whose button says that.
const WAITLIST_FORM_ID = 'f31b58b0-b0f7-42c7-a55f-13e287726e69';
const WAITLIST_MOBILE_FORM_ID = '1a08a690-bc3d-42b0-a168-28a3d4515e69';

// After a signup, beehiiv's loader drops a cookie on this site
// (bhv_<publication id>_subscribed) and stops drawing the form for that
// browser. The form must always show, so that cookie is deleted before the
// loader runs. Tried with and without the domain, since how beehiiv sets
// it (www.modusgenius.com or .modusgenius.com) isn't documented.
function forgetBeehiivSubscription() {
    const expired = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    const host = window.location.hostname;
    const domains = ['', `; domain=${host}`, `; domain=${host.replace(/^www\./, '')}`];
    document.cookie.split(';').map(c => c.trim().split('=')[0])
        .filter(name => /^bhv_.*_subscribed$/.test(name))
        .forEach(name => domains.forEach(d => { document.cookie = name + expired + d; }));
}

const NewsletterSignupPage = ({ onBack, onLoginClick, waitlist = false }) => {
    const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
    useEffect(() => {
        const mq = window.matchMedia(PHONE_QUERY);
        const onChange = (e) => setIsPhone(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    const formId = waitlist
        ? (isPhone ? WAITLIST_MOBILE_FORM_ID : WAITLIST_FORM_ID)
        : (isPhone ? BEEHIIV_MOBILE_FORM_ID : BEEHIIV_FORM_ID);

    // beehiiv's loader draws the form right where its <script> tag sits. React
    // moves <script> elements written in JSX into <head>, which put the form
    // there, invisible — so the loader is added here, inside the embed box,
    // and swapped when the screen size switches forms.
    const embedRef = useRef(null);
    useEffect(() => {
        const box = embedRef.current;
        if (!box) return;
        forgetBeehiivSubscription();
        const loader = document.createElement('script');
        loader.async = true;
        loader.src = 'https://subscribe-forms.beehiiv.com/v3/loader.js';
        loader.dataset.beehiivForm = formId;
        box.appendChild(loader);
        return () => box.replaceChildren();
    }, [formId]);

    // Traffic-source (UTM) tracking for both forms, loaded once.
    useEffect(() => {
        const attribution = document.createElement('script');
        attribution.type = 'text/javascript';
        attribution.async = true;
        attribution.src = 'https://subscribe-forms.beehiiv.com/attribution.js';
        document.body.appendChild(attribution);
        return () => attribution.remove();
    }, []);

    return (
        <div className="sp-page nsp-page">
            <button className="sp-logo-btn ep-nav-logo" onClick={onBack} aria-label="Back to Explore">
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="ep-nav-logo-img" />
                <span className="ep-nav-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</span>
            </button>
            {!waitlist && (
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

                <div className="sp-content">
                    <h1 className="sp-headline">
                        Upskill in 10 minutes or less.<br />
                        With the world's best experts.
                    </h1>

                    <p className="sp-subtext">
                        Each week, receive bite-size advice and tools to elevate your business
                        management skills and lead with impact.
                    </p>
                    <p className="sp-subtext">
                        You get <strong>unlimited access to 1000+</strong> practical step-by-step
                        strategies designed and taught by top global experts.
                    </p>

                    <div className="sp-beehiiv-embed" ref={embedRef} />

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

export default NewsletterSignupPage
