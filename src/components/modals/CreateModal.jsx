import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import './CreateModal.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const GOLD_FACE_URL  = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a07239d002ed6eff7fc/view?project=693e8acd001582e2562a';

const CreateModal = ({ onClose }) => {
    const [form, setForm] = useState({
        email: '', name: '', surname: '', cardName: '', summary: '', steps: '',
    });

    const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    return (
        <div className="cm-overlay" onClick={onClose}>
            <div className="cm-panel" onClick={e => e.stopPropagation()}>
                <button className="cm-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <img src={LOGO_TEXT_URL} alt="Modus Genius" className="cm-logo" />
                <img src={GOLD_FACE_URL} alt="" className="cm-face" />
                <h3 className="cm-headline">Your expertise deserves a global stage.</h3>

                <form className="cm-form" onSubmit={e => { e.preventDefault(); onClose(); }}>
                    <input
                        className="cm-input"
                        type="email"
                        placeholder="EMAIL ADDRESS"
                        value={form.email}
                        onChange={update('email')}
                    />
                    <input
                        className="cm-input"
                        type="text"
                        placeholder="NAME"
                        value={form.name}
                        onChange={update('name')}
                    />
                    <input
                        className="cm-input"
                        type="text"
                        placeholder="SURNAME"
                        value={form.surname}
                        onChange={update('surname')}
                    />
                    <input
                        className="cm-input"
                        type="text"
                        placeholder="CARD NAME"
                        value={form.cardName}
                        onChange={update('cardName')}
                    />
                    <textarea
                        className="cm-textarea"
                        placeholder="SUMMARY"
                        value={form.summary}
                        onChange={update('summary')}
                    />
                    <textarea
                        className="cm-textarea"
                        placeholder="STEPS"
                        value={form.steps}
                        onChange={update('steps')}
                    />

                    <button type="submit" className="cm-send-btn">SEND</button>
                </form>
            </div>
        </div>
    );
};

export default CreateModal;
