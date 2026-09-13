// Mirrors modus_genius/constants/categories.ts (SKILL_CATEGORIES) — same
// Appwrite project/bucket, so the imageFileIds resolve to the same assets.
export const SKILL_CATEGORIES = [
    { key: 'Agile',                         imageFileId: '69ebdb9b00332ee113b3', roleTitle: 'The Agilist',          shortRoleName: 'Agilist' },
    { key: 'Change Management',             imageFileId: '69ebdba30030735d11ff', roleTitle: 'The Change Agent',     shortRoleName: 'Change Agent' },
    { key: 'Communication',                 imageFileId: '69ebdbaa0010734d4f72', roleTitle: 'The Communicator',     shortRoleName: 'Communicator' },
    { key: 'Conflict Management',           imageFileId: '69ebdbb10019963d8bd8', roleTitle: 'The Mediator',         shortRoleName: 'Mediator' },
    { key: 'Critical Thinking',             imageFileId: '69ebdbb800167740f0f9', roleTitle: 'The Critical Thinker', shortRoleName: 'Critical Thinker' },
    { key: 'Decision-Making',               imageFileId: '69ebdbbe002ee0280138', roleTitle: 'The Decision Maker',   shortRoleName: 'Decision Maker' },
    { key: 'Design Thinking',               imageFileId: '69ebdbc6002ed9e52eae', roleTitle: 'The Designer',         shortRoleName: 'Design Thinker' },
    { key: 'Entrepreneurship & Innovation', imageFileId: '69ebdbcf0006dac85d64', roleTitle: 'The Innovator',        shortRoleName: 'Innovator' },
    { key: 'Leadership',                    imageFileId: '69ebdbd6000c5e0a423d', roleTitle: 'The Leader',           shortRoleName: 'Leader' },
    { key: 'Meeting Facilitation',          imageFileId: '69ebdbdb00283a01956f', roleTitle: 'The Facilitator',      shortRoleName: 'Facilitator' },
    { key: 'Prioritization Techniques',     imageFileId: '69ebdbe3002150ac9922', roleTitle: 'The Prioritizer',      shortRoleName: 'Prioritizer' },
    { key: 'Problem Solving',               imageFileId: '69ebdbea001db614c5c4', roleTitle: 'The Problem Solver',   shortRoleName: 'Problem Solver' },
    { key: 'Project Management',            imageFileId: '69ebdbf1001edf23852c', roleTitle: 'The Project Manager',  shortRoleName: 'Project Manager' },
    { key: 'Results Management',            imageFileId: '69ebdbf70035b3f97eb7', roleTitle: 'The Performance Driver', shortRoleName: 'Performance Driver' },
    { key: 'Strategy',                      imageFileId: '69ebdc000017b9d2d1b1', roleTitle: 'The Strategist',       shortRoleName: 'Strategist' },
    { key: 'Talent Management',             imageFileId: '69ebdc0600363c691ffe', roleTitle: 'The Talent Developer', shortRoleName: 'Talent Developer' },
    { key: 'Team Building',                 imageFileId: '69ebdc0c002f0d151ad9', roleTitle: 'The Team Builder',     shortRoleName: 'Team Builder' },
    { key: 'Team Management',               imageFileId: '69ebdc1400249c7de289', roleTitle: 'The Team Manager',     shortRoleName: 'Team Manager' },
];

const STORAGE_BUCKET_ID = '6954052f00084044b871';

export function getCategoryImageUrl(fileId) {
    return `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${fileId}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
}

export const CATEGORY_IMAGE_ID = Object.fromEntries(SKILL_CATEGORIES.map(c => [c.key, c.imageFileId]));
export const CATEGORY_SHORT_ROLE = Object.fromEntries(SKILL_CATEGORIES.map(c => [c.key, c.shortRoleName]));
