import React, { useEffect, useRef, useState } from 'react'
import { FiX, FiEdit2, FiChevronLeft, FiImage } from 'react-icons/fi'
import { MdHomeWork } from 'react-icons/md'
import './EditProfileModal.css'
import { createHouse } from '../../lib/houses.js'

const FRAME = 180; // crop preview diameter, px
const OUTPUT = 480; // exported image size, px

const EpmSvgDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <linearGradient id="chm-g-gold" x1="0" y1="0.2" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgb(246,207,129)" />
                <stop offset="50%"  stopColor="rgb(201,151,44)" />
                <stop offset="100%" stopColor="rgb(246,207,129)" />
            </linearGradient>
        </defs>
    </svg>
);

const QUOTE_MAX = 300;

// Same look as EditProfileModal (header bar, diamond image + crop/zoom step,
// epm-* form fields). Unlike the profile photo, the cropped house image is
// kept locally and only uploaded when the house is actually created.
const CreateHouseModal = ({ agentId, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [quotation, setQuotation] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const [pendingUrl, setPendingUrl] = useState('');
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const imgRef = useRef(null);
    const dragRef = useRef(null);

    useEffect(() => () => { if (pendingUrl) URL.revokeObjectURL(pendingUrl); }, [pendingUrl]);
    useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

    const handlePick = () => fileInputRef.current?.click();

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
        if (img) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    };

    const baseScale = naturalSize.w && naturalSize.h ? Math.max(FRAME / naturalSize.w, FRAME / naturalSize.h) : 1;
    const displayScale = baseScale * zoom;

    const clampPan = (next, scale) => {
        const maxX = Math.max(0, (naturalSize.w * scale - FRAME) / 2);
        const maxY = Math.max(0, (naturalSize.h * scale - FRAME) / 2);
        return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
    };

    const onPointerDown = (e) => {
        dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (!dragRef.current) return;
        setPan(clampPan({
            x: dragRef.current.panX + e.clientX - dragRef.current.startX,
            y: dragRef.current.panY + e.clientY - dragRef.current.startY,
        }, displayScale));
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
        ctx.translate(OUTPUT / 2, OUTPUT / 2);
        ctx.translate(pan.x * r, pan.y * r);
        ctx.scale(displayScale * r, displayScale * r);
        ctx.drawImage(imgRef.current, -naturalSize.w / 2, -naturalSize.h / 2);
        canvas.toBlob((blob) => {
            if (!blob) return;
            setImageFile(new File([blob], 'house.jpg', { type: 'image/jpeg' }));
            setImagePreview(URL.createObjectURL(blob));
            cancelAdjust();
        }, 'image/jpeg', 0.9);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!imageFile) { setError('Please choose an image for your house.'); return; }
        if (!name.trim()) { setError('Please give your house a name.'); return; }
        setSaving(true);
        setError('');
        try {
            const house = await createHouse({ name: name.trim(), quotation: quotation.trim(), imageFile, ownerId: agentId });
            onCreated?.(house);
        } catch (err) {
            console.error('createHouse error:', err);
            setError(err.message || 'Could not create your house.');
            setSaving(false);
        }
    };

    return (
        <div className="epm-overlay" onClick={onClose}>
            <EpmSvgDefs />
            <div className="epm-panel" onClick={e => e.stopPropagation()}>
                <div className="epm-scroll">
                    <div className="epm-header-bar">
                        <button className="epm-back-btn" onClick={onClose} aria-label="Close">
                            <FiChevronLeft size={24} color="rgb(137,162,189)" />
                        </button>
                        <div className="epm-header-title">
                            <MdHomeWork size={22} style={{ fill: 'url(#chm-g-gold) rgb(201,151,44)' }} />
                            <span className="epm-header-text">CREATE MY HOUSE</span>
                        </div>
                    </div>

                    {pendingUrl ? (
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
                            <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={handleZoomChange} className="epm-zoom-slider" />
                            <div className="epm-crop-actions">
                                <button type="button" className="epm-crop-cancel" onClick={cancelAdjust}>Cancel</button>
                                <button type="button" className="epm-crop-confirm" onClick={confirmAdjust}>Use image</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="epm-avatar-section">
                                <div className="epm-diamond" onClick={handlePick} style={{ cursor: 'pointer' }}>
                                    <div className="epm-diamond-frame">
                                        <div className="epm-diamond-gold" />
                                        <div className="epm-diamond-inner">
                                            {imagePreview
                                                ? <img src={imagePreview} alt="" className="epm-diamond-img" />
                                                : <FiImage size={30} color="rgb(137,162,189)" style={{ transform: 'rotate(-45deg)' }} />}
                                        </div>
                                    </div>
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="epm-file-input" onChange={handleFileChange} />
                                {imagePreview && (
                                    <button type="button" className="epm-circle-btn epm-circle-btn-left" onClick={() => { setImageFile(null); setImagePreview(''); }} aria-label="Remove image">
                                        <FiX size={17} color="rgb(137,162,189)" />
                                    </button>
                                )}
                                <button type="button" className="epm-circle-btn epm-circle-btn-right" onClick={handlePick} aria-label="Choose image">
                                    <FiEdit2 size={15} color="rgb(137,162,189)" />
                                </button>
                            </div>

                            <form className="epm-form" onSubmit={handleSave}>
                                <span className="epm-label">Name</span>
                                <div className="epm-input-wrap">
                                    <input className="epm-input" value={name} onChange={e => setName(e.target.value)} placeholder="Name of your house" maxLength={60} />
                                </div>

                                <span className="epm-label">Motto</span>
                                <div className="epm-input-wrap">
                                    <textarea
                                        className="epm-input epm-multiline"
                                        value={quotation}
                                        onChange={e => setQuotation(e.target.value)}
                                        placeholder="The motto of your house"
                                        maxLength={QUOTE_MAX}
                                    />
                                </div>
                                <span className={`epm-char-count${quotation.length >= QUOTE_MAX ? ' epm-char-count-max' : ''}`}>
                                    {quotation.length}/{QUOTE_MAX}
                                </span>

                                {error && <p className="epm-error">{error}</p>}

                                <button type="submit" className="epm-save-btn" disabled={saving}>
                                    {saving ? 'Creating…' : 'Create House'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateHouseModal;
