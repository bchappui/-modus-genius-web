function loadImageSize(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = dataUrl;
    });
}

export async function buildPdfFromDataUrls(dataUrls, filename) {
    if (!dataUrls.length) return;
    const { jsPDF } = await import('jspdf');

    const pages = await Promise.all(dataUrls.map(async d => ({ d, ...(await loadImageSize(d)) })));
    const first = pages[0];
    const pdf = new jsPDF({ unit: 'px', format: [first.width, first.height] });

    pages.forEach((page, i) => {
        if (i > 0) pdf.addPage([page.width, page.height]);
        pdf.addImage(page.d, 'PNG', 0, 0, page.width, page.height);
    });

    pdf.save(filename);
}
