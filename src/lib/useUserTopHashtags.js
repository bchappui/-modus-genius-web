import { useEffect, useState } from 'react';
import { getUserTopHashtags, getPropertiesByHashtags } from './discover.js';

// Web port of modus_genius/lib/useUserTopHashtags.ts (no Animated.Value — the
// web carousel just uses native CSS horizontal scroll).
export function useUserTopHashtags(userId) {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) { setSections([]); return; }
        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const hashtags = await getUserTopHashtags(userId);
                if (cancelled) return;
                if (hashtags.length === 0) { setSections([]); setLoading(false); return; }

                setSections(hashtags.map(h => ({
                    hashtagId: h.hashtagId,
                    hashtagName: h.hashtagName,
                    properties: [],
                    loading: true,
                })));

                const results = await Promise.all(
                    hashtags.map(h => getPropertiesByHashtags({ hashtagIds: [h.hashtagId], limit: 10 }))
                );
                if (cancelled) return;

                setSections(hashtags.map((h, i) => ({
                    hashtagId: h.hashtagId,
                    hashtagName: h.hashtagName,
                    properties: results[i].items,
                    loading: false,
                })));
            } catch (e) {
                console.error('useUserTopHashtags error', e);
                if (!cancelled) setSections([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [userId]);

    return { sections, loading };
}
