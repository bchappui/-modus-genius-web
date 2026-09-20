import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { MdFlag } from 'react-icons/md'
import './ReportProblemModal.css'

// Gold gradient defs for the header icon — same stops used across this app's
// other overlays.
const RpmSvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="rpm-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgb(246,207,129)" />
                <stop offset="50%"  stopColor="rgb(201,151,44)" />
                <stop offset="100%" stopColor="rgb(246,207,129)" />
            </linearGradient>
        </defs>
    </svg>
);

// "Report a Problem" is a no-op placeholder in modus_genius too (onPress={()
// => {}}), so there's no reference behavior to mirror here — this mails the
// report the same way CreateModal already mails a card proposal, since this
// app has no backend endpoint of its own to send it through.
const ReportProblemModal = ({ agentName, agentEmail, onClose }) => {
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description.trim()) { setError('Please describe the problem.'); return; }
        setError('');

        const subject = encodeURIComponent(`Problem Report from ${agentName || 'a user'}`);
        const body = encodeURIComponent(
            `Reported by: ${agentName || 'Unknown'}${agentEmail ? ` (${agentEmail})` : ''}\n` +
            `Page: ${window.location.href}\n\n` +
            `--- PROBLEM ---\n${description}`
        );

        window.location.href = `mailto:chappuisbruno@gmail.com?subject=${subject}&body=${body}`;
        setSent(true);
    };

    return (
        <div className="rpm-overlay" onClick={onClose}>
            <RpmSvgDefs />
            <div className="rpm-panel" onClick={e => e.stopPropagation()}>
                <div className="rpm-scroll">
                    <div className="rpm-header-bar">
                        <button className="rpm-close-btn" onClick={onClose} aria-label="Close">
                            <FiX size={22} color="rgb(137,162,189)" />
                        </button>
                        <div className="rpm-header-title">
                            <MdFlag size={20} style={{ fill: 'url(#rpm-g-gold) rgb(201,151,44)' }} />
                            <span className="rpm-header-text">REPORT A PROBLEM</span>
                        </div>
                    </div>

                    {sent ? (
                        <p className="rpm-sent">
                            Thanks — your email client should have opened with the report pre-filled. Send it from there to reach us.
                        </p>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <span className="rpm-label">What went wrong?</span>
                            <div className="rpm-input-wrap">
                                <textarea
                                    className="rpm-input rpm-multiline"
                                    placeholder="Describe what happened, and what you expected instead…"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {error && <span className="rpm-error">{error}</span>}

                            <button type="submit" className="rpm-send-btn">Send Report</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportProblemModal;
