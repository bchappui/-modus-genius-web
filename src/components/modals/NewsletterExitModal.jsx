import React, { useState, useEffect } from 'react'
import { FiX, FiArrowRight } from 'react-icons/fi'
import './ExitIntentModal.css'
import '../pages/LoginPage.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

// No real card art for this promo slot yet — same placeholder-gradient
// convention as ExitIntentModal's own PACK_CARDS.
const PACK_CARDS = [
    'linear-gradient(160deg, rgb(230,90,120) 0%, rgb(120,60,140) 100%)',
    'linear-gradient(160deg, rgb(60,190,170) 0%, rgb(30,90,120) 100%)',
    'linear-gradient(160deg, rgb(90,110,220) 0%, rgb(40,40,110) 100%)',
];

// Counts down to local midnight — matches the "ends tonight" copy below.
function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Exit-intent promo shown everywhere except Subscribe/Favorites/ThanksArchive
// (see App.jsx) — a straight discount pitch rather than a "you're blocked" paywall.
const NewsletterExitModal = ({ onClose, onGetStarted }) => {
    const [email, setEmail] = useState('');
    const [countdown, setCountdown] = useState('');

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
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />
                <p className="eim-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</p>

                <p className="eim-eyebrow">Limited time offer</p>
                <p className="nlm-countdown">Ends in {countdown}</p>
                <h3 className="eim-headline">Up to 60% off your first purchase</h3>

                <p className="eim-subtext">
                    1000+ cards from the world's biggest experts, all in one place.
                </p>

                <div className="eim-cards-row">
                    <span className="eim-cards-divider" aria-hidden="true" />
                    {PACK_CARDS.map((gradient, i) => (
                        <div key={i} className="eim-card" style={{ background: gradient }} />
                    ))}
                    <span className="eim-cards-divider" aria-hidden="true" />
                </div>

                <input
                    className="lp-input"
                    style={{ marginBottom: 12 }}
                    type="email"
                    placeholder="Your Email Address..."
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />

                <button className="eim-redeem-btn" onClick={() => onGetStarted(email)}>
                    Get Started <FiArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default NewsletterExitModal;
