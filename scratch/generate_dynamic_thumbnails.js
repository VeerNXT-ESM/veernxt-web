import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables manually if not using a bundler
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error("Missing required environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, GEMINI_API_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Define category colors based on the design spec
const getCategoryColor = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('intro')) return 'deep royal blue tones';
  if (cat.includes('precis')) return 'muted antique gold tones';
  if (cat.includes('pyq')) return 'deep royal red/burgundy tones';
  if (cat.includes('mock')) return 'slate charcoal-blue tones';
  return 'royal green tones'; // default for guide/other
};

async function generateThumbnailBackground(resource) {
  const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
  
  const color = getCategoryColor(resource.category);
  const prompt = `Premium aged-parchment textured background for a certificate-style book cover, portrait orientation. 
Subtle vignette, fine decorative corner-frame border in muted gold matching an ornate heraldic crest design. 
The top 60% of the image must be completely plain, low-detail and evenly toned with NO text, NO numbers, NO illustrations, and NO objects.
All illustrative detail belongs ONLY in the bottom 25% of the frame. 
In the bottom 25% of the frame, draw a subtle illustrative motif representing ${resource.subject || resource.category || 'education'}. 
Dominant color: ${color} throughout the parchment texture.
No text, no letters, no words anywhere in the image.`;

  console.log(`Generating image for ${resource.resource_id} (${resource.subject})...`);
  
  try {
    const result = await model.generateImages({
      prompt: prompt,
      numberOfImages: 1,
      aspectRatio: '2:3', // Portrait orientation
      outputMimeType: "image/jpeg",
    });

    const base64Image = result.images[0].image.base64;
    return Buffer.from(base64Image, 'base64');
  } catch (error) {
    console.error(`Failed to generate image for ${resource.resource_id}:`, error.message);
    return null;
  }
}

async function uploadToR2(buffer, resourceId) {
  // In a real Node environment without the browser S3 SDK, you'd use AWS SDK v3 for S3:
  // import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
  // For demonstration in this script, we'll save locally so you can review them,
  // or you can plug in the AWS S3 client here.
  
  const outputDir = path.join(process.cwd(), 'generated_thumbnails');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  
  const filePath = path.join(outputDir, `${resourceId}_bg.jpg`);
  fs.writeFileSync(filePath, buffer);
  
  console.log(`Saved background to ${filePath}`);
  return filePath;
}

async function main() {
  console.log("Fetching resources from Supabase...");
  const { data: resources, error } = await supabase
    .from('resources_v2')
    .select('resource_id, title, subject, category, exam_name')
    .limit(5); // Testing with 5 resources first

  if (error) {
    console.error("Supabase Error:", error);
    return;
  }

  console.log(`Found ${resources.length} resources. Starting generation pipeline...`);

  for (const resource of resources) {
    // 1. Generate the base background using Gemini Imagen
    const imageBuffer = await generateThumbnailBackground(resource);
    
    if (imageBuffer) {
      // 2. Upload to R2 (currently saving locally for review)
      const uploadedPath = await uploadToR2(imageBuffer, resource.resource_id);
      
      // 3. Update Supabase record with new background URL
      // await supabase.from('resources_v2').update({ thumbnail_bg_url: uploadedPath }).eq('resource_id', resource.resource_id);
    }
    
    // Pause briefly to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log("Batch processing complete.");
}

main();
