import { supabase } from "../supabase/SupabaseClient";

export const apiFetch = async (url, options = {}) => {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    return fetch(`http://localhost:8000${url}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });
};