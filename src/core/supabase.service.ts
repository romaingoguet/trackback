import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private static _instance: SupabaseClient;

  static async init(): Promise<void> {
    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.',
      );
    }

    this._instance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  static get supabase(): SupabaseClient {
    if (!SupabaseService._instance) {
      throw new Error('Supabase client not initialized. Call SupabaseService.init() first.');
    }
    return SupabaseService._instance;
  }

  static getClient(): SupabaseClient {
    return this._instance;
  }
}
