import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import '../modals/ExitIntentModal.css'
import './HouseNotifications.css'
import {
    getAgentsByIds, getHouse,
    listHouseJoinRequests, listMyJoinRequests, listHouseExpertiseRequests, listMyExpertiseRequests,
    markJoinRequestSeen, markExpertiseSeenByMember, markExpertiseSeenByRequester,
    respondExpertiseRequest, answerEmailConsent,
} from '../../lib/houses.js'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

const EMAIL_NOTICE = 'If you both confirm, your email and the email of the other person will be shared with each other so you can get in touch. You can still decide.';

// One modal at a time for everything house-related that needs the viewer's
// attention: a new join request (owner), the answer to their own join
// request, a new expertise request (members), the answer to their own
// expertise request. Checked on load, every 45s and when the tab regains focus.
const HouseNotifications = ({ agentId, myHouse, myEmail, onOpenView, onChanged }) => {
    const [queue, setQueue] = useState([]);
    const [step, setStep] = useState(null); // expertise flow: 'consent' | 'taken' | 'shared'
    const [busy, setBusy] = useState(false);
    const [shownEmail, setShownEmail] = useState('');
    const handled = useRef(new Set());
    const lastSignature = useRef(null);

    const check = useCallback(async () => {
        if (!agentId) return;
        const isOwner = myHouse && myHouse.ownerId === agentId;
        const [ownerJoins, myJoins, houseExpertise, myExpertise] = await Promise.all([
            isOwner ? listHouseJoinRequests(myHouse.$id) : [],
            listMyJoinRequests(agentId),
            myHouse ? listHouseExpertiseRequests(myHouse.$id) : [],
            listMyExpertiseRequests(agentId),
        ]);
        const items = [
            ...ownerJoins.filter(r => r.status === 'pending' && !r.seenByOwner).map(req => ({ type: 'join-new', req })),
            ...myJoins.filter(r => r.status !== 'pending' && !r.seenByRequester).map(req => ({ type: 'join-result', req })),
            ...houseExpertise.filter(r => r.status === 'pending' && !(r.seenBy || []).includes(agentId)).map(req => ({ type: 'expertise-new', req })),
            ...myExpertise.filter(r => (r.status === 'accepted' || r.status === 'declined') && !r.seenByRequester).map(req => ({ type: 'expertise-result', req })),
        ].filter(i => !handled.current.has(`${i.type}:${i.req.$id}`));
        const signature = [...ownerJoins, ...myJoins, ...houseExpertise, ...myExpertise]
            .map(r => `${r.$id}:${r.status}:${r.requesterConsent || ''}:${r.responderConsent || ''}`).sort().join('|');
        if (!items.length) return signature;

        const agentIds = items.flatMap(i => [i.req.agentId, i.req.requesterId, i.req.responderId]);
        const houseIds = [...new Set(items.map(i => i.req.houseId))];
        const [agents, houses] = await Promise.all([
            getAgentsByIds(agentIds),
            Promise.all(houseIds.map(id => getHouse(id))),
        ]);
        const houseMap = new Map(houses.filter(Boolean).map(h => [h.$id, h]));
        const enriched = items
            .filter(i => houseMap.has(i.req.houseId))
            .map(i => ({ ...i, house: houseMap.get(i.req.houseId), agents }));

        setQueue(prev => {
            const known = new Set(prev.map(i => `${i.type}:${i.req.$id}`));
            return [...prev, ...enriched.filter(i => !known.has(`${i.type}:${i.req.$id}`))];
        });
        return signature;
    }, [agentId, myHouse]);

    useEffect(() => { check(); }, [check]);

    // Poll instead of Appwrite realtime: every 45s and when the tab regains
    // focus. When anything changed since the last look, tell App so the
    // request boxes re-fetch (onChanged).
    useEffect(() => {
        if (!agentId) return;
        const tick = async () => {
            const signature = await check();
            if (lastSignature.current !== null && signature !== lastSignature.current) onChanged?.();
            lastSignature.current = signature;
        };
        const id = setInterval(tick, 45000);
        const onFocus = () => { if (document.visibilityState === 'visible') tick(); };
        document.addEventListener('visibilitychange', onFocus);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onFocus); };
    }, [agentId, check, onChanged]);

    const current = queue[0];

    const done = () => {
        if (current) handled.current.add(`${current.type}:${current.req.$id}`);
        setQueue(prev => prev.slice(1));
        setStep(null);
        setShownEmail('');
        setBusy(false);
    };

    const markSeen = async (item) => {
        if (item.type === 'join-new') await markJoinRequestSeen(item.req.$id, 'seenByOwner');
        else if (item.type === 'join-result') await markJoinRequestSeen(item.req.$id, 'seenByRequester');
        else if (item.type === 'expertise-new') await markExpertiseSeenByMember(item.req, agentId);
        else if (item.type === 'expertise-result') await markExpertiseSeenByRequester(item.req.$id);
    };

    const close = async () => {
        if (!current) return;
        await markSeen(current);
        done();
    };

    if (!current) return null;
    const { type, req, house, agents } = current;
    const nameOf = (id) => agents.get(id)?.name || 'Someone';

    const answerExpertise = async (accept) => {
        setBusy(true);
        try {
            const res = await respondExpertiseRequest(req.$id, agentId, accept);
            onChanged?.();
            if (res.responderId !== agentId) { setStep('taken'); setBusy(false); return; }
            if (accept) { setStep('consent'); setBusy(false); return; }
            done();
        } catch (err) {
            console.error('respondExpertiseRequest error:', err);
            setBusy(false);
        }
    };

    const consent = async (role, yes) => {
        setBusy(true);
        try {
            const res = await answerEmailConsent(req.$id, role, yes, myEmail);
            if (role === 'requester') await markExpertiseSeenByRequester(req.$id);
            onChanged?.();
            if (res.status === 'shared') {
                setShownEmail(role === 'requester' ? res.responderEmail : res.requesterEmail);
                setStep('shared');
                setBusy(false);
                return;
            }
            done();
        } catch (err) {
            console.error('answerEmailConsent error:', err);
            setBusy(false);
        }
    };

    let body;
    if (type === 'join-new') {
        body = (
            <>
                <h3 className="eim-headline">New request to join {house.name}</h3>
                <p className="eim-subtext"><strong>{nameOf(req.agentId)}</strong> would like to join your house.</p>
                {req.motivation && <p className="hn-quote">“{req.motivation}”</p>}
                <p className="eim-subtext">
                    You will find this request in the Requests box at the top of your house page, where you can accept or decline it.
                </p>
                <div className="hn-actions">
                    <button className="eim-redeem-btn" onClick={async () => { await close(); onOpenView({ kind: 'houseForum', houseId: house.$id }); }}>Go to my house</button>
                    <button className="hn-secondary" onClick={close}>Later</button>
                </div>
            </>
        );
    } else if (type === 'join-result') {
        const accepted = req.status === 'accepted';
        body = (
            <>
                <h3 className="eim-headline">{accepted ? `Welcome to ${house.name}!` : `Request to join ${house.name}`}</h3>
                <p className="eim-subtext">
                    {accepted
                        ? 'Your request was accepted. You can now open the private forum of your house with the round button in the top bar.'
                        : 'Your request to join this house was declined.'}
                </p>
                <div className="hn-actions">
                    {accepted
                        ? <button className="eim-redeem-btn" onClick={async () => { await close(); onChanged?.(); onOpenView({ kind: 'houseForum', houseId: house.$id }); }}>Open house forum</button>
                        : <button className="eim-redeem-btn" onClick={close}>OK</button>}
                </div>
            </>
        );
    } else if (type === 'expertise-new') {
        body = step === 'consent' ? (
            <>
                <h3 className="eim-headline">You accepted the request</h3>
                <p className="eim-subtext">{EMAIL_NOTICE}</p>
                <div className="hn-actions">
                    <button className="eim-redeem-btn" disabled={busy} onClick={() => consent('responder', true)}>Yes, share my email</button>
                    <button className="hn-secondary" disabled={busy} onClick={() => consent('responder', false)}>No</button>
                </div>
            </>
        ) : step === 'taken' ? (
            <>
                <h3 className="eim-headline">Already answered</h3>
                <p className="eim-subtext">Another member of {house.name} answered this request first.</p>
                <div className="hn-actions"><button className="eim-redeem-btn" onClick={done}>OK</button></div>
            </>
        ) : step === 'shared' ? (
            <SharedBody email={shownEmail} who={nameOf(req.requesterId)} onDone={done} />
        ) : (
            <>
                <h3 className="eim-headline">New question for {house.name}</h3>
                <p className="eim-subtext"><strong>{nameOf(req.requesterId)}</strong> asks for your house&apos;s expertise.</p>
                <p className="hn-quote">“{req.question}”</p>
                <p className="eim-subtext">
                    Category: <strong>{req.category}</strong>
                    {req.reward ? <><br />Reward offered: <strong>{req.reward}</strong></> : null}
                </p>
                <p className="hn-small">
                    The first member to answer decides. Modus Genius is not responsible for any reward and no transaction takes place on this website.
                </p>
                <div className="hn-actions">
                    <button className="eim-redeem-btn" disabled={busy} onClick={() => answerExpertise(true)}>Accept</button>
                    <button className="hn-secondary" disabled={busy} onClick={() => answerExpertise(false)}>Decline</button>
                    <button className="hn-secondary" disabled={busy} onClick={close}>Later</button>
                </div>
            </>
        );
    } else {
        const accepted = req.status === 'accepted';
        body = step === 'shared' ? (
            <SharedBody email={shownEmail} who={nameOf(req.responderId)} onDone={done} />
        ) : (
            <>
                <h3 className="eim-headline">{accepted ? 'Your question was accepted' : 'Your question was declined'}</h3>
                <p className="eim-subtext">
                    {accepted
                        ? <><strong>{nameOf(req.responderId)}</strong> from {house.name} accepted your question. {EMAIL_NOTICE}</>
                        : `${house.name} declined your question.`}
                </p>
                <div className="hn-actions">
                    {accepted ? (
                        <>
                            <button className="eim-redeem-btn" disabled={busy} onClick={() => consent('requester', true)}>Yes, share my email</button>
                            <button className="hn-secondary" disabled={busy} onClick={() => consent('requester', false)}>No</button>
                        </>
                    ) : (
                        <button className="eim-redeem-btn" onClick={close}>OK</button>
                    )}
                </div>
            </>
        );
    }

    return (
        <div className="eim-overlay">
            <div className="eim-panel hn-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={close} aria-label="Close" disabled={busy}>
                    <FiX size={18} />
                </button>
                <img src={GOLD_FACE_URL} alt="" className="eim-face" />
                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="eim-logo" />
                <p className="eim-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</p>
                {body}
            </div>
        </div>
    );
};

const SharedBody = ({ email, who, onDone }) => (
    <>
        <h3 className="eim-headline">Emails shared</h3>
        <p className="eim-subtext">You can now contact <strong>{who}</strong>:</p>
        <p className="hn-quote"><a href={`mailto:${email}`}>{email}</a></p>
        <div className="hn-actions"><button className="eim-redeem-btn" onClick={onDone}>OK</button></div>
    </>
);

export default HouseNotifications;
