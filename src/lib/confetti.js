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
