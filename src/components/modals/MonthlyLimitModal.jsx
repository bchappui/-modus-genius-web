import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import './ExitIntentModal.css'
import '../pages/LoginPage.css'
import { findRedeemableGiftCodeForProperty, giftCodeErrorMessage, redeemGiftCode } from '../../lib/giftcodes.js'

// Shown to a logged-in free account that already used this month's one free
// card on a different property. A gift code here only unlocks the ONE card
// they were trying to open (membership upsell is a placeholder until Stripe
// is wired up).
const MonthlyLimitModal = ({ agentId, property, onClose, onGiftCodeRedeemed }) => {
    const [giftCode, setGiftCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRedeem = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { doc, error: giftCodeError } = await findRedeemableGiftCodeForProperty(giftCode, property?.$id, agentId);
            if (giftCodeError) { setError(giftCodeErrorMessage(giftCodeError)); return; }
            await redeemGiftCode(doc.$id, agentId);
            onGiftCodeRedeemed?.();
        } catch (e) {
            console.error('Error redeeming gift code', e);
            setError('Could not redeem code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <p className="eim-eyebrow">Monthly limit reached</p>
                <h3 className="eim-headline">You've used this month's free card</h3>
                <p className="eim-subtext">
                    Enter a gift code for this card to unlock it, or come back next month for another free card.
                </p>

                <form className="lp-form" style={{ width: '100%' }} onSubmit={handleRedeem}>
                    <input
                        className="lp-input"
                        placeholder="Gift code"
                        value={giftCode}
                        onChange={e => { setGiftCode(e.target.value); setError(''); }}
                    />
                    {error && <p className="lp-error">{error}</p>}
                    <button type="submit" className="lp-continue-btn" disabled={loading || !giftCode.trim()}>
                        {loading ? '...' : 'UNLOCK CARD'}
                    </button>
                </form>

                <button className="eim-redeem-btn" style={{ marginTop: 14, opacity: 0.5, cursor: 'default' }} disabled>
                    Membership — coming soon
                </button>
            </div>
        </div>
    );
};

export default MonthlyLimitModal;
