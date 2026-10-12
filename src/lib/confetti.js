import confetti from 'canvas-confetti';

// Web equivalent of react-native-confetti-cannon's { count:150, origin:{x:center,y:top},
// autoStart, fadeOut, explosionSpeed:350, fallSpeed:9000 } used by the mobile app's
// Levelup/Badge/Discover/Leaderboard celebration popups — same "burst from top, fall
// down and fade" effect, adapted to canvas-confetti's own particle-physics API.
export function fireCelebrationConfetti() {
    confetti({
        particleCount: 150,
        startVelocity: 45,
        spread: 100,
        gravity: 0.55,
        ticks: 300,
        origin: { x: 0.5, y: 0 },
        colors: ['#f6cf81', '#c9972c', '#0d55a7', '#4178bc', '#ffffff'],
        zIndex: 5001,
    });
}

// Full-page variant (SelfAssessmentPage's congratulations step): bigger,
// multicolour pieces raining across the whole width for about a second,
// instead of a single gold/blue burst from the top centre.
const RAINBOW_COLORS = ['#e8412c', '#f5941f', '#f7d038', '#6fbf4a', '#29c3c8', '#3f8ce8', '#9b6fe0', '#e15fc0', '#ffffff'];

let fullPageRaf = null;

export function fireFullPageConfetti() {
    const end = Date.now() + 1200;
    const frame = () => {
        confetti({
            particleCount: 3,
            angle: 270,
            startVelocity: 35,
            spread: 90,
            gravity: 1.4,
            drift: Math.random() - 0.5,
            ticks: 220,
            scalar: 1.8,
            origin: { x: Math.random(), y: -0.1 },
            // canvas-confetti assigns colours in list order, so with only a few
            // pieces per burst we'd only ever get the first few — shuffle each time.
            colors: [...RAINBOW_COLORS].sort(() => Math.random() - 0.5),
            zIndex: 5001,
        });
        fullPageRaf = Date.now() < end ? requestAnimationFrame(frame) : null;
    };
    frame();
}

// Stops the rain and clears every piece still on screen (e.g. when leaving
// the step that fired it).
export function stopConfetti() {
    if (fullPageRaf) cancelAnimationFrame(fullPageRaf);
    fullPageRaf = null;
    confetti.reset();
}

// Badge earned (SelfAssessmentBadge): two rainbow bursts out of the badge,
// up-left and up-right, from `origin` (0-1 viewport coordinates).
export function fireBadgeConfetti(origin = { x: 0.5, y: 0.5 }) {
    const burst = (angle) => confetti({
        particleCount: 90,
        angle,
        spread: 70,
        startVelocity: 55,
        gravity: 0.9,
        ticks: 260,
        scalar: 1.2,
        origin,
        colors: RAINBOW_COLORS,
        zIndex: 5001,
    });
    burst(60);
    burst(120);
}
