// Calendar-quarter season boundaries (UTC) — shared between GeniusPage's
// "Season" leaderboard tab and the membership Season Pass, so both agree on
// where one season ends and the next begins.
export function getSeasonStart(now = new Date()) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    let startMonth = 0;
    if (month >= 3 && month < 6) startMonth = 3;
    else if (month >= 6 && month < 9) startMonth = 6;
    else if (month >= 9) startMonth = 9;
    return new Date(Date.UTC(year, startMonth, 1));
}

export function getNextSeasonEnd(now = new Date()) {
    const start = getSeasonStart(now);
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 1));
}

// "YYYY-Qn", e.g. "2026-Q3" — the unit a Season Pass is sold/valid for.
export function getCurrentSeasonKey(now = new Date()) {
    const start = getSeasonStart(now);
    const quarter = start.getUTCMonth() / 3 + 1;
    return `${start.getUTCFullYear()}-Q${quarter}`;
}
