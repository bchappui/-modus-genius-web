import { databases, DATABASE_ID, AGENTS_COLLECTION_ID, Query } from './appwrite.js';
import { COUNTRY_COORDS } from './countryCoords.js';

// Community world map: Extra/Premium members who set a country (agents.Location,
// the Edit Profile picker), shown and ordered by Genius Season rank; gold
// badges (lib/houses.js getGoldBadges) are listed in the country list.
const MAP_TIERS = ['extra', 'premium'];

// Genius "Season" leaderboard — same agent_rankings docs the Genius page and
// the app's ranks screen read (tab 'Season', overall category 'Genius');
// rank = position by score, as there. Returns Map<agentId, rank>.
async function getSeasonRanks() {
    const ranks = new Map();
    try {
        let offset = 0;
        for (;;) {
            const res = await databases.listDocuments(DATABASE_ID, 'agent_rankings', [
                Query.equal('tab', 'Season'),
                Query.equal('category', 'Genius'),
                Query.orderDesc('score'),
                Query.limit(100),
                Query.offset(offset),
            ]);
            res.documents.forEach(d => { if (d.agentId && !ranks.has(d.agentId)) ranks.set(d.agentId, ranks.size + 1); });
            offset += res.documents.length;
            if (res.documents.length < 100) break;
        }
    } catch (error) {
        console.error('getSeasonRanks error:', error);
    }
    return ranks;
}

async function listMapAgents() {
    let docs = [];
    let offset = 0;
    for (;;) {
        const res = await databases.listDocuments(DATABASE_ID, AGENTS_COLLECTION_ID, [
            Query.equal('membershipTier', MAP_TIERS),
            Query.isNotNull('Location'),
            Query.select(['$id', 'name', 'avatar', 'Location']),
            Query.limit(100),
            Query.offset(offset),
        ]);
        docs = docs.concat(res.documents);
        offset += res.documents.length;
        if (res.documents.length < 100) break;
    }
    return docs;
}

// Best Genius Season rank first, unranked members after (by name).
const bySeasonRank = (x, y) => (x.seasonRank ?? Infinity) - (y.seasonRank ?? Infinity) || x.name.localeCompare(y.name);

// Groups members by country, keeping bySeasonRank order inside each.
function groupByCountry(members) {
    const byCountry = new Map();
    members.forEach(m => {
        if (!byCountry.has(m.country)) byCountry.set(m.country, []);
        byCountry.get(m.country).push(m);
    });
    return byCountry;
}

// Returns { byCountry: Map<code, member[]>, members: member[] }, each member
// { $id, name, avatar, country, badges, seasonRank }. Inside each country
// members are sorted by Genius Season rank — who shows first when space runs
// out; seasonRank is null if they're not ranked this season.
export async function getMapMembers(badges) {
    try {
        const [agents, seasonRanks] = await Promise.all([listMapAgents(), getSeasonRanks()]);
        const perAgent = new Map();
        (badges || []).forEach(b => perAgent.set(b.agentId, (perAgent.get(b.agentId) || 0) + 1));

        const members = agents
            .filter(a => a.Location && COUNTRY_COORDS[a.Location])
            .map(a => ({
                $id: a.$id, name: a.name || 'Member', avatar: a.avatar || '', country: a.Location,
                badges: perAgent.get(a.$id) || 0, seasonRank: seasonRanks.get(a.$id) || null,
            }))
            .sort(bySeasonRank);

        return { byCountry: groupByCountry(members), members };
    } catch (error) {
        console.error('getMapMembers error:', error);
        return { byCountry: new Map(), members: [] };
    }
}

// Dev-only sample data (WorldMap's "Demo" button, never in production builds):
// ~300 fake members spread over real countries, reusing the real members'
// photos, so the overflow / "+X" behaviour can be seen without real data.
export function makeDemoMembers(realMembers) {
    const codes = ['US', 'US', 'US', 'FR', 'FR', 'CH', 'CH', 'DE', 'GB', 'GB', 'IT', 'ES', 'BR', 'BR', 'IN', 'IN', 'CN', 'JP', 'CA', 'AU', 'MX', 'NG', 'ZA', 'KE', 'EG', 'RU', 'TR', 'AR', 'SE', 'PL', 'NL', 'BE', 'PT', 'MA', 'SG', 'KR', 'ID', 'AE'];
    const avatars = realMembers.map(m => m.avatar).filter(Boolean);
    const members = Array.from({ length: 300 }, (_, i) => ({
        $id: realMembers[i % Math.max(1, realMembers.length)]?.$id || `demo-${i}`,
        _key: `demo-${i}`,
        name: `Demo ${i + 1}`,
        avatar: avatars.length ? avatars[i % avatars.length] : '',
        country: codes[(i * 7) % codes.length],
        badges: 0,
        seasonRank: i < 220 ? i + 1 : null,
    })).sort(bySeasonRank);
    return { byCountry: groupByCountry(members), members, demo: true };
}
