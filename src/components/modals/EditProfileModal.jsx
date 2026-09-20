import React, { useEffect, useRef, useState } from 'react'
import { FiX, FiUser, FiEdit2, FiChevronLeft, FiChevronDown } from 'react-icons/fi'
import { MdAccountCircle } from 'react-icons/md'
import './EditProfileModal.css'
import { databases, DATABASE_ID, AGENTS_COLLECTION_ID } from '../../lib/appwrite.js'
import { updateAgent, uploadAvatar } from '../../lib/agents.js'
import { COUNTRIES, getFlagImageUrl } from '../../lib/countries.js'

const FRAME = 180; // crop preview diameter, px
const OUTPUT = 480; // exported avatar size, px

// Gold gradient defs for the header icon — mirrors modus_genius's
// GradientofGold MaskedView, same stops used across this app's other overlays.
const EpmSvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="epm-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgb(246,207,129)" />
                <stop offset="50%"  stopColor="rgb(201,151,44)" />
                <stop offset="100%" stopColor="rgb(246,207,129)" />
            </linearGradient>
        </defs>
    </svg>
);

// Mirrors modus_genius/app/(root)/profile/editprofile.tsx exactly: same field
// set (including the ones the old version of this modal was missing — I am
// Looking For / Experience / LinkedIn), same header bar, same diamond avatar,
// same gradient-text/gloss-pill styling used across this app's other overlays.
const EditProfileModal = ({ agentId, onClose, onBack, onSaved }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const [avatar, setAvatar] = useState('');
    const [avatarFileId, setAvatarFileId] = useState('');
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [title, setTitle] = useState('');
    const [email, setEmail] = useState('');
    const [lookingFor, setLookingFor] = useState('');
    const [experience, setExperience] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [location, setLocation] = useState('');
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);

    // Crop/reposition state — only populated while adjusting a freshly picked photo.
    const [pendingUrl, setPendingUrl] = useState('');
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const imgRef = useRef(null);
    const dragRef = useRef(null);

    useEffect(() => {
        if (!agentId) return;
        databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId)
            .then(doc => {
                setAvatar(doc.avatar || '');
                setAvatarFileId(doc.avatarFileId || '');
                setName(doc.name || '');
                setSurname(doc.surname || '');
                setTitle(doc.title || '');
                setEmail(doc.email || '');
                setLookingFor(doc.Iamlookingfor || '');
                setExperience(doc.Experience || '');
                setLinkedin(doc.LinkedIn || '');
                setLocation(doc.Location || '');
            })
            .catch(e => { console.error('Error loading profile', e); setError('Could not load your profile.'); })
            .finally(() => setLoading(false));
    }, [agentId]);

    useEffect(() => () => { if (pendingUrl) URL.revokeObjectURL(pendingUrl); }, [pendingUrl]);

    const handlePickAvatar = () => fileInputRef.current?.click();

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setNaturalSize({ w: 0, h: 0 });
        setPan({ x: 0, y: 0 });
        setZoom(1);
        setPendingUrl(URL.createObjectURL(file));
    };

    const handleImgLoad = () => {
        const img = imgRef.current;
        if (!img) return;
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    };

    const baseScale = naturalSize.w && naturalSize.h
        ? Math.max(FRAME / naturalSize.w, FRAME / naturalSize.h)
        : 1;
    const displayScale = baseScale * zoom;

    const clampPan = (next, scale) => {
        const iw = naturalSize.w * scale;
        const ih = naturalSize.h * scale;
        const maxX = Math.max(0, (iw - FRAME) / 2);
        const maxY = Math.max(0, (ih - FRAME) / 2);
        return {
            x: Math.min(maxX, Math.max(-maxX, next.x)),
            y: Math.min(maxY, Math.max(-maxY, next.y)),
        };
    };

    const onPointerDown = (e) => {
        dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPan(clampPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy }, displayScale));
    };
    const onPointerUp = () => { dragRef.current = null; };

    const handleZoomChange = (e) => {
        const z = Number(e.target.value);
        setZoom(z);
        setPan(prev => clampPan(prev, baseScale * z));
    };

    const cancelAdjust = () => {
        if (pendingUrl) URL.revokeObjectURL(pendingUrl);
        setPendingUrl('');
    };

    const confirmAdjust = () => {
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT;
        canvas.height = OUTPUT;
        const ctx = canvas.getContext('2d');
        const r = OUTPUT / FRAME;
        ctx.save();
        ctx.translate(OUTPUT / 2, OUTPUT / 2);
        ctx.translate(pan.x * r, pan.y * r);
        ctx.scale(displayScale * r, displayScale * r);
        ctx.drawImage(imgRef.current, -naturalSize.w / 2, -naturalSize.h / 2);
        ctx.restore();

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            setUploadingAvatar(true);
            setError('');
            try {
                const { url, fileId } = await uploadAvatar(croppedFile, avatarFileId);
                await updateAgent(agentId, { avatar: url, avatarFileId: fileId });
                setAvatar(url);
                setAvatarFileId(fileId);
                onSaved?.({ name, avatar: url });
                cancelAdjust();
            } catch (err) {
                console.error('Error uploading avatar', err);
                setError('Could not upload avatar.');
            } finally {
                setUploadingAvatar(false);
            }
        }, 'image/jpeg', 0.9);
    };

    const handleRemoveAvatar = async () => {
        setUploadingAvatar(true);
        setError('');
        try {
            await updateAgent(agentId, { avatar: null, avatarFileId: null });
            setAvatar('');
            setAvatarFileId('');
            onSaved?.({ name, avatar: '' });
        } catch (e) {
            console.error('Error removing avatar', e);
            setError('Could not remove avatar.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaved(false);
        setError('');
        try {
            await updateAgent(agentId, {
                name, surname, title, email,
                Iamlookingfor: lookingFor, Experience: experience, LinkedIn: linkedin,
                Location: location,
            });
            onSaved?.({ name, avatar });
            setSaved(true);
        } catch (e) {
            console.error('Error saving profile', e);
            setError('Could not save your profile.');
        } finally {
            setSaving(false);
        }
    };

    const flagUrl = getFlagImageUrl(location);
    const selectedCountry = COUNTRIES.find(c => c.code === location);

    return (
        <div className="epm-overlay" onClick={onClose}>
            <EpmSvgDefs />
            <div className="epm-panel" onClick={e => e.stopPropagation()}>
                <div className="epm-scroll">
                    <div className="epm-header-bar">
                        <button className="epm-back-btn" onClick={onBack || onClose} aria-label="Back">
                            <FiChevronLeft size={24} color="rgb(137,162,189)" />
                        </button>
                        <div className="epm-header-title">
                            <MdAccountCircle size={22} style={{ fill: 'url(#epm-g-gold) rgb(201,151,44)' }} />
                            <span className="epm-header-text">EDIT PROFILE</span>
                        </div>
                    </div>

                    {loading ? (
                        <p className="epm-loading">Loading…</p>
                    ) : pendingUrl ? (
                        <div className="epm-crop-section">
                            <div
                                className="epm-crop-frame"
                                onPointerDown={onPointerDown}
                                onPointerMove={onPointerMove}
                                onPointerUp={onPointerUp}
                                onPointerCancel={onPointerUp}
                            >
                                <img
                                    ref={imgRef}
                                    src={pendingUrl}
                                    alt=""
                                    onLoad={handleImgLoad}
                                    draggable={false}
                                    className="epm-crop-img"
                                    style={{ transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${displayScale})` }}
                                />
                            </div>
                            <p className="epm-crop-hint">Drag to reposition</p>
                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.02"
                                value={zoom}
                                onChange={handleZoomChange}
                                className="epm-zoom-slider"
                            />
                            <div className="epm-crop-actions">
                                <button type="button" className="epm-crop-cancel" onClick={cancelAdjust} disabled={uploadingAvatar}>
                                    Cancel
                                </button>
                                <button type="button" className="epm-crop-confirm" onClick={confirmAdjust} disabled={uploadingAvatar}>
                                    {uploadingAvatar ? 'Saving…' : 'Use photo'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="epm-avatar-section">
                                <div className="epm-diamond" onClick={handlePickAvatar} style={{ cursor: uploadingAvatar ? 'wait' : 'pointer' }}>
                                    <div className="epm-diamond-frame">
                                        <div className="epm-diamond-gold" />
                                        <div className="epm-diamond-inner">
                                            {avatar
                                                ? <img src={avatar} alt="" className="epm-diamond-img" />
                                                : <FiUser size={30} color="rgb(137,162,189)" style={{ transform: 'rotate(-45deg)' }} />}
                                        </div>
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="epm-file-input"
                                    onChange={handleFileChange}
                                />
                                {avatar && (
                                    <button type="button" className="epm-circle-btn epm-circle-btn-left" onClick={handleRemoveAvatar} disabled={uploadingAvatar} aria-label="Remove photo">
                                        <FiX size={17} color="rgb(137,162,189)" />
                                    </button>
                                )}
                                <button type="button" className="epm-circle-btn epm-circle-btn-right" onClick={handlePickAvatar} disabled={uploadingAvatar} aria-label="Change photo">
                                    <FiEdit2 size={15} color="rgb(137,162,189)" />
                                </button>
                            </div>

                            <form className="epm-form" onSubmit={handleSave}>
                                <span className="epm-label">Name</span>
                                <div className="epm-input-wrap">
                                    <input className="epm-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                                </div>

                                <span className="epm-label">Surname</span>
                                <div className="epm-input-wrap">
                                    <input className="epm-input" value={surname} onChange={e => setSurname(e.target.value)} placeholder="Your surname" />
                                </div>

                                <span className="epm-label">Title</span>
                                <div className="epm-input-wrap">
                                    <input className="epm-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Your professional title" />
                                </div>

                                <span className="epm-label">Email</span>
                                <div className="epm-input-wrap">
                                    <input className="epm-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" autoCapitalize="none" />
                                </div>

                                <span className="epm-label">I am Looking For</span>
                                <div className="epm-input-wrap">
                                    <textarea
                                        className="epm-input epm-multiline"
                                        value={lookingFor}
                                        onChange={e => setLookingFor(e.target.value)}
                                        placeholder="What are you looking for?"
                                        maxLength={300}
                                    />
                                </div>
                                <span className={`epm-char-count${lookingFor.length >= 300 ? ' epm-char-count-max' : ''}`}>
                                    {lookingFor.length}/300
                                </span>

                                <span className="epm-label">Experience</span>
                                <div className="epm-input-wrap">
                                    <textarea
                                        className="epm-input epm-multiline"
                                        value={experience}
                                        onChange={e => setExperience(e.target.value)}
                                        placeholder="Describe your experience"
                                        maxLength={500}
                                    />
                                </div>
                                <span className={`epm-char-count${experience.length >= 500 ? ' epm-char-count-max' : ''}`}>
                                    {experience.length}/500
                                </span>

                                <span className="epm-label">LinkedIn</span>
                                <div className="epm-input-wrap">
                                    <input className="epm-input" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/yourprofile" autoCapitalize="none" />
                                </div>

                                <span className="epm-label">Location</span>
                                <button
                                    type="button"
                                    className="epm-input-wrap epm-location-row"
                                    onClick={() => setCountryPickerOpen(true)}
                                >
                                    {selectedCountry ? (
                                        <>
                                            {flagUrl && <img src={flagUrl} alt="" className="epm-flag" />}
                                            <span className="epm-location-text">{selectedCountry.name}</span>
                                        </>
                                    ) : (
                                        <span className="epm-location-text epm-location-placeholder">Select your country</span>
                                    )}
                                    <FiChevronDown size={18} color="rgb(137,162,189)" />
                                </button>

                                {error && <p className="epm-error">{error}</p>}

                                <button type="submit" className="epm-save-btn" disabled={saving}>
                                    {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {countryPickerOpen && (
                <div className="epm-country-overlay" onClick={e => { e.stopPropagation(); setCountryPickerOpen(false); }}>
                    <div className="epm-country-panel" onClick={e => e.stopPropagation()}>
                        <div className="epm-country-header">
                            <span className="epm-country-title">Select Country</span>
                            <button type="button" className="epm-country-close" onClick={() => setCountryPickerOpen(false)} aria-label="Close">
                                <FiX size={20} color="rgb(137,162,189)" />
                            </button>
                        </div>
                        <div className="epm-country-list">
                            {COUNTRIES.map(c => (
                                <button
                                    type="button"
                                    key={c.code}
                                    className={`epm-country-row${location === c.code ? ' epm-country-row-selected' : ''}`}
                                    onClick={() => { setLocation(c.code); setCountryPickerOpen(false); }}
                                >
                                    <img src={getFlagImageUrl(c.code)} alt="" className="epm-flag" />
                                    <span className="epm-country-name">{c.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditProfileModal;
