import React, { useState } from 'react'
import { FiX, FiCheck, FiSearch } from 'react-icons/fi'
import { MdAdminPanelSettings } from 'react-icons/md'
import './AdminAwardModal.css'
import { searchAgentsByName } from '../../lib/agents.js'
import { adminAwardReward } from '../../lib/levels.js'

// Gold gradient defs for the header icon — same stops used across this app's
// other overlays.
const AawSvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="aaw-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgb(246,207,129)" />
                <stop offset="50%"  stopColor="rgb(201,151,44)" />
                <stop offset="100%" stopColor="rgb(246,207,129)" />
            </linearGradient>
        </defs>
    </svg>
);

// Mirrors modus_genius/app/(root)/admin/index.tsx exactly: search any agent
// by name, multi-select, pick hearts or stars, pick an amount, award to
// every selected agent, show a per-agent result. Admin-only — the caller
// (AccountMenuModal) already gates this behind authEmail === ADMIN_EMAIL.
const AdminAwardModal = ({ onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState([]);
    const [type, setType] = useState('hearts');
    const [amount, setAmount] = useState('1');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchResults(await searchAgentsByName(searchQuery));
        setSearching(false);
    };

    const isSelected = (u) => selected.some(s => s.id === u.id);
    const toggleSelect = (u) => {
        setSelected(prev => (prev.find(s => s.id === u.id) ? prev.filter(s => s.id !== u.id) : [...prev, u]));
    };

    const handleAward = async () => {
        if (selected.length === 0) { alert('Select at least one user.'); return; }
        const n = parseInt(amount, 10);
        if (isNaN(n) || n < 1) { alert('Amount must be ≥ 1.'); return; }

        setLoading(true);
        setResults([]);
        const out = [];
        for (const u of selected) {
            try {
                const res = await adminAwardReward(u.id, type, n);
                out.push({
                    userId: u.id,
                    name: `${u.name} ${u.surname}`.trim(),
                    ok: true,
                    oldLevel: res.leveledUp ? res.newLevel - 1 : res.newLevel,
                    newLevel: res.newLevel,
                });
            } catch (error) {
                out.push({ userId: u.id, name: `${u.name} ${u.surname}`.trim(), ok: false, error: error.message });
            }
        }
        setResults(out);
        setLoading(false);
    };

    return (
        <div className="aaw-overlay" onClick={onClose}>
            <AawSvgDefs />
            <div className="aaw-panel" onClick={e => e.stopPropagation()}>
                <div className="aaw-scroll">
                    <div className="aaw-header-bar">
                        <button className="aaw-close-btn" onClick={onClose} aria-label="Close">
                            <FiX size={22} color="rgb(137,162,189)" />
                        </button>
                        <div className="aaw-header-title">
                            <MdAdminPanelSettings size={22} style={{ fill: 'url(#aaw-g-gold) rgb(201,151,44)' }} />
                            <span className="aaw-header-text">ADMIN — AWARD</span>
                        </div>
                    </div>

                    <span className="aaw-label">Search by name</span>
                    <div className="aaw-search-row">
                        <div className="aaw-input-wrap">
                            <input
                                className="aaw-input"
                                type="text"
                                placeholder="Agent name…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button type="button" className="aaw-search-btn" onClick={handleSearch} disabled={searching}>
                            {searching ? '…' : <FiSearch size={18} />}
                        </button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="aaw-results">
                            {searchResults.map(u => (
                                <button
                                    type="button"
                                    key={u.id}
                                    className={`aaw-result-row${isSelected(u) ? ' aaw-result-row--selected' : ''}`}
                                    onClick={() => toggleSelect(u)}
                                >
                                    <span className="aaw-result-info">
                                        <span className="aaw-result-name">{u.name} {u.surname}</span>
                                        <span className="aaw-result-email">{u.email}</span>
                                    </span>
                                    {isSelected(u) ? <FiCheck size={18} color="rgb(56,150,80)" /> : <span className="aaw-result-plus">+</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {selected.length > 0 && (
                        <>
                            <span className="aaw-label">Selected ({selected.length})</span>
                            <div className="aaw-chips">
                                {selected.map(u => (
                                    <div className="aaw-chip" key={u.id}>
                                        <span>{u.name} {u.surname}</span>
                                        <button type="button" onClick={() => toggleSelect(u)} aria-label="Remove">
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <span className="aaw-label">Type</span>
                    <div className="aaw-type-row">
                        {['hearts', 'stars'].map(t => (
                            <button
                                type="button"
                                key={t}
                                className={`aaw-type-btn${type === t ? ' aaw-type-btn--active' : ''}`}
                                onClick={() => setType(t)}
                            >
                                {t === 'hearts' ? '♥ Hearts' : '★ Stars'}
                            </button>
                        ))}
                    </div>

                    <span className="aaw-label">Amount (per user)</span>
                    <div className="aaw-input-wrap">
                        <input
                            className="aaw-input aaw-amount-input"
                            type="number"
                            min="1"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                    </div>

                    <button type="button" className="aaw-award-btn" onClick={handleAward} disabled={loading || selected.length === 0}>
                        {loading ? 'Awarding…' : `AWARD${selected.length > 0 ? ` (${selected.length})` : ''}`}
                    </button>

                    {results.length > 0 && (
                        <div className="aaw-results-box">
                            <span className="aaw-label" style={{ marginTop: 0 }}>Results</span>
                            {results.map((r, i) => (
                                <div className="aaw-result-line" key={i}>
                                    <span className="aaw-result-line-name">{r.name || r.userId.slice(0, 12) + '…'}</span>
                                    {r.ok ? (
                                        <span className={`aaw-result-line-status${r.newLevel > r.oldLevel ? ' aaw-result-line-status--up' : ''}`}>
                                            {r.newLevel > r.oldLevel ? `↑ Lvl ${r.oldLevel} → ${r.newLevel}` : `✓ Lvl ${r.newLevel}`}
                                        </span>
                                    ) : (
                                        <span className="aaw-result-line-status aaw-result-line-status--err">✗ {r.error}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAwardModal;
