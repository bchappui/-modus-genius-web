import React from 'react'
import './BadgeCard.css'
import { getFileViewUrl } from '../../lib/agents.js'
import { CATEGORY_IMAGE_ID } from '../../lib/categories.js'

// Mirrors modus_genius/components/BadgeCard.tsx — same fileIds resolve to the
// same Appwrite assets, same HOF vs. tab/category/rank layout branches.
const ALL_CATEGORY_IMAGE_ID = {
    ...CATEGORY_IMAGE_ID,
    Genius:  '69ee3fba00391ce61ea4',
    Creator: '69ee339d0019bda28385',
    Advisor: '69ee318d00059f75be7b',
};

const BadgeCard = ({ fileId, tab, category, rank, name, surname, year, size = 124 }) => {
    const isHof = tab === 'HOF';
    const br = Math.round(size * 0.065);
    const iconSize = Math.round(size * 0.30);
    const fontLg = Math.round(size * 0.072);
    const fontSm = Math.round(size * 0.065);
    const fontRk = Math.round(size * 0.10);
    const pb = Math.round(size * 0.04);

    return (
        <div className="bdc-root" style={{ width: size, height: size, borderRadius: br }}>
            <img
                src={getFileViewUrl(fileId)}
                alt=""
                className="bdc-img"
                style={{
                    width: size, height: size,
                    objectFit: isHof ? 'cover' : 'contain',
                    // The tab/category placeholder art (leaderboardBadgeImages.ts's
                    // shared wreath asset) is a flat opaque-white square, not a
                    // transparent PNG — multiply drops the white so only the gold
                    // wreath shows against whatever sits behind it.
                    mixBlendMode: isHof ? 'normal' : 'multiply',
                }}
            />
            {isHof ? (
                <div className="bdc-overlay bdc-overlay-hof" style={{ paddingBottom: pb, paddingLeft: Math.round(size * 0.05), paddingRight: Math.round(size * 0.05) }}>
                    {(name || surname) && (
                        <span className="bdc-hof-name" style={{ fontSize: fontLg, lineHeight: `${fontLg * 1.2}px` }}>
                            {[name, surname].filter(Boolean).join(' ')}
                        </span>
                    )}
                    {category && (
                        <span className="bdc-hof-meta" style={{ fontSize: fontSm, lineHeight: `${fontSm * 1.2}px`, marginTop: -3 }}>
                            {category}
                        </span>
                    )}
                    {category && ALL_CATEGORY_IMAGE_ID[category] && (
                        <img src={getFileViewUrl(ALL_CATEGORY_IMAGE_ID[category])} alt="" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
                    )}
                    {year != null && (
                        <span className="bdc-hof-meta" style={{ fontSize: fontSm, lineHeight: `${fontSm * 1.2}px`, marginTop: -2 }}>
                            {year}
                        </span>
                    )}
                </div>
            ) : (
                <div className="bdc-overlay bdc-overlay-tab" style={{ paddingLeft: Math.round(size * 0.05), paddingRight: Math.round(size * 0.05), gap: Math.round(size * 0.02), paddingBottom: Math.round(size * 0.06) }}>
                    {tab && tab.split(' ').map((word, i) => (
                        <span key={i} className="bdc-rank" style={{ fontSize: fontRk, lineHeight: `${fontRk * 1.2}px` }}>
                            {word.toUpperCase()}
                        </span>
                    ))}
                    {category && (
                        <div className="bdc-category-col">
                            {category.toUpperCase().split(' ').map((word, i) => (
                                <span key={i} className="bdc-meta" style={{ fontSize: fontSm, lineHeight: `${fontSm * 1.1}px` }}>
                                    {word}
                                </span>
                            ))}
                        </div>
                    )}
                    {rank != null && (
                        <span className="bdc-rank" style={{ fontSize: fontRk, lineHeight: `${fontRk * 1.2}px` }}>
                            {`TOP ${rank}`}
                        </span>
                    )}
                    {year != null && (
                        <span className="bdc-rank" style={{ fontSize: fontRk, lineHeight: `${fontRk * 1.2}px` }}>
                            {String(year)}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default BadgeCard;
