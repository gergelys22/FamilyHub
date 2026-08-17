import { supabase } from '@/lib/supabase';

export type Family = {
    id: string;
    name: string;
    created_at: string;
};

export async function createFamily(name: string): Promise<string> {
    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
        throw new Error('A család neve legalább 2 karakter hosszú kell legyen.');
    }

    const { data, error } = await supabase.rpc('create_family', {
        family_name: normalizedName,
    });

    if (error) {
        throw new Error(error.message);
    }

    if (typeof data !== 'string') {
        throw new Error('A család létrehozása nem adott vissza érvényes azonosítót.');
    }

    return data;
};

export async function getMyFamilies(): Promise<Family[]> {
    const { data, error } = await supabase
        .from('families')
        .select('id, name, created_at')
        .order('created_at', { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as Family[];

}