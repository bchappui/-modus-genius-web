import { getCurrentSeasonKey } from './seasons.js';

// A newly-published card is exclusive to Season Pass holders for this long
// before it opens up to everyone else under their tier's normal rules.
const SEASON_EXCLUSIVITY_MONTHS = 12;

// Prices are placeholders — easy to tweak here without touching any gating
// logic. `premium` intentionally has `visible: false`: the tier already
// exists end-to-end (gating, storage) but isn't offered on the Membership
// page yet — same perks as `extra` until it's differentiated later.
export const MEMBERSHIP_TIERS = {
    free: {
        key: 'free',
        label: 'Free',
        price: 0,
        billingPeriod: null,
        cardsPerMonth: 1,
        includesSeasonPass: false,
        visible: true,
        perks: ['Create an account', 'Browse every page', '1 card per month'],
    },
    essentials: {
        key: 'essentials',
        label: 'Essentials',
        price: 9,
        billingPeriod: 'month',
        cardsPerMonth: 5,
        includesSeasonPass: false,
        visible: true,
        perks: ['5 cards per month', 'Everything in Free'],
    },
    extra: {
        key: 'extra',
        label: 'Extra',
        price: 19,
        billingPeriod: 'month',
        cardsPerMonth: null,
        includesSeasonPass: true,
        visible: true,
        perks: ['Unlimited cards', 'Season Pass included', 'Early access to new cards'],
    },
    premium: {
        key: 'premium',
        label: 'Premium',
        price: 29,
        billingPeriod: 'month',
        cardsPerMonth: null,
        includesSeasonPass: true,
        visible: false,
        perks: ['Unlimited cards', 'Season Pass included', 'Early access to new cards'],
    },
};

export const SEASON_PASS_PRICE = 39.99;

export const VISIBLE_TIERS = Object.values(MEMBERSHIP_TIERS).filter(t => t.visible);

export const getTier = (tierKey) => MEMBERSHIP_TIERS[tierKey] || MEMBERSHIP_TIERS.free;

// Extra/Premium bundle a Season Pass automatically; Free/Essentials only have
// one if they bought it standalone for the season currently in progress.
export const hasSeasonPass = (agentProfile) => {
    const tier = getTier(agentProfile?.membershipTier);
    if (tier.includesSeasonPass) return true;
    return !!agentProfile?.seasonPassSeasonKey && agentProfile.seasonPassSeasonKey === getCurrentSeasonKey();
};

// `publishedAt` (not $createdAt) marks the exclusivity clock's start — a card
// can sit as a draft in Appwrite for a long time before going live, so the
// document's creation date would start the countdown too early. A card with
// no publishedAt yet (not published through this flow) is treated as open,
// not exclusive — safer default than accidentally walling off the catalog.
export const isSeasonExclusive = (property) => {
    if (!property?.publishedAt) return false;
    const cutoff = new Date(property.publishedAt);
    cutoff.setMonth(cutoff.getMonth() + SEASON_EXCLUSIVITY_MONTHS);
    return cutoff > new Date();
};

// Decides whether `agentProfile` can open `property`, assuming gift-code
// unlocks have already been checked by the caller (those bypass membership
// entirely). Returns a reason so the UI can show the right paywall:
//   'ok'                    — go ahead
//   'season-pass-required'  — card is still season-exclusive, no pass held
//   'monthly-limit'         — tier's per-month card quota is used up
export const getPropertyAccessDecision = (agentProfile, property, monthKey) => {
    const tier = getTier(agentProfile?.membershipTier);

    if (isSeasonExclusive(property) && !hasSeasonPass(agentProfile)) {
        return { allowed: false, reason: 'season-pass-required', tier };
    }

    if (tier.cardsPerMonth == null) {
        return { allowed: true, reason: 'ok', tier };
    }

    if (tier.key === 'free') {
        const usedThisMonth = agentProfile?.freeCardMonth === monthKey;
        const sameCard = usedThisMonth && agentProfile?.freeCardPropertyId === property.$id;
        if (!usedThisMonth || sameCard) return { allowed: true, reason: 'ok', tier };
        return { allowed: false, reason: 'monthly-limit', tier };
    }

    // essentials (or any future tier with a numeric cap): up to N distinct
    // cards per month, tracked as an id list rather than a single slot.
    const usedThisMonth = agentProfile?.essentialsCardMonth === monthKey;
    const usedIds = usedThisMonth ? (agentProfile?.essentialsCardPropertyIds || []) : [];
    if (usedIds.includes(property.$id)) return { allowed: true, reason: 'ok', tier };
    if (usedIds.length < tier.cardsPerMonth) return { allowed: true, reason: 'ok', tier };
    return { allowed: false, reason: 'monthly-limit', tier };
};
