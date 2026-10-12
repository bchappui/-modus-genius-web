import React, { useEffect, useMemo, useState } from 'react'
import { FiX, FiCopy, FiCheck, FiDownload, FiShare2 } from 'react-icons/fi'
import { FaLinkedin, FaFacebook, FaWhatsapp, FaXTwitter } from 'react-icons/fa6'
import { SiGmail } from 'react-icons/si'
import './ShareModal.css'

// With imageFile (a PNG File, e.g. the earned badge), the pop-up also shows
// that picture with "Share image" (the system share sheet, where supported:
// mobile, Windows/ChromeOS Chrome & Edge, Safari) and "Download". Until the
// file is ready (imageFile null), its spot shows "Preparing your image…".
const ShareModal = ({ property, id, name, paramName = 'property', title = 'Share this card', imageFile, shareText: imageShareText, onClose }) => {
    const [copied, setCopied] = useState(false);
    const withImage = imageFile !== undefined;
    const imageUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
    useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
    const canShareImage = !!imageFile && !!navigator.canShare?.({ files: [imageFile] });

    const shareId = id ?? property?.$id ?? '';
    const shareName = name ?? property?.name;
    const shareUrl = `${window.location.origin}${window.location.pathname}?${paramName}=${shareId}`;
    const shareText = shareName ? `Check out "${shareName}" on Modus Genius` : 'Check this out on Modus Genius';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed', e);
        }
    };

    const handleShareImage = async () => {
        try {
            await navigator.share({ files: [imageFile], text: imageShareText });
        } catch (e) {
            // AbortError: the share sheet was closed without sharing.
            if (e?.name !== 'AbortError') console.error('Image share failed', e);
        }
    };

    const links = [
        {
            name: 'LinkedIn',
            icon: <FaLinkedin size={20} />,
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
            color: '#0A66C2',
        },
        {
            name: 'Facebook',
            icon: <FaFacebook size={20} />,
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            color: '#1877F2',
        },
        {
            name: 'WhatsApp',
            icon: <FaWhatsapp size={20} />,
            href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
            color: '#25D366',
        },
        {
            name: 'Twitter',
            icon: <FaXTwitter size={20} />,
            href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
            color: '#000000',
        },
        {
            name: 'Gmail',
            icon: <SiGmail size={18} />,
            href: `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
            color: '#EA4335',
        },
    ];

    return (
        <div className="sm-overlay" onClick={onClose}>
            <div className="sm-modal" onClick={e => e.stopPropagation()}>
                <button className="sm-close" onClick={onClose} aria-label="Close">
                    <FiX size={20} />
                </button>

                <h3 className="sm-title">{title}</h3>

                {withImage && (
                    <div className="sm-image-block">
                        {imageUrl
                            ? <img src={imageUrl} alt="" className="sm-image-preview" />
                            : <div className="sm-image-preview sm-image-preview--loading">Preparing your image…</div>}
                        <div className="sm-image-actions">
                            {canShareImage && (
                                <button className="sm-copy-btn sm-image-btn" onClick={handleShareImage}>
                                    <FiShare2 size={15} />Share image
                                </button>
                            )}
                            <a
                                className={`sm-copy-btn sm-image-btn${canShareImage ? ' sm-image-btn--secondary' : ''}${imageUrl ? '' : ' sm-image-btn--disabled'}`}
                                href={imageUrl || undefined}
                                download={imageFile?.name}
                                aria-disabled={!imageUrl}
                            >
                                <FiDownload size={15} />Download
                            </a>
                        </div>
                    </div>
                )}

                <div className="sm-link-row">
                    <input
                        className="sm-link-input"
                        value={shareUrl}
                        readOnly
                        onFocus={e => e.target.select()}
                    />
                    <button className="sm-copy-btn" onClick={handleCopy}>
                        {copied ? <FiCheck size={15} /> : <FiCopy size={15} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>

                <div className="sm-icons-row">
                    {links.map(link => (
                        <a
                            key={link.name}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sm-icon-btn"
                            style={{ '--sm-icon-color': link.color }}
                            aria-label={`Share on ${link.name}`}
                        >
                            <span className="sm-icon-circle">{link.icon}</span>
                            <span className="sm-icon-label">{link.name}</span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
