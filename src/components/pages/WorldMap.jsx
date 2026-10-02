import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo'
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom'
import { select } from 'd3-selection'
import { feature } from 'topojson-client'
import { FiPlus, FiMinus, FiMaximize, FiX, FiUser, FiChevronLeft, FiChevronRight, FiChevronDown } from 'react-icons/fi'
import { FaStar } from 'react-icons/fa'
import { MdChatBubble } from 'react-icons/md'
import AgentProfileCard from '../overlays/AgentProfileCard.jsx'
import Spinner from '../shared/Spinner.jsx'
import { COUNTRY_COORDS } from '../../lib/countryCoords.js'
import { COUNTRIES, getFlagImageUrl } from '../../lib/countries.js'
import { getMapMembers, makeDemoMembers } from '../../lib/memberMap.js'
import { getMapQuestions } from '../../lib/questionMap.js'
import { ICON_GOLD_CHECK_URL, CATEGORY_IMAGE, SORTS } from './CommunityShared.jsx'
import './WorldMap.css'

const W = 960;
const H = 470;
const R = 16;            // diamond half-diagonal, screen px (constant at every zoom)
const SLOT = 52;         // distance between markers of the same country
const MAX_ZOOM = 14;

const COUNTRY_NAME = Object.fromEntries(COUNTRIES.map(c => [c.code, c.name]));

// The two maps the side arrows switch between.
const MAPS = [
    { key: 'members', title: 'Members Around the World' },
    { key: 'questions', title: 'Questions Around the World' },
];

// Slots around a country's anchor: centre, then a ring of 6, then a ring of 12.
// Rings start on the right (angle 0), so with one photo the "+X" marker sits
// beside it like in the mockup instead of on top of its label.
const SLOTS = (() => {
    const out = [[0, 0]];
    [[6, 1], [12, 2]].forEach(([n, ring]) => {
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            out.push([Math.cos(a) * SLOT * ring, Math.sin(a) * SLOT * ring]);
        }
    });
    return out;
})();

// How many markers a country may show at zoom k (more room as you zoom in).
const capacityAt = (k) => (k < 1.8 ? 1 : k < 3 ? 2 : k < 4.5 ? 4 : k < 7 ? 7 : SLOTS.length - 1); // last slot kept for "+X"

// Question marker — the shield from the "map" mockup: flat top, straight
// sides, pointed bottom, gold "?" inside.
const SHIELD_W = 14;
const SHIELD_H = 18;
const SHIELD = `${-SHIELD_W},${-SHIELD_H} ${SHIELD_W},${-SHIELD_H} ${SHIELD_W},${SHIELD_H * 0.42} 0,${SHIELD_H} ${-SHIELD_W},${SHIELD_H * 0.42}`;
const ROTATE_MS = 5000;

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const Overlay = ({ children }) => createPortal(children, document.body);

// `readOnly` (locked Community page, no Extra): a preview you can zoom and
// drag but not click — no profiles / questions / country lists, no menu,
// arrows, filters or auto-rotation. `onPreviewClick` runs on a click on it. `only` limits it
// to one map ('members' | 'questions').
const WorldMap = ({ badges, agentId, viewerMembershipTier, onShowSubscribe, onOpenAsk, readOnly = false, only = null, onPreviewClick }) => {
    const maps = only ? MAPS.filter(m => m.key === only) : MAPS;
    const svgRef = useRef(null);
    const zoomRef = useRef(null);
    const [land, setLand] = useState(null);
    const [mapIndex, setMapIndex] = useState(0);
    const mode = maps[mapIndex].key;
    const [menuOpen, setMenuOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const menuRef = useRef(null);
    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [menuOpen]);

    // Members map data. Dev-only: sample members to preview crowded countries.
    const [members, setMembers] = useState(null);
    const [demo, setDemo] = useState(false);
    const memberData = useMemo(() => (demo && members ? makeDemoMembers(members.members) : members), [demo, members]);

    // Questions map data, cached per sort (New / Unanswered / Popular).
    const [sort, setSort] = useState('new');
    const [questions, setQuestions] = useState({});

    const [t, setT] = useState(zoomIdentity);
    const tRef = useRef(zoomIdentity);
    useEffect(() => { tRef.current = t; }, [t]);
    const [profileId, setProfileId] = useState(null);
    const [countryOpen, setCountryOpen] = useState(null);

    const projection = useMemo(() => geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' }), []);
    const path = useMemo(() => geoPath(projection), [projection]);
    const graticule = useMemo(() => path(geoGraticule10()), [path]);

    // Country outlines (~100 KB) only load when the map is shown.
    useEffect(() => {
        let cancelled = false;
        import('world-atlas/countries-110m.json').then(mod => {
            if (cancelled) return;
            const topo = mod.default || mod;
            const countries = feature(topo, topo.objects.countries).features.filter(f => f.id !== '010'); // no Antarctica
            setLand(countries.map(f => ({ id: f.id, d: path(f) })));
        });
        return () => { cancelled = true; };
    }, [path]);

    useEffect(() => {
        if (!badges) return;
        let cancelled = false;
        getMapMembers(badges).then(d => { if (!cancelled) setMembers(d); });
        return () => { cancelled = true; };
    }, [badges]);

    useEffect(() => {
        if (questions[sort]) return;
        let cancelled = false;
        getMapQuestions(sort).then(d => { if (!cancelled) setQuestions(prev => ({ ...prev, [sort]: d })); });
        return () => { cancelled = true; };
    }, [sort, questions]);

    useEffect(() => {
        const node = svgRef.current;
        if (!node) return;
        let frame = 0;
        let latest = null;
        const z = d3zoom()
            .scaleExtent([1, MAX_ZOOM])
            .translateExtent([[0, 0], [W, H]])
            .on('zoom', (e) => {
                // One React update per frame, however many wheel events arrive.
                latest = e.transform;
                if (!frame) frame = requestAnimationFrame(() => { frame = 0; setT(latest); });
            });
        zoomRef.current = z;
        // Each map has its own svg (they slide side by side); the zoom follows
        // the visible one and starts from the current view, so both stay in sync.
        select(node).call(z).call(z.transform, tRef.current);
        return () => { cancelAnimationFrame(frame); select(node).on('.zoom', null); };
    }, [land, mapIndex]);

    // Same element across zoom frames, so React skips the ~350 country paths.
    const landLayer = useMemo(() => land && (
        <>
            <g className="wm-land-glow">{land.map((c, i) => <path key={i} d={c.d} />)}</g>
            <g className="wm-land">{land.map((c, i) => <path key={i} d={c.d} />)}</g>
        </>
    ), [land]);

    const zoomBy = (f) => zoomRef.current && select(svgRef.current).call(zoomRef.current.scaleBy, f);
    const resetZoom = () => zoomRef.current && select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);

    // Both maps boil down to: per country, an ordered list of markers
    // { key, avatar, top, label, tooltip, open() } — first ones shown first.
    const memberGroups = useMemo(() => {
        const out = new Map();
        memberData?.byCountry.forEach((list, code) => out.set(code, list.map(m => ({
            key: m._key || m.$id,
            avatar: m.avatar,
            top: m.seasonRank ? `#${m.seasonRank}` : null,
            label: m.name,
            tooltip: `${m.name} — ${COUNTRY_NAME[code] || code}${m.seasonRank ? ` — #${m.seasonRank} Genius Season` : ''}`,
            open: () => setProfileId(m.$id),
            raw: m,
        }))));
        return out;
    }, [memberData]);
    const questionGroups = useMemo(() => {
        const out = new Map();
        questions[sort]?.byCountry.forEach((list, code) => out.set(code, list.map(q => ({
            key: q.$id,
            avatar: q.avatar,
            top: sort === 'popular' ? `★ ${q.stars}` : null,
            label: truncate(q.title, 20),
            tooltip: `${q.title} — ${q.author}, ${COUNTRY_NAME[code] || code}`,
            open: () => onOpenAsk?.(q.$id),
            raw: q,
        }))));
        return out;
    }, [questions, sort, onOpenAsk]);

    const groupsOf = { members: memberGroups, questions: questionGroups };
    const loadingOf = { members: !memberData, questions: !questions[sort] };
    const groups = groupsOf[mode];
    const loading = loadingOf[mode];

    // Markers in screen (svg) space: position follows the zoom, size doesn't.
    const layout = (g) => {
        const cap = capacityAt(t.k);
        const out = [];
        g.forEach((list, code) => {
            const [px, py] = t.apply(projection(COUNTRY_COORDS[code]));
            // `cap` markers (best first), then a "+X" marker in the next slot.
            const shown = list.slice(0, cap);
            shown.forEach((item, i) => out.push({ kind: 'item', key: item.key, x: px + SLOTS[i][0], y: py + SLOTS[i][1], item, order: i }));
            if (list.length > shown.length) {
                const i = shown.length;
                out.push({ kind: 'more', key: `more-${code}`, x: px + SLOTS[i][0], y: py + SLOTS[i][1], code, count: list.length - shown.length, order: i });
            }
        });
        // A country's first markers drawn last, so they sit on top.
        return out.sort((x, y) => y.order - x.order);
    };
    const memberMarkers = useMemo(() => layout(memberGroups), [memberGroups, t, projection]);
    const questionMarkers = useMemo(() => layout(questionGroups), [questionGroups, t, projection]);
    const markersOf = { members: memberMarkers, questions: questionMarkers };

    const countryCount = groups.size;
    const itemCount = [...groups.values()].reduce((n, l) => n + l.length, 0);
    const subtitle = loading
        ? (mode === 'members' ? 'Loading members…' : 'Loading questions…')
        : mode === 'members'
            ? `${itemCount} Extra member${itemCount === 1 ? '' : 's'} in ${countryCount} countr${countryCount === 1 ? 'y' : 'ies'} · #rank = Genius Season`
            : `${itemCount} question${itemCount === 1 ? '' : 's'} from ${countryCount} countr${countryCount === 1 ? 'y' : 'ies'} · placed on the author's country`;
    const emptyText = mode === 'members'
        ? 'No Extra member has set a country yet. Add yours in Edit Profile → Location.'
        : 'No questions here yet for this filter.';

    const switchMap = (delta) => {
        setMapIndex(i => (i + delta + maps.length) % maps.length);
        setCountryOpen(null);
    };
    const pickMap = (i) => { setMapIndex(i); setCountryOpen(null); setMenuOpen(false); };

    // The two maps alternate every 5s — paused while the pointer is on the
    // map (zooming / dragging) or a list, profile or the menu is open.
    // Changing map (arrows / menu) restarts the 5s.
    const paused = readOnly || maps.length < 2 || hovered || menuOpen || !!countryOpen || !!profileId;
    useEffect(() => {
        if (paused) return;
        const id = setTimeout(() => setMapIndex(i => (i + 1) % maps.length), ROTATE_MS);
        return () => clearTimeout(id);
    }, [paused, mapIndex, maps.length]);

    const openList = countryOpen ? (groups.get(countryOpen) || []) : [];

    return (
        <div className={readOnly ? 'wm wm--bare' : 'cmty-panel wm'} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            {/* Read-only preview shows the map alone — no panel, title or subtitle. */}
            {!readOnly && <div className="wm-head">
                <div className="wm-head-main">
                    {readOnly || maps.length < 2 ? (
                        <h2 className="cmty-panel-title wm-title">{maps[mapIndex].title}</h2>
                    ) : (
                    <div className="wm-menu" ref={menuRef}>
                        <button className="wm-menu-toggle" onClick={() => setMenuOpen(o => !o)} aria-haspopup="listbox" aria-expanded={menuOpen}>
                            <h2 className="cmty-panel-title wm-title">{maps[mapIndex].title}</h2>
                            <FiChevronDown size={18} className={`cmty-dropdown-chevron${menuOpen ? ' cmty-dropdown-chevron--open' : ''}`} />
                        </button>
                        {menuOpen && (
                            <div className="cmty-dropdown-menu wm-menu-list" role="listbox">
                                <span className="cmty-dropdown-heading">Choose a map</span>
                                {MAPS.map((m, i) => (
                                    <button
                                        key={m.key}
                                        role="option"
                                        aria-selected={i === mapIndex}
                                        className={`cmty-dropdown-item${i === mapIndex ? ' cmty-dropdown-item--active' : ''}`}
                                        onClick={() => pickMap(i)}
                                    >
                                        <span className="cmty-dropdown-label">{m.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    )}
                    <p className="wm-sub">{subtitle}</p>
                </div>
                {!readOnly && <div className="wm-controls">
                    {import.meta.env.DEV && mode === 'members' && !readOnly && (
                        <button className={`wm-ctrl wm-demo${demo ? ' wm-demo--on' : ''}`} onClick={() => setDemo(d => !d)}
                            title="Development only: preview the map with ~300 sample members">
                            Demo
                        </button>
                    )}
                    <button className="wm-ctrl" onClick={() => zoomBy(1.6)} aria-label="Zoom in"><FiPlus size={16} /></button>
                    <button className="wm-ctrl" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out"><FiMinus size={16} /></button>
                    <button className="wm-ctrl" onClick={resetZoom} aria-label="Reset view"><FiMaximize size={15} /></button>
                </div>}
            </div>}

            {mode === 'questions' && !readOnly && (
                <div className="cmty-sort-row wm-filters">
                    {SORTS.map(s => (
                        <button
                            key={s.key}
                            className={`cmty-pill cmty-pill-btn${sort === s.key ? ' cmty-pill--active' : ''}`}
                            onClick={() => { setSort(s.key); setCountryOpen(null); }}
                        >
                            <img src={CATEGORY_IMAGE['Entrepreneurship & Innovation']} alt="" className="cmty-pill-icon" />
                            <span className="cmty-pill-label">{s.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {demo && mode === 'members' && <p className="wm-demo-banner">Demo data — 300 sample members (development only, not real people)</p>}

            <div className="wm-stage">
                {/* Same arrows as the Home carousel — switch between the maps. */}
                {!readOnly && maps.length > 1 && <>
                <button className="hp-row-arrow wm-arrow wm-arrow--left" onClick={() => switchMap(-1)} aria-label="Previous map">
                    <FiChevronLeft size={22} />
                </button>
                <button className="hp-row-arrow wm-arrow wm-arrow--right" onClick={() => switchMap(1)} aria-label="Next map">
                    <FiChevronRight size={22} />
                </button>
                </>}

                {/* Read-only: a click anywhere on the map (not a drag — d3-zoom
                    swallows the click that ends a drag) runs onPreviewClick. */}
                <div className={`wm-frame${readOnly ? ' wm-frame--static' : ''}`} onClick={readOnly ? onPreviewClick : undefined}>
                    {/* Both maps sit side by side and slide, like the Home carousel. */}
                    <div className="wm-track" style={{ transform: `translateX(-${mapIndex * (100 / maps.length)}%)`, width: `${maps.length * 100}%` }}>
                        {maps.map((pane, paneIndex) => {
                            const paneMode = pane.key;
                            return (
                                <div key={paneMode} className="wm-pane" style={{ width: `${100 / maps.length}%` }} aria-hidden={paneIndex !== mapIndex}>
                                    <svg ref={paneIndex === mapIndex ? svgRef : null} className="wm-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={pane.title}>
                                        <defs>
                                            <clipPath id={`wm-diamond-${paneMode}`}><polygon points={`0,${-R} ${R},0 0,${R} ${-R},0`} /></clipPath>
                                        </defs>

                                        <rect width={W} height={H} className="wm-sea" />
                                        <g transform={t.toString()}>
                                            <path d={graticule} className="wm-graticule" />
                                            {/* Glow = a wide faint stroke under the thin one (an SVG blur
                                                filter here re-renders the whole zoomed map and froze it). */}
                                            {landLayer}
                                        </g>

        {land && !loadingOf[paneMode] && markersOf[paneMode].map(mk => mk.kind === 'item' ? (
                                    <g key={mk.key} className="wm-marker" transform={`translate(${mk.x},${mk.y})`}
                                        onClick={mk.item.open} role="button" tabIndex={0}
                                        onKeyDown={e => { if (e.key === 'Enter') mk.item.open(); }}>
                                        <title>{mk.item.tooltip}</title>
                                        {paneMode === 'questions' ? (
                                            <>
                                                <polygon className="wm-shield" points={SHIELD} />
                                                <text className="wm-shield-q" y={4} textAnchor="middle">?</text>
                                                {mk.item.top && <text className="wm-rank" y={-SHIELD_H - 6} textAnchor="middle">{mk.item.top}</text>}
                                            </>
                                        ) : (
                                            <>
                                                <polygon className="wm-diamond-shadow" points={`0,${-R + 1} ${R + 3},3 0,${R + 5} ${-R - 3},3`} />
                                                <polygon className="wm-diamond-bg" points={`0,${-R - 2} ${R + 2},0 0,${R + 2} ${-R - 2},0`} />
                                                {mk.item.avatar
                                                    ? <image href={mk.item.avatar} x={-R} y={-R} width={R * 2} height={R * 2} clipPath={`url(#wm-diamond-${paneMode})`} preserveAspectRatio="xMidYMid slice" />
                                                    : <polygon className="wm-diamond-empty" points={`0,${-R} ${R},0 0,${R} ${-R},0`} />}
                                                {mk.item.top && <text className="wm-rank" y={-R - 7} textAnchor="middle">{mk.item.top}</text>}
                                                <text className="wm-name" y={R + 12} textAnchor="middle">{mk.item.label}</text>
                                            </>
                                        )}
                                    </g>
                                ) : (
                                    <g key={mk.key} className="wm-marker wm-more" transform={`translate(${mk.x},${mk.y})`}
                                        onClick={() => setCountryOpen(mk.code)} role="button" tabIndex={0}
                                        onKeyDown={e => { if (e.key === 'Enter') setCountryOpen(mk.code); }}>
                                        <title>{`See all ${paneMode} in ${COUNTRY_NAME[mk.code] || mk.code}`}</title>
                                        {paneMode === 'questions' ? (
                                            <>
                                                <polygon className="wm-shield" points={SHIELD} />
                                                <text className="wm-shield-q" y={4} textAnchor="middle">?</text>
                                                <text className="wm-more-n" y={-SHIELD_H - 6} textAnchor="middle">+{mk.count}</text>
                                            </>
                                        ) : (
                                            <>
                                                <polygon className="wm-more-bg" points={`0,${-R} ${R},0 0,${R} ${-R},0`} />
                                                <text className="wm-more-q" y={5} textAnchor="middle">?</text>
                                                <text className="wm-more-n" x={R + 4} y={-R + 4}>+{mk.count}</text>
                                            </>
                                        )}
                                    </g>
                                ))}
                                    </svg>
                                </div>
                            );
                        })}
                    </div>
                    {(!land || loading) && <div className="wm-loading"><Spinner /></div>}
                    {land && !loading && itemCount === 0 && <p className="wm-empty">{emptyText}</p>}
                </div>
            </div>
            {!readOnly && <p className="wm-hint">
                Scroll or use + / − to zoom, drag to move. More {mode === 'members' ? 'members' : 'questions'} appear as you zoom in.
                The two maps alternate every 5 seconds (paused while your pointer is on the map) — or pick one in the menu or with the arrows.
            </p>}

            {countryOpen && (
                <Overlay>
                    <div className="wm-overlay" onClick={() => setCountryOpen(null)}>
                        <div className="wm-list" onClick={e => e.stopPropagation()} role="dialog" aria-label={`${mode} in ${COUNTRY_NAME[countryOpen]}`}>
                            <div className="wm-list-head">
                                {getFlagImageUrl(countryOpen) && <img src={getFlagImageUrl(countryOpen)} alt="" className="wm-flag" />}
                                <h3>{COUNTRY_NAME[countryOpen] || countryOpen}</h3>
                                <span className="wm-list-count">{openList.length} {mode === 'members' ? 'members' : 'questions'}</span>
                                <button className="wm-ctrl" onClick={() => setCountryOpen(null)} aria-label="Close"><FiX size={16} /></button>
                            </div>
                            <div className="wm-list-rows">
                                {openList.map((item, i) => {
                                    const avatar = <span className="wm-row-diamond"><span>{item.avatar ? <img src={item.avatar} alt="" /> : <FiUser size={16} />}</span></span>;
                                    if (mode === 'members') {
                                        const m = item.raw;
                                        return (
                                            <button key={item.key} className="wm-row" onClick={item.open}>
                                                <span className="wm-row-pos">{i + 1}</span>
                                                {avatar}
                                                <span className="wm-row-name">{m.name}</span>
                                                <span className="wm-row-rank">{m.seasonRank ? `#${m.seasonRank} Season` : ''}</span>
                                                <span className="wm-row-badges"><img src={ICON_GOLD_CHECK_URL} alt="" />{m.badges}</span>
                                            </button>
                                        );
                                    }
                                    const q = item.raw;
                                    return (
                                        <button key={item.key} className="wm-row" onClick={() => { setCountryOpen(null); item.open(); }}>
                                            <span className="wm-row-pos">{i + 1}</span>
                                            <svg className="wm-row-shield" viewBox="-16 -20 32 40" aria-hidden="true">
                                                <polygon className="wm-shield" points={SHIELD} />
                                                <text className="wm-shield-q" y={4} textAnchor="middle">?</text>
                                            </svg>
                                            <span className="wm-row-q">
                                                <span className="wm-row-name">{q.title}</span>
                                                <span className="wm-row-author">{q.author}</span>
                                            </span>
                                            <span className="wm-row-rank"><FaStar size={11} /> {q.stars}</span>
                                            <span className="wm-row-badges wm-row-replies"><MdChatBubble size={14} />{q.replyCount}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Overlay>
            )}

            {profileId && (
                <Overlay>
                    <AgentProfileCard agentId={profileId} onClose={() => setProfileId(null)}
                        viewerAgentId={agentId} viewerMembershipTier={viewerMembershipTier} onShowSubscribe={onShowSubscribe} />
                </Overlay>
            )}
        </div>
    );
};

export default WorldMap;
