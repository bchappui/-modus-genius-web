async function waitForImages(node) {
    const imgs = Array.from(node.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        });
    }));
}

export async function captureNode(node, pixelRatio = 2) {
    const { toPng } = await import('html-to-image');
    await waitForImages(node);
    return toPng(node, { pixelRatio, cacheBust: true });
}

export function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
