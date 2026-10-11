import { ID } from 'appwrite';
import { databases, DATABASE_ID, Query } from './appwrite.js';

// Learning Track progress: when each card of a deck was first read.
// Card 0 is always open; card i unlocks UNLOCK_DELAY_MS after card i-1 was
// read (see getCardStates).
//
// Appwrite collection "deck_progress" (id 6acabfb2001335c60706):
//   agentId  string(64)            — the reader (agents.$id)
//   deckId   string(128)           — learning plan deck id, e.g. "INTJ-strengths"
//   readAt   string(64), array     — ISO date each card was first read, by index
//   unlockedAll  boolean (optional) — "Unlock All Cards Now" used: every card
//                open, reward forfeited (also kept locally if the attribute
//                doesn't exist yet)
//   permissions: users can create; document-level read/update for its owner
// Until it exists (or when logged out), progress falls back to localStorage.
const DECK_PROGRESS_COLLECTION_ID = '6acabfb2001335c60706';

export const UNLOCK_DELAY_MS = 24 * 60 * 60 * 1000;

const localKey = (agentId, deckId) => `deckProgress:${agentId || 'guest'}:${deckId}`;

function readLocal(agentId, deckId) {
    try { return JSON.parse(localStorage.getItem(localKey(agentId, deckId))) || []; } catch (e) { return []; }
}
function writeLocal(agentId, deckId, readAt) {
    try { localStorage.setItem(localKey(agentId, deckId), JSON.stringify(readAt)); } catch (e) { /* storage unavailable */ }
}
const readLocalUnlockedAll = (agentId, deckId) => {
    try { return localStorage.getItem(`${localKey(agentId, deckId)}:all`) === '1'; } catch (e) { return false; }
};
const writeLocalUnlockedAll = (agentId, deckId) => {
    try { localStorage.setItem(`${localKey(agentId, deckId)}:all`, '1'); } catch (e) { /* storage unavailable */ }
};

async function findDoc(agentId, deckId) {
    const res = await databases.listDocuments(DATABASE_ID, DECK_PROGRESS_COLLECTION_ID, [
        Query.equal('agentId', agentId),
        Query.equal('deckId', deckId),
        Query.limit(1),
    ]);
    return res.documents[0] || null;
}

// → { readAt: [...], unlockedAll: bool }
export async function getDeckProgress(agentId, deckId) {
    const localAll = readLocalUnlockedAll(agentId, deckId);
    if (!agentId) return { readAt: readLocal(agentId, deckId), unlockedAll: localAll };
    try {
        const doc = await findDoc(agentId, deckId);
        return { readAt: doc?.readAt || [], unlockedAll: !!doc?.unlockedAll || localAll };
    } catch (e) {
        console.warn('deck_progress unavailable — using local progress', e?.message);
        return { readAt: readLocal(agentId, deckId), unlockedAll: localAll };
    }
}

// Starts a deck over: removes its progress (local copy and Appwrite row).
// Used by the dev-only ?saReset=1 preview link.
export async function resetDeckProgress(agentId, deckId) {
    try {
        localStorage.removeItem(localKey(agentId, deckId));
        localStorage.removeItem(`${localKey(agentId, deckId)}:all`);
    } catch (e) { /* storage unavailable */ }
    if (!agentId) return;
    try {
        const doc = await findDoc(agentId, deckId);
        if (doc) await databases.deleteDocument(DATABASE_ID, DECK_PROGRESS_COLLECTION_ID, doc.$id);
    } catch (e) {
        console.warn('deck_progress: could not reset', e?.message);
    }
}

// "Unlock All Cards Now": every card opens straight away, and the deck's
// reward (digital badge) is forfeited.
export async function unlockAllCards(agentId, deckId) {
    writeLocalUnlockedAll(agentId, deckId);
    if (!agentId) return;
    try {
        const doc = await findDoc(agentId, deckId);
        if (doc) await databases.updateDocument(DATABASE_ID, DECK_PROGRESS_COLLECTION_ID, doc.$id, { unlockedAll: true });
        else await databases.createDocument(DATABASE_ID, DECK_PROGRESS_COLLECTION_ID, ID.unique(), { agentId, deckId, readAt: [], unlockedAll: true });
    } catch (e) {
        console.warn('deck_progress: could not save "unlock all" (is the unlockedAll attribute missing?) — kept locally', e?.message);
    }
}

// Records the first read of card `index` (later reads don't move the clock).
// Returns the updated readAt array.
export async function markCardRead(agentId, deckId, index, current = []) {
    if (current[index]) return current;
    const readAt = [...current];
    readAt[index] = new Date().toISOString();
    // Arrays can't hold gaps in Appwrite — fill earlier unread slots with ''.
    for (let i = 0; i < readAt.length; i++) if (readAt[i] == null) readAt[i] = '';

    if (!agentId) { writeLocal(agentId, deckId, readAt); return readAt; }
    try {
        const doc = await findDoc(agentId, deckId);
        if (doc) await databases.updateDocument(DATABASE_ID, DECK_PROGRESS_COLLECTION_ID, doc.$id, { readAt });
        else await databases.createDocument(DATABASE_ID, DECK_PROGRESS_COLLECTION_ID, ID.unique(), { agentId, deckId, readAt });
    } catch (e) {
        console.warn('deck_progress unavailable — saving progress locally', e?.message);
        writeLocal(agentId, deckId, readAt);
    }
    return readAt;
}

// Per card: { unlocked, remainingMs, estimated }. remainingMs is the
// earliest time left before the card can unlock: exact once the previous
// card has been read; otherwise estimated by stacking 24h per card after the
// previous one (assuming each card is read as soon as it unlocks), so the
// countdowns always grow down the track (23h46m, 47h46m, 71h46m…).
export function getCardStates(count, readAt, now = Date.now(), unlockedAll = false) {
    if (unlockedAll) return Array.from({ length: count }, () => ({ unlocked: true, remainingMs: 0, estimated: false }));
    const states = [];
    for (let i = 0; i < count; i++) {
        if (i === 0) { states.push({ unlocked: true, remainingMs: 0, estimated: false }); continue; }
        const prev = readAt[i - 1] ? Date.parse(readAt[i - 1]) : null;
        if (prev) {
            const remainingMs = Math.max(0, prev + UNLOCK_DELAY_MS - now);
            states.push({ unlocked: remainingMs === 0, remainingMs, estimated: false });
        } else {
            states.push({ unlocked: false, remainingMs: states[i - 1].remainingMs + UNLOCK_DELAY_MS, estimated: true });
        }
    }
    return states;
}

export function formatRemaining(ms) {
    const total = Math.ceil(ms / 60000);
    const h = String(Math.floor(total / 60)).padStart(2, '0');
    const m = String(total % 60).padStart(2, '0');
    return `${h}h${m}m`;
}
