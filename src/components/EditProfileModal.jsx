import React, { useEffect, useRef, useState } from 'react'
import { FiX, FiUser, FiCamera } from 'react-icons/fi'
import './EditProfileModal.css'
import { databases, DATABASE_ID, AGENTS_COLLECTION_ID } from '../lib/appwrite.js'
import { updateAgent, uploadAvatar } from '../lib/agents.js'
import { COUNTRIES, getFlagImageUrl } from '../lib/countries.js'

const FRAME = 180; // crop preview diameter, px
const OUTPUT = 480; // exported avatar size, px

const EditProfileModal = ({ agentId, onClose, onSaved }) => {
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
    const [location, setLocation] = useState('');

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
            await updateAgent(agentId, { name, surname, title, email, Location: location });
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

    return (
        <div className="epm-overlay" onClick={onClose}>
            <div className="epm-panel" onClick={e => e.stopPropagation()}>
                <div className="epm-scroll">
                    <button className="epm-close-btn" onClick={onClose} aria-label="Close">
                        <FiX size={18} />
                    </button>

                    <h3 className="epm-headline">Edit profile</h3>

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
                                <div className="epm-avatar-wrap">
                                    {avatar ? (
                                        <img src={avatar} alt="" className="epm-avatar-img" />
                                    ) : (
                                        <div className="epm-avatar-placeholder"><FiUser size={30} /></div>
                                    )}
                                    <button
                                        type="button"
                                        className="epm-avatar-pencil"
                                        onClick={handlePickAvatar}
                                        disabled={uploadingAvatar}
                                        aria-label="Change photo"
                                    >
                                        <FiCamera size={13} />
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="epm-file-input"
                                    onChange={handleFileChange}
                                />
                                {avatar && (
                                    <button type="button" className="epm-remove-avatar" onClick={handleRemoveAvatar} disabled={uploadingAvatar}>
                                        Remove photo
                                    </button>
                                )}
                            </div>

                            <form className="epm-form" onSubmit={handleSave}>
                                <label className="epm-label">Name</label>
                                <input className="epm-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />

                                <label className="epm-label">Surname</label>
                                <input className="epm-input" value={surname} onChange={e => setSurname(e.target.value)} placeholder="Your surname" />

                                <label className="epm-label">Title</label>
                                <input className="epm-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Your professional title" />

                                <label className="epm-label">Email</label>
                                <input className="epm-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" />

                                <label className="epm-label">Location</label>
                                <div className="epm-location-row">
                                    {flagUrl && <img src={flagUrl} alt="" className="epm-flag" />}
                                    <select className="epm-select" value={location} onChange={e => setLocation(e.target.value)}>
                                        <option value="">Select your country</option>
                                        {COUNTRIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {error && <p className="epm-error">{error}</p>}

                                <button type="submit" className="epm-save-btn" disabled={saving}>
                                    {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
