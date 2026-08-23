const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { marked } = require('marked');
const HTMLtoDOCX = require('html-to-docx');
const { GoogleGenAI } = require('@google/genai');

require('dotenv').config({ path: '../.env' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
    const sourcePath = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\MASTER DOCUMENTS\\Precis\\GK-GS\\Cluster_001_SSC COMPLETE GK.docx';
    const outputPath = path.join(__dirname, 'Cluster_001_SSC_Beautiful.docx');

    console.log(`Extracting text from ${sourcePath}...`);
    const result = await mammoth.extractRawText({ path: sourcePath });
    const text = result.value;

    // Grab a larger chunk to get 2-3 chapters
    const testText = text.substring(15000, 30000); 

    const promptFile = fs.readFileSync(path.join(__dirname, '../content_rewrite_prompt.md'), 'utf-8');
    const systemPrompt = `${promptFile}\n\nHere is the source text to format:\n\n${testText}`;

    console.log('Calling Gemini API for typesetting (this will take a bit longer for more chapters)...');
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: systemPrompt,
        config: {
            temperature: 0.1 // VERY low temp because we are strictly typesetting
        }
    });

    let markdown = response.text;
    console.log('Gemini finished parsing.');
    
    // Save debug markdown
    fs.writeFileSync(path.join(__dirname, 'debug.md'), markdown);

    // Load a real local image (the earth core diagram we generated earlier) and convert to base64
    const imagePath = 'C:\\Users\\mmu\\.gemini\\antigravity-ide\\brain\\378d65f1-a11b-4b1c-b940-a07fee5028fd\\earth_core_diagram_1787247266084.jpg';
    let base64Image = '';
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    } catch (e) {
        console.error("Could not load local image, falling back...", e);
    }

    // Replace ONLY the first image prompt with the real base64 image, and remove the rest for the demo
    if (base64Image) {
        let isFirst = true;
        markdown = markdown.replace(/!\[.*?\]\(PROMPT:.*?\)/g, (match) => {
            if (isFirst) {
                isFirst = false;
                return `![Educational Image](${base64Image})`;
            }
            return ''; // Remove other image prompts for the demo
        });
    }

    // Parse to HTML
    console.log('Converting Markdown to HTML...');
    const htmlString = marked.parse(markdown);

    // Update inline CSS for html-to-docx
    const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    font-family: 'Palatino Linotype', Palatino, serif; 
                    font-size: 11pt; 
                    color: #333333; /* 80% grey */
                    line-height: 1.6;
                }
                h1, h2, h3 { 
                    font-family: 'Helvetica', Arial, sans-serif; 
                }
                h1 { font-size: 24pt; color: #6b21a8; /* Deep purple */ border-bottom: 2px solid #d8b4fe; padding-bottom: 10px; margin-bottom: 20px; }
                h2 { font-size: 16pt; margin-top: 24px; color: #0d9488; /* Teal */ }
                h3 { font-size: 14pt; color: #0f766e; }
                blockquote { 
                    margin: 20px 0; 
                    padding: 15px 20px; 
                    background-color: #fef9c3; /* Pastel yellow */
                    border-left: 4px solid #eab308; 
                    font-style: italic;
                    color: #854d0e;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 25px 0; 
                    font-family: 'Helvetica', Arial, sans-serif; 
                    font-size: 10pt;
                }
                th { 
                    background-color: #f3e8ff; /* Pastel purple */
                    padding: 12px; 
                    border: 1px solid #d8b4fe; 
                    color: #6b21a8; 
                    text-align: left; 
                }
                td { 
                    padding: 12px; 
                    border: 1px solid #e2e8f0; 
                    background-color: #f8fafc; 
                }
                img { max-width: 100%; margin: 20px 0; }
            </style>
        </head>
        <body>
            ${htmlString}
        </body>
        </html>
    `;

    // Fix bug in html-to-docx
    console.warning = console.warn;

    console.log('Generating beautiful DOCX...');
    const fileBuffer = await HTMLtoDOCX(styledHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
    });

    fs.writeFileSync(outputPath, fileBuffer);
    console.log(`Success! Beautiful DOCX saved to ${outputPath}`);
}

main().catch(console.error);
