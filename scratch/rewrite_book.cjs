require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const mammoth = require('mammoth');
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });

const targetDoc = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\MASTER DOCUMENTS\\Precis\\GK-GS\\Cluster_001_SSC COMPLETE GK.docx';
const promptFile = '../content_rewrite_prompt.md';
const outputFile = 'rewritten_gk_sample.md';

async function main() {
    console.log(`Extracting text from ${targetDoc}...`);
    
    // 1. Extract text from docx
    const result = await mammoth.extractRawText({ path: targetDoc });
    const fullText = result.value;
    console.log(`Extracted ${fullText.length} characters.`);
    
    // Take a slice for this test run (approx first chapter)
    const textSlice = fullText.substring(0, 5000);
    console.log(`Using first ${textSlice.length} characters for the test run.`);

    // 2. Load and build the prompt
    let systemPrompt = fs.readFileSync(promptFile, 'utf8');
    
    // Replace placeholders
    systemPrompt = systemPrompt.replace('{{exam_name}}', 'SSC CGL');
    systemPrompt = systemPrompt.replace('{{conducting_body}}', 'Staff Selection Commission');
    systemPrompt = systemPrompt.replace('{{Intro | Guide | Precis}}', 'Guide');
    systemPrompt = systemPrompt.replace('{{subject, e.g. Reasoning / English / Mathematics / General Knowledge}}', 'General Knowledge');
    systemPrompt = systemPrompt.replace('{{REWRITE — this content is duplicated across other exams and needs to become unique | PROOFREAD — this content is already exam-specific and unique; only fix grammar, typos, clarity, and formatting/structure, do not change its substance or examples}}', 'REWRITE — this content is duplicated across other exams and needs to become unique');
    systemPrompt = systemPrompt.replace('{{paste or attach the source .docx / extracted text}}', `\n\n--- SOURCE DOCUMENT CONTENT ---\n\n${textSlice}\n\n--- END OF SOURCE ---`);
    systemPrompt = systemPrompt.replace('{{list of exam names + short summaries or links, if available}}', 'None available for this pass.');

    console.log("Calling Gemini API...");

    // 3. Call Gemini API
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: systemPrompt,
            config: {
                temperature: 0.4 // keep it relatively deterministic but creative enough for rewrite
            }
        });

        const markdownText = response.text;
        
        // 4. Save Output
        fs.writeFileSync(outputFile, markdownText);
        console.log(`\nSuccess! Wrote ${markdownText.length} characters to ${outputFile}`);
        
    } catch (error) {
        console.error("API Call Failed:", error);
    }
}

main().catch(console.error);
