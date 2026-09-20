import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { MdAddCard } from 'react-icons/md'
import './CreateModal.css'
import { SKILL_CATEGORIES } from '../../lib/categories.js'

// Gold gradient defs for the header icon — mirrors modus_genius's
// GradientofGold MaskedView, same stops used across this app's other overlays.
const CmSvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="cm-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgb(246,207,129)" />
                <stop offset="50%"  stopColor="rgb(201,151,44)" />
                <stop offset="100%" stopColor="rgb(246,207,129)" />
            </linearGradient>
        </defs>
    </svg>
);

// Mirrors modus_genius/app/(root)/plus/proposecard.tsx: same header bar,
// card-name/category/gets-you/steps/keep-in-mind field set, gold-icon title,
// and gradient-text/gloss-pill styling used across this app's other overlays.
// The reference screen is only reachable while logged in (it reads name/email
// straight off the auth store); logged-out visitors here get the same form
// plus an email/name/surname section so the proposal can be attributed.
const CreateModal = ({ onClose, isLoggedIn, agentName, agentSurname, agentEmail }) => {
    const [form, setForm] = useState({
        email: '', name: '', surname: '',
        cardName: '', category: null, getsYou: '', steps: '', keepInMind: '',
    });
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!isLoggedIn && (!form.email.trim() || !form.name.trim() || !form.surname.trim())) {
            setError('Please fill in your email, name and surname.');
            return;
        }
        if (!form.cardName.trim() || !form.category || !form.getsYou.trim() || !form.steps.trim() || !form.keepInMind.trim()) {
            setError('Please fill all fields.');
            return;
        }
        setError('');

        const submitterName = isLoggedIn ? [agentName, agentSurname].filter(Boolean).join(' ') : `${form.name} ${form.surname}`;
        const submitterEmail = isLoggedIn ? agentEmail : form.email;

        const subject = encodeURIComponent(`New Card Proposal: ${form.cardName}`);
        const body = encodeURIComponent(
            `Card Name: ${form.cardName}\n` +
            `Category: ${form.category}\n` +
            `Submitted by: ${submitterName || 'Unknown'}${submitterEmail ? ` (${submitterEmail})` : ''}\n\n` +
            `--- THIS GETS YOU ---\n${form.getsYou}\n\n` +
            `--- STEPS ---\n${form.steps}\n\n` +
            `--- KEEP IN MIND ---\n${form.keepInMind}`
        );

        window.location.href = `mailto:chappuisbruno@gmail.com?subject=${subject}&body=${body}`;
        setSent(true);
    };

    return (
        <div className="cm-overlay" onClick={onClose}>
            <CmSvgDefs />
            <div className="cm-panel" onClick={e => e.stopPropagation()}>
                <div className="cm-scroll">
                    <div className="cm-header-bar">
                        <button className="cm-close-btn" onClick={onClose} aria-label="Close">
                            <FiX size={22} color="rgb(137,162,189)" />
                        </button>
                        <div className="cm-header-title">
                            <MdAddCard size={22} style={{ fill: 'url(#cm-g-gold) rgb(201,151,44)' }} />
                            <span className="cm-header-text">PROPOSE A CARD</span>
                        </div>
                    </div>

                    {sent ? (
                        <p className="cm-sent">
                            Thanks — your email client should have opened with the proposal pre-filled. Send it from there to reach us.
                        </p>
                    ) : (
                    <form className="cm-form" onSubmit={handleSubmit}>
                        {!isLoggedIn && (
                            <>
                                <span className="cm-label">Email</span>
                                <div className="cm-input-wrap">
                                    <input
                                        className="cm-input"
                                        type="email"
                                        placeholder="Enter your email address"
                                        value={form.email}
                                        onChange={update('email')}
                                    />
                                </div>

                                <span className="cm-label">Name</span>
                                <div className="cm-input-wrap">
                                    <input
                                        className="cm-input"
                                        type="text"
                                        placeholder="Enter your first name"
                                        value={form.name}
                                        onChange={update('name')}
                                    />
                                </div>

                                <span className="cm-label">Surname</span>
                                <div className="cm-input-wrap">
                                    <input
                                        className="cm-input"
                                        type="text"
                                        placeholder="Enter your surname"
                                        value={form.surname}
                                        onChange={update('surname')}
                                    />
                                </div>
                            </>
                        )}

                        <span className="cm-label">Card Name</span>
                        <div className="cm-input-wrap">
                            <input
                                className="cm-input"
                                type="text"
                                placeholder="Enter card name"
                                value={form.cardName}
                                onChange={update('cardName')}
                            />
                        </div>

                        <span className="cm-label">Category</span>
                        <div className="cm-pills">
                            {SKILL_CATEGORIES.map(c => (
                                <button
                                    type="button"
                                    key={c.key}
                                    className={`cm-pill${form.category === c.key ? ' cm-pill-selected' : ''}`}
                                    onClick={() => setForm(prev => ({ ...prev, category: c.key }))}
                                >
                                    {c.key}
                                </button>
                            ))}
                        </div>

                        <span className="cm-label">This Gets You</span>
                        <div className="cm-input-wrap">
                            <textarea
                                className="cm-input cm-multiline"
                                placeholder="What does following this card get you?"
                                value={form.getsYou}
                                onChange={update('getsYou')}
                            />
                        </div>

                        <span className="cm-label">Steps</span>
                        <div className="cm-input-wrap">
                            <textarea
                                className="cm-input cm-multiline"
                                placeholder="Describe the steps to follow"
                                value={form.steps}
                                onChange={update('steps')}
                            />
                        </div>

                        <span className="cm-label">Keep In Mind</span>
                        <div className="cm-input-wrap">
                            <textarea
                                className="cm-input cm-multiline"
                                placeholder="Any warnings or tips to keep in mind"
                                value={form.keepInMind}
                                onChange={update('keepInMind')}
                            />
                        </div>

                        {error && <span className="cm-error">{error}</span>}

                        <button type="submit" className="cm-send-btn">Send Card for Approval</button>
                    </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateModal;
