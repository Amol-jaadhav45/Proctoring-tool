import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock supabase client if env vars are missing (for Convex-only mode)
// This prevents the app from crashing, but Supabase calls will fail gracefully
let supabase: any;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase not configured - using Convex only. Some features may not work.');

    // Create a robust mock client that supports chaining
    const createMockBuilder = () => {
        const mockResult = Promise.resolve({
            data: [],
            error: { message: 'Supabase not configured' },
            count: 0
        });

        // Builder that returns itself for chaining
        const builder: any = {
            select: () => builder,
            eq: () => builder,
            neq: () => builder,
            gt: () => builder,
            gte: () => builder,
            lt: () => builder,
            lte: () => builder,
            in: () => builder,
            is: () => builder,
            like: () => builder,
            ilike: () => builder,
            contains: () => builder,
            order: () => builder,
            limit: () => builder,
            range: () => builder,
            single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            insert: () => builder,
            update: () => builder,
            delete: () => builder,
            // Allow awaiting the builder directly
            then: (onfulfilled: any, onrejected: any) => mockResult.then(onfulfilled, onrejected),
            catch: (onrejected: any) => mockResult.catch(onrejected),
            finally: (onfinally: any) => mockResult.finally(onfinally)
        };
        return builder;
    };

    supabase = {
        from: () => createMockBuilder()
    };
} else {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
