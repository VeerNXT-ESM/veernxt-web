"""
scripts/structure_pyps_replicate.py

Reads raw text files from FINAL_PYPS_OCR_TEXT and uses Replicate (Llama 3 70B)
to structure them into JSON files in FINAL_PYPS_STRUCTURED.
"""

import os
import json
import time
import re
import replicate
from dotenv import load_dotenv

ENV_PATH = r"K:\H DRIVE\Quantum Climb\APPS\VeerNXT\VeerNXT Main Repo\VeerNXT APP\veernxt-web\.env"
load_dotenv(ENV_PATH)

TEXT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\MASTER_PYPS"
OUTPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_PYPS_STRUCTURED"

os.makedirs(OUTPUT_DIR, exist_ok=True)

PROMPT_TEMPLATE = """You are an expert exam content compiler. Your task is to extract all questions and multiple-choice options from the provided exam paper text and structure them into a valid JSON document.

Do NOT solve or answer the questions, and do NOT write explanations. For every question, set "correct_option" to null and "explanation" to "" in the JSON response.

Do NOT summarize the questions. Maintain the exact text.
For each group of questions, identify the subject/section of the questions and group them under the correct "section_name" (e.g., General Intelligence & Reasoning, Quantitative Aptitude, General Awareness, English Language, Hindi Language, Law & Constitution, etc.). If the exam paper only has a single subject, group all questions under that subject's name.

Return ONLY a JSON object conforming to the following structure:
{
  "metadata": {
    "title": "Clean Title of the Exam Paper"
  },
  "sections": [
    {
      "section_name": "Subject/Section Name",
      "questions": [
        {
          "question_number": 1,
          "question_text": "Text of the question...",
          "options": [
            "A) Option A text",
            "B) Option B text",
            "C) Option C text",
            "D) Option D text"
          ],
          "correct_option": null,
          "explanation": ""
        }
      ]
    }
  ]
}

If the text has no readable exam questions at all, return {"metadata": {"title": "UNREADABLE"}, "sections": []}.

Here is the raw OCR text of the exam paper chunk:
---
{raw_text}
---
"""

def structure_with_replicate(raw_text):
    prompt = PROMPT_TEMPLATE.replace("{raw_text}", raw_text[:30000]) # Cap input length
    max_retries = 3
    
    for attempt in range(1, max_retries + 1):
        try:
            output = replicate.run(
                "meta/meta-llama-3-70b-instruct",
                input={
                    "prompt": prompt,
                    "system_prompt": "You are a helpful assistant that strictly outputs valid JSON and nothing else. Do not output Markdown code blocks or any conversational text.",
                    "temperature": 0.1,
                    "max_tokens": 8000
                }
            )
            
            text_out = "".join(output).strip()
            
            # Clean up potential markdown formatting
            if text_out.startswith("```"):
                text_out = "\n".join(text_out.split("\n")[1:])
                if text_out.endswith("```"):
                    text_out = text_out[:-3]
                text_out = text_out.strip()
                
            return json.loads(text_out)
        except Exception as e:
            if attempt == max_retries:
                raise e
            print(f"      [Retrying] API attempt {attempt} failed: {e}. Sleeping 5s...")
            time.sleep(5)


def process_files():
    text_files = []
    for root, _, files in os.walk(TEXT_DIR):
        for f in files:
            if f.endswith(".txt"):
                text_files.append(os.path.join(root, f))
                
    print(f"Found {len(text_files)} text files to process in {TEXT_DIR}.")
    
    for i, txt_path in enumerate(text_files, 1):
        txt_file = os.path.basename(txt_path)
        json_file = txt_file.replace(".txt", ".json")
        json_path = os.path.join(OUTPUT_DIR, json_file)
        
        # Resumable
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
                existing_q_count = sum(len(s.get("questions", [])) for s in existing.get("sections", []))
                if existing_q_count > 0:
                    print(f"[{i}/{len(text_files)}] [SKIPPED] {json_file} (already done)")
                    continue
                else:
                    print(f"[{i}/{len(text_files)}] [RETRYING] {json_file} (previous file had 0 structured questions)")
            except Exception:
                pass

        print(f"[{i}/{len(text_files)}] Processing {txt_file}...")
        
        try:
            with open(txt_path, "r", encoding="utf-8") as f:
                full_text = f.read()
            
            # Simple chunking by splitting every 15000 chars roughly to respect max context limits
            chunk_size = 15000
            text_chunks = [full_text[j:j+chunk_size] for j in range(0, len(full_text), chunk_size)]
            
            merged_title = os.path.splitext(txt_file)[0]
            merged_sections_map = {}
            
            for chunk_idx, chunk_text in enumerate(text_chunks):
                if len(chunk_text.strip()) < 50:
                    continue
                
                structured_chunk = structure_with_replicate(chunk_text)
                
                if chunk_idx == 0 and structured_chunk.get("metadata", {}).get("title") not in [None, "UNREADABLE"]:
                    merged_title = structured_chunk["metadata"]["title"]
                
                for section in structured_chunk.get("sections", []):
                    sec_name = section.get("section_name") or "General Studies"
                    if sec_name not in merged_sections_map:
                        merged_sections_map[sec_name] = []
                    
                    for q in section.get("questions", []):
                        q_text = (q.get("question_text") or "").strip()
                        opts = q.get("options") or []
                        if q_text:
                            merged_sections_map[sec_name].append({
                                "question_text": q_text,
                                "options": [str(o).strip() for o in opts]
                            })
                        else:
                            print(f"      [DEBUG] Skipped an item in {txt_file} because it lacked 'question_text'")
            
            merged_sections = []
            global_q_num = 1
            
            for sec_name, questions in merged_sections_map.items():
                if not questions:
                    continue
                sec_questions = []
                for q in questions:
                    formatted_opts = []
                    # Dynamically label options based on how many were returned (A, B, C, D, E, F...)
                    labels = [chr(65 + idx) for idx in range(max(4, len(q["options"])))]
                    for idx, opt in enumerate(q["options"]):
                        cleaned_opt = re.sub(r'^\s*[A-Z][\)\.\s\-]+', '', opt).strip()
                        if idx < len(labels):
                            formatted_opts.append(f"{labels[idx]}) {cleaned_opt}")
                        else:
                            formatted_opts.append(cleaned_opt)
                    
                    sec_questions.append({
                        "question_number": global_q_num,
                        "question_text": q["question_text"],
                        "options": formatted_opts,
                        "correct_option": None,
                        "explanation": ""
                    })
                    global_q_num += 1
                
                merged_sections.append({
                    "section_name": sec_name,
                    "questions": sec_questions
                })

            final_structured = {
                "metadata": {"title": merged_title},
                "sections": merged_sections
            }

            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(final_structured, f, indent=2, ensure_ascii=False)

            print(f"  -> [OK] {json_file} ({global_q_num - 1} questions)")
            
        except Exception as e:
            print(f"  -> [ERROR] Failed on {txt_file}: {e}")


if __name__ == "__main__":
    process_files()
