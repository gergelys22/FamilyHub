import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type PlaceSuggestion = {
    id: string;
    label: string;
    latitude?: number;
    longitude?: number;
};

export async function searchPlaces(
    text: string,
    signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
    const { data, error } = await supabase.functions.invoke<{
        suggestions: PlaceSuggestion[];
    }>('search-places', {
        body: { text },
        signal,
        timeout: 12000,
    });

    if (error) {
        let message = 'Nem sikerült keresni. Ellenőrizd az internetkapcsolatot, és próbáld újra.';

        if(error instanceof FunctionsHttpError) {
            const body = await error.context.json().catch(() => null);

            if(error.context.status === 401) {
                message = 'A kereséshez újra be kell jelentkezned.'
            } else if (typeof body?.error === 'string') {
                message = body.error;
            }
        }
        throw new Error(message);
    }

    if (!data || !Array.isArray(data.suggestions)) {
        throw new Error('Érvénytelen válasz érkezett a helyszínkeresőtől.');
    }

    return data.suggestions.filter(
        (item) =>
            item &&
            typeof item.id === 'string' &&
            typeof item.label === 'string' &&
            (item.latitude === undefined || Number.isFinite(item.latitude)) &&
            (item.longitude === undefined || Number.isFinite(item.longitude)),
    );
}
