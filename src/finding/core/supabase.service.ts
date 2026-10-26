import { Injectable } from '@nestjs/common';
import { SupabaseService as CoreSupabaseService } from '../../core/supabase.service';

@Injectable()
export class SupabaseService {
  static get supabase() {
    return CoreSupabaseService.supabase;
  }
}
