import 'dotenv/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SupabaseService } from './core/supabase.service';
import { GeminiService } from './finding/gemini.service';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Load environment variables from .env file
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  // Initialize Supabase client
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      await SupabaseService.init();
      console.log('✅ Supabase connected');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to connect to Supabase: ${errorMsg}`);
  }

  // Initialize Gemini client
  try {
    await GeminiService.init();
    console.log('✅ Gemini connected');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to connect to Gemini: ${errorMsg}`);
  }

  // Enable CORS for all origins (for development)
  app.enableCors({
    origin: '*', // Allow requests from any origin (including file:// URLs)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useStaticAssets(join(process.cwd(), 'public'));

  // Set up request logging and static file serving
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // Serve static HTML files from public directory
    if (req.url === '/') req.url = '/index.html';
    else if (req.url === '/add') req.url = '/add-recording.html';

    console.log(req.url)

    next();
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);

  console.log(`\n🚀 TrackBack running at http://localhost:${port}`);
  console.log(`   📄 View recordings: http://localhost:${port}/`);
  console.log(`   ➕ Add recording: http://localhost:${port}/add\n`);
}

bootstrap();
