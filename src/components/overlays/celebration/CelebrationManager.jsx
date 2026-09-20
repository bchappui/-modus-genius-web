import React, { useEffect, useRef, useState } from 'react'
import { client, databases, DATABASE_ID, AGENTS_COLLECTION_ID } from '../../../lib/appwrite.js'
import { getLevelQuotas, calculateProgression, getRankForLevel } from '../../../lib/levels.js'
import {
    getUserLeaderboardPositions, getUnlockedQuoteAtLevel, getUnseenUnlockedQuote,
    markQuoteAsSeen, getAgentRoles,
} from '../../../lib/celebration.js'
import { awardLeaderboardBadges, awardDiscoverBadges } from '../../../lib/agents.js'
import RewardsModal from './RewardsModal.jsx'
import LeaderboardModal from './LeaderboardModal.jsx'
import LevelupModal from './LevelupModal.jsx'
import QuoteModal from './QuoteModal.jsx'
import RoleTitleModal from './RoleTitleModal.jsx'
import BadgeModal from './BadgeModal.jsx'
import DiscoverModal from './DiscoverModal.jsx'

// Most recent Monday at 02:00 UTC — mirrors CelebrationManager.tsx's
// getLastMondayAt2hUTC (matches when the Appwrite ranking cron runs).
function getLastMondayAt2hUTC() {
    const now = new Date();
    const day = now.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - diffToMonday);
    d.setUTCHours(2, 0, 0, 0);
    if (d > now) d.setUTCDate(d.getUTCDate() - 7);
    return d;
}

async function getCalculatedLevel(totalHearts, totalStars) {
    const quotas = await getLevelQuotas();
    const progression = calculateProgression(totalHearts, totalStars, quotas.hearts, quotas.stars);
    return progression.globalLevel;
}

// Mirrors CelebrationManager.tsx's buildAndEnqueue — same event ordering
// (rewards always first, then rank/role/quote only if they actually changed).
async function buildAndEnqueue(userId, newLevel, prevLevel, agentData, enqueue, prevHearts, prevStars) {
    const totalHearts = agentData.totalHearts ?? 0;
    const totalStars = agentData.totalStars ?? 0;

    let trigger = null;
    if (prevHearts !== undefined && prevStars !== undefined) {
        const heartsGrew = totalHearts > prevHearts;
        const starsGrew = totalStars > prevStars;
        if (starsGrew && !heartsGrew) trigger = 'stars';
        else if (heartsGrew && !starsGrew) trigger = 'hearts';
    } else {
        const quotas = await getLevelQuotas();
        if (calculateProgression(Math.max(0, totalHearts - 1), totalStars, quotas.hearts, quotas.stars).globalLevel === prevLevel) {
            trigger = 'hearts';
        } else if (calculateProgression(totalHearts, Math.max(0, totalStars - 1), quotas.hearts, quotas.stars).globalLevel === prevLevel) {
            trigger = 'stars';
        }
    }

    const [newRank, prevRank, unlockedQuote, agentRoles] = await Promise.all([
        getRankForLevel(newLevel),
        prevLevel > 0 ? getRankForLevel(prevLevel) : Promise.resolve(null),
        getUnlockedQuoteAtLevel(userId, newLevel),
        getAgentRoles(userId),
    ]);

    const prevRolesJson = localStorage.getItem(`prev_roles_${userId}`);
    const prevRoles = prevRolesJson ? JSON.parse(prevRolesJson) : { likesRole: null, starsRole: null };

    const events = [];

    events.push({ type: 'rewards', newLevel, totalHearts, totalStars, heartsNeeded: null, starsNeeded: null, trigger });

    if (newRank && (!prevRank || newRank.rankName !== prevRank.rankName)) {
        events.push({ type: 'levelup', previousLevel: prevLevel, newLevel, rankName: newRank.rankName, tier: newRank.tier, imageUrl: newRank.imageUrl });
    }

    const rolesChanged = agentRoles.likesRole !== prevRoles.likesRole || agentRoles.starsRole !== prevRoles.starsRole;
    if (rolesChanged && (agentRoles.likesRole || agentRoles.starsRole)) {
        events.push({ type: 'role', likesRole: agentRoles.likesRole, starsRole: agentRoles.starsRole });
        localStorage.setItem(`prev_roles_${userId}`, JSON.stringify(agentRoles));
    }

    if (unlockedQuote) {
        events.push({ type: 'quote', quoteId: unlockedQuote.$id, text: unlockedQuote.text, author: unlockedQuote.author, category: unlockedQuote.category });
    }

    if (events.length > 0) enqueue(events);
}

// Mirrors modus_genius/components/celebration/CelebrationManager.tsx — mount
// once near the app root (alongside the other always-mounted overlays in
// App.jsx). Renders nothing until a celebration event is queued.
const CelebrationManager = ({ agentId, onOpenQuote, onOpenProperty, onOpenRanks }) => {
    const [queue, setQueue] = useState([]);
    const [avatar, setAvatar] = useState('');
    const celebratingRef = useRef(false);

    const enqueue = (events) => setQueue(q => [...q, ...events]);
    const dismiss = () => setQueue(q => q.slice(1));

    useEffect(() => { if (queue.length === 0) celebratingRef.current = false; }, [queue.length]);

    useEffect(() => {
        if (!agentId) return;
        databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId)
            .then(doc => setAvatar(doc.avatar || ''))
            .catch(() => {});
    }, [agentId]);

    // Mount check: celebrate any level-up that happened before this tab was open.
    useEffect(() => {
        if (!agentId) return;

        const checkOnMount = async () => {
            try {
                let lastCelebrated = parseInt(localStorage.getItem(`last_celebrated_level_${agentId}`) || '0', 10);
                const lastHeartsStr = localStorage.getItem(`last_celebrated_hearts_${agentId}`);
                const lastStarsStr = localStorage.getItem(`last_celebrated_stars_${agentId}`);
                const lastHearts = lastHeartsStr != null ? parseInt(lastHeartsStr, 10) : undefined;
                const lastStars = lastStarsStr != null ? parseInt(lastStarsStr, 10) : undefined;

                const agentDoc = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId);
                const totalHearts = agentDoc.totalHearts ?? 0;
                const totalStars = agentDoc.totalStars ?? 0;

                localStorage.setItem(`last_known_hearts_${agentId}`, String(totalHearts));
                localStorage.setItem(`last_known_stars_${agentId}`, String(totalStars));

                const calculatedLevel = await getCalculatedLevel(totalHearts, totalStars);

                // Self-heal: if the agent's Appwrite data was reset, our stored value is stale.
                if (calculatedLevel < lastCelebrated) {
                    lastCelebrated = calculatedLevel;
                    localStorage.setItem(`last_celebrated_level_${agentId}`, String(calculatedLevel));
                }

                if (calculatedLevel > lastCelebrated && !celebratingRef.current) {
                    celebratingRef.current = true;
                    localStorage.setItem(`last_celebrated_level_${agentId}`, String(calculatedLevel));
                    localStorage.setItem(`last_celebrated_hearts_${agentId}`, String(totalHearts));
                    localStorage.setItem(`last_celebrated_stars_${agentId}`, String(totalStars));
                    try {
                        await buildAndEnqueue(agentId, calculatedLevel, lastCelebrated, { totalHearts, totalStars }, enqueue, lastHearts, lastStars);
                    } finally {
                        // celebratingRef only needs to guard the async gap while events are
                        // being computed, not the whole time the popups stay on screen — the
                        // localStorage bookkeeping above already prevents re-celebrating the
                        // same level. Resetting here (rather than waiting for the queue to
                        // fully drain) stops one interrupted/unclicked-through celebration
                        // from silently blocking every future one for the rest of the tab.
                        celebratingRef.current = false;
                    }
                }

                try {
                    const unseenQuote = await getUnseenUnlockedQuote(agentId);
                    if (unseenQuote) {
                        await markQuoteAsSeen(unseenQuote.docId);
                        enqueue([{ type: 'quote', quoteId: unseenQuote.quoteId, text: unseenQuote.text, author: unseenQuote.author, category: unseenQuote.category }]);
                    }
                } catch (err) {
                    console.error('CelebrationManager unseen quote check error:', err);
                }
            } catch (err) {
                console.error('CelebrationManager mount check error:', err);
            }
        };

        checkOnMount();
    }, [agentId]);

    // Weekly leaderboard check: once per Monday-2am-UTC window.
    useEffect(() => {
        if (!agentId) return;

        const checkLeaderboard = async () => {
            try {
                const lastMondayAt2h = getLastMondayAt2hUTC();
                const lastSeenStr = localStorage.getItem(`last_leaderboard_seen_${agentId}`);
                const lastSeen = lastSeenStr ? new Date(lastSeenStr) : null;
                if (lastSeen && lastSeen >= lastMondayAt2h) return;

                const positions = await getUserLeaderboardPositions(agentId);
                if (positions.length === 0) return;

                localStorage.setItem(`last_leaderboard_seen_${agentId}`, new Date().toISOString());
                const awarded = await awardLeaderboardBadges(agentId, positions);
                const badgeEvents = awarded.map(b => ({ type: 'badge', ...b }));
                enqueue([{ type: 'leaderboard', positions }, ...badgeEvents]);
            } catch (err) {
                console.error('CelebrationManager leaderboard check error:', err);
            }
        };

        checkLeaderboard();
    }, [agentId]);

    // Daily Discover badge check (Top 10, Most Wanted, Classics, MG Selects).
    useEffect(() => {
        if (!agentId) return;

        const checkDiscoverBadges = async () => {
            try {
                const lastCheckedStr = localStorage.getItem(`last_discover_checked_${agentId}`);
                const lastChecked = lastCheckedStr ? new Date(lastCheckedStr) : null;
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                if (lastChecked && lastChecked > oneDayAgo) return;

                localStorage.setItem(`last_discover_checked_${agentId}`, new Date().toISOString());
                const awarded = await awardDiscoverBadges(agentId);
                const discoverEvents = awarded.map(b => ({ type: 'discover', ...b }));
                if (discoverEvents.length > 0) enqueue(discoverEvents);
            } catch (err) {
                console.error('CelebrationManager discover check error:', err);
            }
        };

        checkDiscoverBadges();
    }, [agentId]);

    // Realtime: catch level-ups that happen while this tab is open.
    useEffect(() => {
        if (!agentId) return;

        const channel = `databases.${DATABASE_ID}.collections.${AGENTS_COLLECTION_ID}.documents.${agentId}`;

        const unsub = client.subscribe(channel, async (response) => {
            const payload = response.payload;
            const totalHearts = payload.totalHearts ?? 0;
            const totalStars = payload.totalStars ?? 0;

            const calculatedLevel = await getCalculatedLevel(totalHearts, totalStars);

            const lastCelebrated = parseInt(localStorage.getItem(`last_celebrated_level_${agentId}`) || '0', 10);
            const knownHeartsStr = localStorage.getItem(`last_known_hearts_${agentId}`);
            const knownStarsStr = localStorage.getItem(`last_known_stars_${agentId}`);
            const lastHearts = knownHeartsStr != null ? parseInt(knownHeartsStr, 10) : undefined;
            const lastStars = knownStarsStr != null ? parseInt(knownStarsStr, 10) : undefined;

            localStorage.setItem(`last_known_hearts_${agentId}`, String(totalHearts));
            localStorage.setItem(`last_known_stars_${agentId}`, String(totalStars));

            if (calculatedLevel <= lastCelebrated || celebratingRef.current) return;

            celebratingRef.current = true;
            localStorage.setItem(`last_celebrated_level_${agentId}`, String(calculatedLevel));
            localStorage.setItem(`last_celebrated_hearts_${agentId}`, String(totalHearts));
            localStorage.setItem(`last_celebrated_stars_${agentId}`, String(totalStars));
            try {
                await buildAndEnqueue(agentId, calculatedLevel, lastCelebrated, { totalHearts, totalStars }, enqueue, lastHearts, lastStars);
            } catch (err) {
                console.error('CelebrationManager realtime buildAndEnqueue error:', err);
            } finally {
                // See the matching comment in the mount-check effect above.
                celebratingRef.current = false;
            }
        });

        return () => { unsub(); };
    }, [agentId]);

    const active = queue[0];
    if (!active) return null;

    if (active.type === 'rewards') return <RewardsModal event={active} onDismiss={dismiss} />;
    if (active.type === 'leaderboard') return <LeaderboardModal event={active} avatar={avatar} onDismiss={dismiss} onOpenRanks={onOpenRanks} />;
    if (active.type === 'levelup') return <LevelupModal event={active} onDismiss={dismiss} />;
    if (active.type === 'quote') return <QuoteModal event={active} onDismiss={dismiss} onOpenQuote={onOpenQuote} />;
    if (active.type === 'role') return <RoleTitleModal event={active} avatar={avatar} onDismiss={dismiss} />;
    if (active.type === 'badge') return <BadgeModal key={`${active.tab}-${active.category}-${active.rank}`} event={active} onDismiss={dismiss} />;
    if (active.type === 'discover') return <DiscoverModal key={`${active.tab}-${active.propertyId}`} event={active} onDismiss={dismiss} onOpenProperty={onOpenProperty} />;

    return null;
};

export default CelebrationManager;
