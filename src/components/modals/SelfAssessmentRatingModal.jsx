import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

const STAR_PATH = 'M50 4 L62 38 L98 38 L69 59 L80 94 L50 73 L20 94 L31 59 L2 38 L38 38 Z';

// "Do you find your personality report useful?" — shown once while the
// results are scrolled (see SelfAssessmentResults). Same panel/logo/
// headline styles as the other pop-ups (ExitIntentModal). Portalled to
// <body> so no ancestor stacking context can hide it.
const SelfAssessmentRatingModal = ({ onRate, onClose }) => {
    const [hovered, setHovered] = useState(0);
    const [rated, setRated] = useState(0);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // After a rating, show the thank-you for a moment, then close.
    useEffect(() => {
        if (!rated) return;
        const t = setTimeout(onClose, 1600);
        return () => clearTimeout(t);
    }, [rated, onClose]);

    const handleRate = (n) => {
        if (rated) return;
        setRated(n);
        onRate?.(n);
    };

    const lit = rated || hovered;

    return createPortal(
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel sar-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />
                <p className="eim-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</p>

                {rated ? (
                    <h3 className="eim-headline sar-thanks">Thank you!</h3>
                ) : (
                    <>
                        <p className="eim-eyebrow">Do you find your<br />personality report useful?</p>
                        <h3 className="eim-headline">A 5-star rating would mean a lot to us!</h3>
                    </>
                )}

                <div className="sar-stars" role="radiogroup" aria-label="Rate your personality report" onMouseLeave={() => setHovered(0)}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <button
                            key={n}
                            className={`sar-star${n <= lit ? ' sar-star--lit' : ''}`}
                            role="radio"
                            aria-checked={rated === n}
                            aria-label={`${n} star${n > 1 ? 's' : ''}`}
                            onMouseEnter={() => !rated && setHovered(n)}
                            onClick={() => handleRate(n)}
                        >
                            <svg viewBox="0 0 100 100"><path d={STAR_PATH} /></svg>
                        </button>
                    ))}
                </div>

                {!rated && (
                    <>
                        <div className="sar-hint" aria-hidden="true">
                            <span className="sar-hint-text">Click here!</span>
                            <svg className="sar-hint-arrow" viewBox="0 0 260 60" preserveAspectRatio="none">
                                <defs>
                                    <marker id="sar-arrow-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                                        <path d="M0 0 L10 5 L0 10 z" />
                                    </marker>
                                </defs>
                                <path d="M4 52 C 120 54, 210 44, 252 6" markerEnd="url(#sar-arrow-head)" />
                            </svg>
                        </div>
                        <button className="sar-later" onClick={onClose}>No, maybe later</button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default SelfAssessmentRatingModal;
