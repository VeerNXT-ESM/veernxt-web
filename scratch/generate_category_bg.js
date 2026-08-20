import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in environment variables.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const categories = [
  { id: 'guide', name: 'Guide', color: 'royal green tones', motif: 'an antique open book and a glowing candle' },
  { id: 'intro', name: 'Intro', color: 'deep royal blue tones', motif: 'a classic compass and navigation tools' },
  { id: 'pyq', name: 'PYQ', color: 'deep royal red and burgundy tones', motif: 'a stack of vintage exam papers and an hourglass' },
  { id: 'mock', name: 'Mock Test', color: 'slate charcoal-blue tones', motif: 'a subtle target bullseye and an antique pocket watch' },
  { id: 'precis', name: 'Precis', color: 'muted antique gold tones', motif: 'a traditional inkwell and a feather quill pen' }
];

async function generateBackground(category) {
  const prompt = `Premium aged-parchment textured background for a certificate-style book cover, portrait orientation. 
Subtle vignette, fine decorative corner-frame border in muted gold matching an ornate heraldic crest design. 
The top 60% of the image must be completely plain, low-detail and evenly toned with NO text, NO numbers, NO illustrations, and NO objects.
All illustrative detail belongs ONLY in the bottom 25% of the frame. 
In the bottom 25% of the frame, draw a subtle illustrative motif representing ${category.motif}. 
Dominant color: ${category.color} throughout the parchment texture.
No text, no letters, no words anywhere in the image.`;

  console.log(`Generating image for ${category.name} (${category.color})...`);
  
  try {
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    });

    const url = response.data[0].url;
    const fetchRes = await fetch(url);
    const arrayBuffer = await fetchRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Failed to generate image for ${category.name}:`, error.message);
    return null;
  }
}

async function main() {
  const outputDir = path.join(process.cwd(), 'public/thumbnails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const cat of categories) {
    const filePath = path.join(outputDir, `bg_${cat.id}.jpg`);
    if (fs.existsSync(filePath)) {
      console.log(`Skipping ${cat.name}, already exists at ${filePath}`);
      continue;
    }

    const imageBuffer = await generateBackground(cat);
    if (imageBuffer) {
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`✅ Saved ${cat.name} background to ${filePath}`);
    }
    
    // Small pause to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log("All base backgrounds generated!");
}

main();
