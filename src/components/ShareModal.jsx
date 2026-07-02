import React, { useState } from 'react'
import { FiX, FiCopy, FiCheck } from 'react-icons/fi'
import { FaLinkedin, FaFacebook, FaWhatsapp, FaXTwitter } from 'react-icons/fa6'
import { SiGmail } from 'react-icons/si'
import './ShareModal.css'

const ShareModal = ({ property, onClose }) => {
    const [copied, setCopied] = useState(false);

    const shareUrl = `${window.location.origin}${window.location.pathname}?property=${property?.$id ?? ''}`;
    const shareText = property?.name ? `Check out "${property.name}" on Modus Genius` : 'Check this out on Modus Genius';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed', e);
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

                <h3 className="sm-title">Share this card</h3>

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
