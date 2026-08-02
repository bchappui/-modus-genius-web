import { databases, DATABASE_ID, GIFTCODES_COLLECTION_ID, Query } from './appwrite.js'

// Looks up a code the visitor typed in and checks it against the specific
// card they're trying to unlock — each code is tied to one property, not a
// blanket "unlimited access" grant. Returns { doc } on success, or
// { error: 'invalid' | 'wrong-card' | 'used' } otherwise.
export async function findRedeemableGiftCodeForProperty(code, propertyId, agentId) {
    const trimmed = code.trim();
    if (!trimmed) return { error: 'invalid' };

    const result = await databases.listDocuments(DATABASE_ID, GIFTCODES_COLLECTION_ID, [
        Query.equal('code', trimmed),
        Query.limit(1),
    ]);
    const doc = result.documents[0];
    if (!doc || !doc.active) return { error: 'invalid' };
    if (doc.propertyId !== propertyId) return { error: 'wrong-card' };
    if (doc.redeemedBy && doc.redeemedBy !== agentId) return { error: 'used' };
    return { doc };
}

const GIFT_CODE_ERROR_MESSAGES = {
    invalid: 'Invalid code.',
    'wrong-card': 'This code is for a different card.',
    used: 'This code has already been used.',
};

export const giftCodeErrorMessage = (code) => GIFT_CODE_ERROR_MESSAGES[code] || 'Could not validate code.';

// Marks the code as redeemed by this agent. Returns the code doc (so the
// caller can read its propertyId without a second round-trip).
export async function redeemGiftCode(codeDocId, agentId) {
    return databases.updateDocument(DATABASE_ID, GIFTCODES_COLLECTION_ID, codeDocId, { redeemedBy: agentId });
}

// All property ids this agent has unlocked via gift codes — loaded once at
// login and kept in agentProfile so per-card checks are a local array lookup
// instead of a network round-trip on every card click.
export async function getGiftUnlockedPropertyIds(agentId) {
    if (!agentId) return [];
    const result = await databases.listDocuments(DATABASE_ID, GIFTCODES_COLLECTION_ID, [
        Query.equal('redeemedBy', agentId),
        Query.limit(1000),
    ]);
    return result.documents.map(doc => doc.propertyId).filter(Boolean);
}
