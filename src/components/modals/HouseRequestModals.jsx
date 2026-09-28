import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { MdHowToReg, MdLightbulbOutline } from 'react-icons/md'
import './CreateModal.css'
import './HouseModals.css'
import { SKILL_CATEGORIES } from '../../lib/categories.js'
import { createJoinRequest, createExpertiseRequest } from '../../lib/houses.js'

// Both modals reuse CreateModal's ("Propose a Card") look: header bar with
// gold icon, cm-* labels/inputs/pills and the gradient send button.
const CmSvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="hm-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgb(246,207,129)" />
                <stop offset="50%"  stopColor="rgb(201,151,44)" />
                <stop offset="100%" stopColor="rgb(246,207,129)" />
            </linearGradient>
        </defs>
    </svg>
);

const ModalShell = ({ icon: Icon, title, onClose, children }) => (
    <div className="cm-overlay" onClick={onClose}>
        <CmSvgDefs />
        <div className="cm-panel" onClick={e => e.stopPropagation()}>
            <div className="cm-scroll">
                <div className="cm-header-bar">
                    <button className="cm-close-btn" onClick={onClose} aria-label="Close">
                        <FiX size={22} color="rgb(137,162,189)" />
                    </button>
                    <div className="cm-header-title">
                        <Icon size={22} style={{ fill: 'url(#hm-g-gold) rgb(201,151,44)' }} />
                        <span className="cm-header-text">{title}</span>
                    </div>
                </div>
                {children}
            </div>
        </div>
    </div>
);

const MOTIVATION_MAX = 1000;

export const JoinHouseModal = ({ house, agentId, onClose, onSent }) => {
    const [motivation, setMotivation] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!motivation.trim()) { setError('Please tell the owner why you want to join.'); return; }
        setSending(true);
        setError('');
        try {
            const req = await createJoinRequest(house.$id, agentId, motivation.trim());
            setSent(true);
            onSent?.(req);
        } catch (err) {
            console.error('createJoinRequest error:', err);
            setError(err.message || 'Could not send your request.');
        } finally {
            setSending(false);
        }
    };

    return (
        <ModalShell icon={MdHowToReg} title="ASK TO JOIN HOUSE" onClose={onClose}>
            {sent ? (
                <p className="cm-sent">
                    Your request has been sent to the owner of {house.name}. You can follow it in the
                    “Your requests” box at the top of the Community page.
                </p>
            ) : (
                <form className="cm-form" onSubmit={submit}>
                    <span className="cm-label">House</span>
                    <p className="hm-static">{house.name}</p>

                    <span className="cm-label">Motivation</span>
                    <div className="cm-input-wrap">
                        <textarea
                            className="cm-input cm-multiline hm-large"
                            placeholder="Why do you want to join this house?"
                            value={motivation}
                            onChange={e => setMotivation(e.target.value)}
                            maxLength={MOTIVATION_MAX}
                        />
                    </div>
                    <span className="hm-count">{motivation.length}/{MOTIVATION_MAX}</span>

                    {error && <span className="cm-error">{error}</span>}
                    <button type="submit" className="cm-send-btn" disabled={sending}>
                        {sending ? 'Sending…' : 'Send Request'}
                    </button>
                </form>
            )}
        </ModalShell>
    );
};

const QUESTION_MAX = 2000;
const REWARD_MAX = 500;

export const AskExpertiseModal = ({ house, agentId, onClose, onSent }) => {
    const [question, setQuestion] = useState('');
    const [category, setCategory] = useState(null);
    const [reward, setReward] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!question.trim() || !category) { setError('Please write your question and choose a category.'); return; }
        setSending(true);
        setError('');
        try {
            const req = await createExpertiseRequest({
                houseId: house.$id, requesterId: agentId, question: question.trim(), category, reward: reward.trim(),
            });
            setSent(true);
            onSent?.(req);
        } catch (err) {
            console.error('createExpertiseRequest error:', err);
            setError(err.message || 'Could not send your request.');
        } finally {
            setSending(false);
        }
    };

    return (
        <ModalShell icon={MdLightbulbOutline} title="ASK FOR EXPERTISE" onClose={onClose}>
            {sent ? (
                <p className="cm-sent">
                    Your question has been sent to the members of {house.name}. You can follow it in the
                    “Your requests” box at the top of the Community page.
                </p>
            ) : (
                <form className="cm-form" onSubmit={submit}>
                    <span className="cm-label">Question</span>
                    <div className="cm-input-wrap">
                        <textarea
                            className="cm-input cm-multiline hm-large"
                            placeholder={`What would you like to ask the members of ${house.name}?`}
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            maxLength={QUESTION_MAX}
                        />
                    </div>
                    <span className="hm-count">{question.length}/{QUESTION_MAX}</span>

                    <span className="cm-label">Category</span>
                    <div className="cm-pills">
                        {SKILL_CATEGORIES.map(c => (
                            <button
                                type="button"
                                key={c.key}
                                className={`cm-pill${category === c.key ? ' cm-pill-selected' : ''}`}
                                onClick={() => setCategory(c.key)}
                            >
                                {c.key}
                            </button>
                        ))}
                    </div>

                    <span className="cm-label">Reward</span>
                    <div className="cm-input-wrap">
                        <textarea
                            className="cm-input cm-multiline"
                            placeholder="What do you offer in return? e.g. money or other"
                            value={reward}
                            onChange={e => setReward(e.target.value)}
                            maxLength={REWARD_MAX}
                        />
                    </div>
                    <p className="hm-disclaimer">
                        Modus Genius is not responsible for any reward agreed between members, and no
                        transaction takes place on this website.
                    </p>

                    {error && <span className="cm-error">{error}</span>}
                    <button type="submit" className="cm-send-btn" disabled={sending}>
                        {sending ? 'Sending…' : 'Send Question'}
                    </button>
                </form>
            )}
        </ModalShell>
    );
};
