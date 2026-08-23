import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';
import { DOMParser } from '@xmldom/xmldom';

async function test() {
  const docxPath = "K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\MASTER DOCUMENTS_superseded_20260819\\Guide\\Hindi\\Cluster_010_HINDI.docx";
  const buffer = fs.readFileSync(docxPath);
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  console.log("mammoth html length:", html.length);
  console.log("First 1000 chars of HTML:\n", html.slice(0, 1000));
}
test();
