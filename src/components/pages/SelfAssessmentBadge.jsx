import React, { useEffect, useRef, useState } from 'react'
import ShareModal from '../modals/ShareModal.jsx'
import { fireBadgeConfetti } from '../../lib/confetti.js'
// Default badge art, used by any deck without its own deck.badge.image: the
// gold shield with the face and an empty ribbon (Appwrite file
// 6acd3859001353c32014, its black background made transparent).
import DEFAULT_BADGE_IMAGE from '../../assets/images/badge-default.webp'

// Badge art size and where the engravings go (image pixels): the deck name
// on the ribbon's front band (centre, tilt, room for the text), and the
// owner's name at the top of the shield, above the face.
const BADGE_W = 1402;
const BADGE_H = 1122;
const RIBBON = { x: 710, y: 857, angle: -6.9, maxWidth: 760, maxFont: 58 };
const OWNER = { x: 704, y: 268, angle: 0, maxWidth: 600, maxFont: 54 };

// Capitals in Cinzel are ~0.78em wide.
const CHAR_WIDTH_EM = 0.78;
const ENGRAVE_FONT = "'Cinzel', 'Times New Roman', serif";
const ENGRAVE_EDGE = 'rgba(255, 236, 170, 0.75)';
const ENGRAVE_DARK = '#3b2504';
const ENGRAVE_LIGHT = '#6b4a10';

const fitFontSize = (spot, text) => Math.min(spot.maxFont, spot.maxWidth / (CHAR_WIDTH_EM * Math.max(text.length, 1)));

// One engraved line, sized to fit its spot: a light copy just below for the
// engraved edge, then the text in dark bronze.
const Engraving = ({ spot, text }) => {
    const upper = text.toUpperCase();
    const textProps = {
        x: spot.x,
        textAnchor: 'middle',
        dominantBaseline: 'central',
        fontFamily: ENGRAVE_FONT,
        fontWeight: 700,
        fontSize: fitFontSize(spot, upper),
    };
    return (
        <g transform={`rotate(${spot.angle} ${spot.x} ${spot.y})`}>
            <text {...textProps} y={spot.y + 3} fill={ENGRAVE_EDGE}>{upper}</text>
            <text {...textProps} y={spot.y} fill="url(#sa-badge-engrave)">{upper}</text>
        </g>
    );
};

// The badge with the deck name engraved on its ribbon and the owner's name
// above the face (an SVG, so the text scales with the image).
const BadgeArt = ({ image, label, owner }) => (
    <svg className="sa-badge-art" viewBox={`0 0 ${BADGE_W} ${BADGE_H}`} role="img" aria-label={`${label} badge`}>
        <defs>
            <linearGradient id="sa-badge-engrave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ENGRAVE_DARK} />
                <stop offset="100%" stopColor={ENGRAVE_LIGHT} />
            </linearGradient>
        </defs>
        <image href={image} width={BADGE_W} height={BADGE_H} />
        <Engraving spot={RIBBON} text={label} />
        {owner && <Engraving spot={OWNER} text={owner} />}
    </svg>
);

// The shareable picture: the same badge and engravings drawn on a canvas,
// centred on the site's dark blue (a transparent PNG turns black or white
// depending on the app it's posted to). Resolves to a PNG File.
const SHARE_PAD = 120;
async function renderBadgePng({ image, label, owner, fileName }) {
    await document.fonts.load(`700 ${RIBBON.maxFont}px Cinzel`).catch(() => {});
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = BADGE_W + SHARE_PAD * 2;
    canvas.height = BADGE_H + SHARE_PAD * 2;
    const ctx = canvas.getContext('2d');
    const bg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    bg.addColorStop(0, 'rgb(8, 46, 92)');
    bg.addColorStop(1, 'rgb(2, 18, 38)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(SHARE_PAD, SHARE_PAD);
    ctx.drawImage(img, 0, 0, BADGE_W, BADGE_H);
    const engrave = (spot, text) => {
        const upper = text.toUpperCase();
        const size = fitFontSize(spot, upper);
        ctx.save();
        ctx.translate(spot.x, spot.y);
        ctx.rotate((spot.angle * Math.PI) / 180);
        ctx.font = `700 ${size}px ${ENGRAVE_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ENGRAVE_EDGE;
        ctx.fillText(upper, 0, 3);
        const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
        fill.addColorStop(0, ENGRAVE_DARK);
        fill.addColorStop(1, ENGRAVE_LIGHT);
        ctx.fillStyle = fill;
        ctx.fillText(upper, 0, 0);
        ctx.restore();
    };
    engrave(RIBBON, label);
    if (owner) engrave(OWNER, owner);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return new File([blob], fileName, { type: 'image/png' });
}

const slug = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Page shown once a deck's final reward is claimed (after the "Creating
// your digital badge…" loader): congratulations with the reader's name, the
// badge with the deck name on its ribbon (confetti bursting out of it), and
// Share — the cards' share pop-up, plus the badge picture to share or download.
const SelfAssessmentBadge = ({ deck, agentName, agentSurname }) => {
    const owner = [agentName, agentSurname].filter(Boolean).join(' ');
    const image = deck.badge?.image || DEFAULT_BADGE_IMAGE;
    const label = deck.badge?.name || deck.name;
    const [shareOpen, setShareOpen] = useState(false);
    // Rendered up front so "Share image" can open the system share sheet
    // straight from the click (browsers require it to follow a user gesture).
    const [badgeFile, setBadgeFile] = useState(null);
    const artRef = useRef(null);

    useEffect(() => {
        const rect = artRef.current?.getBoundingClientRect();
        fireBadgeConfetti(rect ? {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight,
        } : undefined);
    }, []);

    useEffect(() => {
        let cancelled = false;
        renderBadgePng({ image, label, owner, fileName: `modus-genius-${slug(label) || 'badge'}-badge.png` })
            .then(file => { if (!cancelled) setBadgeFile(file); })
            .catch(e => console.error('Badge: could not render the picture', e));
        return () => { cancelled = true; };
    }, [image, label, owner]);

    return (
        <section className="sa-congrats sa-badge-page">
            <h1 className="ep-headline sa-badge-title">
                {agentName ? `Congratulations ${agentName}!` : 'Congratulations!'}
            </h1>
            <p className="ep-subtext sa-badge-text">You earned your {deck.name} badge.</p>
            <div ref={artRef} className="sa-badge-art-wrap">
                <BadgeArt image={image} label={label} owner={owner} />
            </div>
            <button className="sa-continue-btn sa-badge-share" onClick={() => setShareOpen(true)}>Share</button>
            {shareOpen && (
                <ShareModal
                    title="Share your badge"
                    imageFile={badgeFile}
                    shareText={`I earned the ${label} badge on Modus Genius!`}
                    // Links to the free self-assessment (?selfassessment=1, see App.jsx).
                    id="1"
                    paramName="selfassessment"
                    name={`${deck.name} badge`}
                    onClose={() => setShareOpen(false)}
                />
            )}
        </section>
    );
};

export default SelfAssessmentBadge;
