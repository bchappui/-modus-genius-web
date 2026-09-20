import React, { useEffect, useState } from 'react'
import './CardHome.css'
import './AgentProfileCard.css'
import './AccountMenuModal.css'
import { FiX, FiEye } from 'react-icons/fi'
import {
    MdAccountCircle, MdBookmark, MdFormatQuote, MdWorkspacePremium,
    MdFlag, MdAdminPanelSettings, MdLogout, MdChevronRight,
} from 'react-icons/md'
import { IoNotificationsOutline } from 'react-icons/io5'
import { BsPersonVcard } from 'react-icons/bs'
import { FaThemeco } from 'react-icons/fa6'
import AgentProfileCard from './AgentProfileCard.jsx'
import BadgesModal from './BadgesModal.jsx'
import AdminAwardModal from './AdminAwardModal.jsx'
import ReportProblemModal from './ReportProblemModal.jsx'
import { databases, DATABASE_ID, AGENTS_COLLECTION_ID } from '../../lib/appwrite.js'
import { ProfileBanner } from './AgentReadCard.jsx'
import { getNotificationsEnabled as fetchNotificationsEnabled, setNotificationsEnabled as persistNotificationsEnabled } from '../../lib/levels.js'
import { VISIBLE_TIERS } from '../../lib/membership.js'

const ADMIN_EMAIL = 'chappuisbruno@gmail.com';

// Mirrors modus_genius's Switch (trackColor false:#D1D5DB / true:rgb(237,185,95),
// white thumb) — this app has no dark-mode/push-notification backends to wire
// these into, so (same as the reference's own "Report a Problem"/"Manage
// Subscription" rows) they're visually present but inert.
const MiniSwitch = ({ value, onChange }) => (
    <button
        type="button"
        className={`amm-switch${value ? ' amm-switch-on' : ''}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
    >
        <span className="amm-switch-thumb" />
    </button>
);

const SectionTitle = ({ title }) => <span className="amm-section-title">{title}</span>;

// `right` (e.g. MiniSwitch) is its own interactive control, so those rows
// render as a plain div instead of a button — a button can't contain
// another button (invalid HTML, breaks screen readers / keyboard nav).
// Rows without a custom `right` control stay real buttons for the same reason.
const SettingsItem = ({ icon, title, onClick, showArrow = true, right }) => {
    const content = (
        <>
            <span className="amm-item-left">
                {icon}
                <span className="amm-item-text">{title}</span>
            </span>
            {right ? right : (showArrow && <MdChevronRight size={20} color="rgb(137,162,189)" />)}
        </>
    );
    return right
        ? <div className="amm-item">{content}</div>
        : <button type="button" className="amm-item" onClick={onClick}>{content}</button>;
};

// Mirrors modus_genius/app/(root)/profile/index.tsx — the intermediate
// "account menu" screen reached by tapping the header avatar, sitting ahead
// of (not replacing) the existing Edit Profile modal.
const AccountMenuModal = ({ agentId, authEmail, onClose, onEditProfile, onShowFavorites, onShowQuotes, onShowSubscribe, onGetNextTier, onLogout }) => {
    const [agent, setAgent] = useState(null);
    const [viewProfileOpen, setViewProfileOpen] = useState(false);
    const [badgesOpen, setBadgesOpen] = useState(false);
    const [adminAwardOpen, setAdminAwardOpen] = useState(false);
    const [reportProblemOpen, setReportProblemOpen] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        if (!agentId) return;
        let cancelled = false;
        databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId)
            .then(doc => { if (!cancelled) setAgent(doc); })
            .catch(e => console.error('Error loading agent for account menu:', e));
        return () => { cancelled = true; };
    }, [agentId]);

    useEffect(() => {
        if (!agentId) return;
        let cancelled = false;
        fetchNotificationsEnabled(agentId).then(enabled => { if (!cancelled) setNotificationsEnabled(enabled); });
        return () => { cancelled = true; };
    }, [agentId]);

    const toggleNotifications = (value) => {
        setNotificationsEnabled(value);
        persistNotificationsEnabled(agentId, value);
    };

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !viewProfileOpen && !badgesOpen && !adminAwardOpen && !reportProblemOpen) onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose, viewProfileOpen, badgesOpen, adminAwardOpen, reportProblemOpen]);

    if (!agentId) return null;

    // Upsell to the tier right above the one the agent already has — visible
    // tiers only (premium isn't offered on the Membership page yet), and no
    // upsell once there's nothing higher to offer (Extra, or invisible Premium).
    const currentTierIndex = agent ? VISIBLE_TIERS.findIndex(t => t.key === (agent.membershipTier || 'free')) : -1;
    const nextTier = currentTierIndex >= 0 && currentTierIndex < VISIBLE_TIERS.length - 1
        ? VISIBLE_TIERS[currentTierIndex + 1]
        : null;

    return (
        <>
            <div className="amm-overlay" onClick={onClose}>
                <div className="amm-panel" onClick={e => e.stopPropagation()}>
                    <div className="amm-close-row">
                        <button className="amm-close-btn" onClick={onClose} aria-label="Close">
                            <FiX size={22} color="rgb(137,162,189)" />
                        </button>
                    </div>

                    <div className="amm-scroll">
                        <ProfileBanner agent={agent} />

                        {nextTier && (
                            <button type="button" className="amm-get-pro" onClick={() => onGetNextTier(nextTier.key)}>
                                <FaThemeco size={22} />
                                <span>GET {nextTier.label.toUpperCase()}</span>
                            </button>
                        )}

                        <div className="amm-buttons-row">
                            <button type="button" className="amm-action-btn" onClick={() => setViewProfileOpen(true)}>
                                <FiEye size={18} color="rgb(137,162,189)" />
                                <span>VIEW PROFILE</span>
                            </button>
                            <button type="button" className="amm-action-btn" onClick={onEditProfile}>
                                <MdAccountCircle size={20} color="rgb(137,162,189)" />
                                <span>EDIT PROFILE</span>
                            </button>
                        </div>

                        <div className="amm-section">
                            <SectionTitle title="Quick Access" />
                            <SettingsItem
                                icon={<MdBookmark size={20} color="rgb(137,162,189)" />}
                                title="Favorites"
                                onClick={onShowFavorites}
                            />
                        </div>

                        <div className="amm-section amm-section-border">
                            <SectionTitle title="Rewards" />
                            <SettingsItem
                                icon={<MdFormatQuote size={22} color="rgb(137,162,189)" />}
                                title="Quotes"
                                onClick={onShowQuotes}
                            />
                            <SettingsItem
                                icon={<MdWorkspacePremium size={22} color="rgb(137,162,189)" />}
                                title="Badges"
                                onClick={() => setBadgesOpen(true)}
                            />
                        </div>

                        <div className="amm-section amm-section-border">
                            <SectionTitle title="Other" />
                            <SettingsItem
                                icon={<IoNotificationsOutline size={22} color="rgb(137,162,189)" />}
                                title="Notifications"
                                showArrow={false}
                                right={<MiniSwitch value={notificationsEnabled} onChange={toggleNotifications} />}
                            />
                            <SettingsItem
                                icon={<MdFlag size={22} color="rgb(137,162,189)" />}
                                title="Report a Problem"
                                onClick={() => setReportProblemOpen(true)}
                            />
                            <SettingsItem
                                icon={<BsPersonVcard size={20} color="rgb(137,162,189)" />}
                                title="Manage Subscription"
                                onClick={() => {}}
                            />
                        </div>

                        {authEmail === ADMIN_EMAIL && (
                            <div className="amm-section amm-section-border">
                                <SettingsItem
                                    icon={<MdAdminPanelSettings size={22} color="rgb(137,162,189)" />}
                                    title="Admin — Award"
                                    onClick={() => setAdminAwardOpen(true)}
                                />
                            </div>
                        )}

                        <div className="amm-section amm-section-border">
                            <SettingsItem
                                icon={<MdLogout size={22} color="rgb(137,162,189)" />}
                                title="Logout"
                                showArrow={false}
                                onClick={onLogout}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {viewProfileOpen && (
                <AgentProfileCard
                    agentId={agentId}
                    onClose={() => setViewProfileOpen(false)}
                    viewerAgentId={agentId}
                    viewerMembershipTier={agent?.membershipTier}
                    onShowSubscribe={onShowSubscribe}
                />
            )}

            {badgesOpen && (
                <BadgesModal agentId={agentId} onClose={() => setBadgesOpen(false)} />
            )}

            {adminAwardOpen && (
                <AdminAwardModal onClose={() => setAdminAwardOpen(false)} />
            )}

            {reportProblemOpen && (
                <ReportProblemModal
                    agentName={agent ? `${agent.name || ''} ${agent.surname || ''}`.trim() : ''}
                    agentEmail={authEmail}
                    onClose={() => setReportProblemOpen(false)}
                />
            )}
        </>
    );
};

export default AccountMenuModal;
