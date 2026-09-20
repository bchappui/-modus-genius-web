import React from 'react'
import '../CardHome.css'
import './Celebration.css'
import { getFileViewUrl } from '../../../lib/agents.js'
import { SKILL_CATEGORIES, ROLE_TO_CATEGORY } from '../../../lib/categories.js'

const LOGO_BG_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a20909c003e0edcf46d/view?project=693e8acd001582e2562a';

const CARD_W = 80;
const CARD_H = Math.round(CARD_W * 2576 / 1456);

function getCategoryData(role) {
    if (!role) return null;
    const categoryKey = ROLE_TO_CATEGORY[role];
    if (!categoryKey) return null;
    const cat = SKILL_CATEGORIES.find(c => c.key === categoryKey);
    if (!cat) return null;
    return { shortRoleName: cat.shortRoleName, imageUrl: getFileViewUrl(cat.imageFileId) };
}

// Mirrors modus_genius/components/celebration/RoleTitleModal.tsx — shown when
// the agent's dominant likes/stars category (and therefore role title) changes.
const RoleTitleModal = ({ event, avatar, onDismiss }) => {
    const primaryRole = event.likesRole || event.starsRole;
    const categoryData = getCategoryData(primaryRole);

    return (
        <div className="cel-overlay">
            <div className="cel-card-wrap">
                <div className="cel-logo-box">
                    <img src={LOGO_BG_URL} alt="" className="cel-logo-box-bg" />
                    <div className="cel-logo-box-dim" />
                    {categoryData && <img src={categoryData.imageUrl} alt="" className="cel-logo-box-img" style={{ width: 55, height: 55 }} />}
                </div>

                <div className="cel-card">
                    <div className="cel-card-gloss-1" />
                    <div className="cel-card-gloss-2" />

                    <span className="cel-title">NEW SKILL ACQUIRED!</span>
                    <span className="cel-subtitle">ROLES ARE ASSIGNED BASED ON WHICH CARD CATEGORY RECEIVED THE MOST LIKES OR STARS.</span>

                    <div className="cel-portrait-wrap" style={{ width: CARD_W, height: CARD_H, marginTop: 12, marginBottom: 16 }}>
                        <div className="cel-portrait-gradient" style={{ width: CARD_W, height: CARD_H }}>
                            <div className="cel-portrait-inner">
                                {avatar && <img src={avatar} alt="" />}
                            </div>
                        </div>
                    </div>

                    {categoryData && (
                        <div className="cel-tag-shadow" style={{ marginBottom: 24 }}>
                            <div className="cel-tag">
                                <span className="cel-tag-text">{categoryData.shortRoleName.toUpperCase()}</span>
                            </div>
                        </div>
                    )}

                    <button type="button" className="cel-btn" onClick={onDismiss}>
                        <div className="cel-btn-gloss-1" />
                        <div className="cel-btn-gloss-2" />
                        <span className="cel-btn-text">NEXT</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleTitleModal;
