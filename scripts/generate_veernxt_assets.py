import os
import json
import urllib.request
import urllib.error
import time
import base64
from datetime import datetime

# ==============================================================================
# VEERNXT VISUAL ASSET GENERATOR
# ==============================================================================

API_URL = "https://api.openai.com/v1/images/generations"
MODEL = "gpt-image-2"
BASE_DIR = "veernxt_assets"

SHARED_PROMPT = (
    "Premium editorial 3D illustration, modern Indian enterprise, subtle military precision. "
    "VeerNXT green, muted gold, deep navy and ivory palette. Clean geometric forms, "
    "sophisticated soft lighting, restrained 3D depth, premium but minimal. "
    "No stock photography, no cartoon characters, no unnecessary people, no UI screenshots, "
    "no baked-in text, no numbers, no logos or typography. Consistent materials, "
    "lighting, perspective and visual language across the entire collection."
)

ASSETS = [
    # BANNERS (Landscape)
    {"id": "B01", "folder": "banners", "name": "cv_profile", "size": "1024x1024", "prompt": "professional CV + profile badge + secure career identity", "title": "CV + Profile"},
    {"id": "B02", "folder": "banners", "name": "veerscore", "size": "1024x1024", "prompt": "premium career score badge + analysis interface", "title": "VeerScore"},
    {"id": "B03", "folder": "banners", "name": "career_analysis", "size": "1024x1024", "prompt": "candidate profile connected to skills, industries and career paths", "title": "Career Analysis"},
    {"id": "B04", "folder": "banners", "name": "career_map", "size": "1024x1024", "prompt": "multiple career routes converging toward professional destinations", "title": "Career Map"},
    {"id": "B05", "folder": "banners", "name": "military_to_career", "size": "1024x1024", "prompt": "military identity transforming into professional career symbols", "title": "Military to Career"},
    {"id": "B06", "folder": "banners", "name": "career_match", "size": "1024x1024", "prompt": "candidate profile + multiple career pathways converging on one destination", "title": "Career Match"},
    {"id": "B07", "folder": "banners", "name": "industry_fit_cv", "size": "1024x1024", "prompt": "military experience transforming into a polished corporate CV", "title": "Industry-Fit CV"},
    {"id": "B08", "folder": "banners", "name": "learning_path", "size": "1024x1024", "prompt": "career pathway with books, skills and learning milestones", "title": "Learning Path"},
    {"id": "B09", "folder": "banners", "name": "job_matches", "size": "1024x1024", "prompt": "candidate profile surrounded by relevant professional opportunities", "title": "Job Matches"},
    {"id": "B10", "folder": "banners", "name": "exam_matches", "size": "1024x1024", "prompt": "examination materials + highlighted matching indicators", "title": "Exam Matches"},
    {"id": "B11", "folder": "banners", "name": "financial_guidance", "size": "1024x1024", "prompt": "financial planning + secure shield + rupee symbolism", "title": "Financial Guidance"},
    {"id": "B12", "folder": "banners", "name": "my_network", "size": "1024x1024", "prompt": "professional network connecting candidates, mentors and recruiters", "title": "My Network"},
    {"id": "B13", "folder": "banners", "name": "next_mission", "size": "1024x1024", "prompt": "sophisticated career command centre representing Jobs, Learning, Skills, Finance and Network", "title": "Next Mission"},
    {"id": "B14", "folder": "banners", "name": "next_chapter", "size": "1024x1024", "prompt": "military horizon transitioning into modern professional cityscape", "title": "Next Chapter"},

    # SQUARE ICONS (Square)
    {"id": "S01", "folder": "icons", "name": "career_profile", "size": "1024x1024", "prompt": "professional identity/profile", "title": "Career Profile"},
    {"id": "S02", "folder": "icons", "name": "veerscore", "size": "1024x1024", "prompt": "premium score badge", "title": "VeerScore"},
    {"id": "S03", "folder": "icons", "name": "career_match", "size": "1024x1024", "prompt": "target + career pathways", "title": "Career Match"},
    {"id": "S04", "folder": "icons", "name": "career_path", "size": "1024x1024", "prompt": "branching professional route", "title": "Career Path"},
    {"id": "S05", "folder": "icons", "name": "career_readiness", "size": "1024x1024", "prompt": "shield + progress indicator", "title": "Career Readiness"},
    {"id": "S06", "folder": "icons", "name": "transferable_skills", "size": "1024x1024", "prompt": "military toolkit transforming into professional tools", "title": "Transferable Skills"},
    {"id": "S07", "folder": "icons", "name": "industry_match", "size": "1024x1024", "prompt": "interconnected corporate buildings", "title": "Industry Match"},
    {"id": "S08", "folder": "icons", "name": "next_best_action", "size": "1024x1024", "prompt": "illuminated waypoint + directional path", "title": "Next Best Action"},
    {"id": "S09", "folder": "icons", "name": "learning_center", "size": "1024x1024", "prompt": "open book + digital learning", "title": "Learning Center"},
    {"id": "S10", "folder": "icons", "name": "study_guide", "size": "1024x1024", "prompt": "document + bookmark", "title": "Study Guide"},
    {"id": "S11", "folder": "icons", "name": "mock_test", "size": "1024x1024", "prompt": "examination sheet + timer", "title": "Mock Test"},
    {"id": "S12", "folder": "icons", "name": "reasoning", "size": "1024x1024", "prompt": "geometric analytical puzzle", "title": "Reasoning"},
    {"id": "S13", "folder": "icons", "name": "current_affairs", "size": "1024x1024", "prompt": "newspaper + digital globe", "title": "Current Affairs"},
    {"id": "S14", "folder": "icons", "name": "skill_development", "size": "1024x1024", "prompt": "ascending skill blocks", "title": "Skill Development"},
    {"id": "S15", "folder": "icons", "name": "learning_path", "size": "1024x1024", "prompt": "connected milestones", "title": "Learning Path"},
    {"id": "S16", "folder": "icons", "name": "certificate", "size": "1024x1024", "prompt": "certificate + completion seal", "title": "Certificate"},
    {"id": "S17", "folder": "icons", "name": "job_matches", "size": "1024x1024", "prompt": "briefcase + target", "title": "Job Matches"},
    {"id": "S18", "folder": "icons", "name": "recommended_job", "size": "1024x1024", "prompt": "briefcase + highlighted opportunity", "title": "Recommended Job"},
    {"id": "S19", "folder": "icons", "name": "applications", "size": "1024x1024", "prompt": "professional document + upward movement", "title": "Applications"},
    {"id": "S20", "folder": "icons", "name": "interview_ready", "size": "1024x1024", "prompt": "professional profile + communication indicator", "title": "Interview Ready"},
    {"id": "S21", "folder": "icons", "name": "corporate_role", "size": "1024x1024", "prompt": "modern office + briefcase", "title": "Corporate Role"},
    {"id": "S22", "folder": "icons", "name": "operations", "size": "1024x1024", "prompt": "connected workflow", "title": "Operations"},
    {"id": "S23", "folder": "icons", "name": "leadership", "size": "1024x1024", "prompt": "leader + organised team", "title": "Leadership"},
    {"id": "S24", "folder": "icons", "name": "remote_work", "size": "1024x1024", "prompt": "laptop + location marker", "title": "Remote Work"},
    {"id": "S25", "folder": "icons", "name": "my_network", "size": "1024x1024", "prompt": "connected professional profiles", "title": "My Network"},
    {"id": "S26", "folder": "icons", "name": "mentor", "size": "1024x1024", "prompt": "mentor/candidate connection", "title": "Mentor"},
    {"id": "S27", "folder": "icons", "name": "community", "size": "1024x1024", "prompt": "professional community network", "title": "Community"},
    {"id": "S28", "folder": "icons", "name": "connection", "size": "1024x1024", "prompt": "two profiles forming a secure connection", "title": "Connection"},
    {"id": "S29", "folder": "icons", "name": "recruiter", "size": "1024x1024", "prompt": "recruiter profile + search", "title": "Recruiter"},
    {"id": "S30", "folder": "icons", "name": "peer_network", "size": "1024x1024", "prompt": "interconnected professional nodes", "title": "Peer Network"},
    {"id": "S31", "folder": "icons", "name": "financial_guidance", "size": "1024x1024", "prompt": "shield + rupee + financial document", "title": "Financial Guidance"},
    {"id": "S32", "folder": "icons", "name": "education_loan", "size": "1024x1024", "prompt": "graduation cap + rupee", "title": "Education Loan"},
    {"id": "S33", "folder": "icons", "name": "financial_plan", "size": "1024x1024", "prompt": "financial roadmap", "title": "Financial Plan"},
    {"id": "S34", "folder": "icons", "name": "savings", "size": "1024x1024", "prompt": "secure vault + upward graph", "title": "Savings"},
    {"id": "S35", "folder": "icons", "name": "business_funding", "size": "1024x1024", "prompt": "small business + rupee", "title": "Business Funding"},
    {"id": "S36", "folder": "icons", "name": "financial_readiness", "size": "1024x1024", "prompt": "financial gauge + shield", "title": "Financial Readiness"},

    # PREMIUM / LOCKED (Square)
    {"id": "P01", "folder": "premium", "name": "locked_veerscore", "size": "1024x1024", "prompt": "premium score badge behind subtle lock", "title": "Locked VeerScore"},
    {"id": "P02", "folder": "premium", "name": "locked_career_matches", "size": "1024x1024", "prompt": "career cards with locked premium result", "title": "Locked Career Matches"},
    {"id": "P03", "folder": "premium", "name": "locked_exam_matches", "size": "1024x1024", "prompt": "exam papers + highlighted locked match", "title": "Locked Exam Matches"},
    {"id": "P04", "folder": "premium", "name": "locked_cv", "size": "1024x1024", "prompt": "professional CV + subtle lock", "title": "Locked CV"},
    {"id": "P05", "folder": "premium", "name": "locked_career_analysis", "size": "1024x1024", "prompt": "profile to analysis to career map with final result locked", "title": "Locked Career Analysis"},
    {"id": "P06", "folder": "premium", "name": "premium_learning", "size": "1024x1024", "prompt": "open book + illuminated learning pathway", "title": "Premium Learning"},
    {"id": "P07", "folder": "premium", "name": "premium_jobs", "size": "1024x1024", "prompt": "professional opportunity cards + secure-access indicator", "title": "Premium Jobs"},

    # ₹9 PROMOTIONAL ASSETS (Landscape)
    {"id": "R01", "folder": "promotional", "name": "unlock_veerscore", "size": "1024x1024", "prompt": "career score being revealed", "title": "Unlock VeerScore"},
    {"id": "R02", "folder": "promotional", "name": "unlock_career_analysis", "size": "1024x1024", "prompt": "profile transforming into analytical career map", "title": "Unlock Career Analysis"},
    {"id": "R03", "folder": "promotional", "name": "unlock_exam_matches", "size": "1024x1024", "prompt": "candidate profile connecting to matching exams", "title": "Unlock Exam Matches"},
    {"id": "R04", "folder": "promotional", "name": "unlock_industry_fit_cv", "size": "1024x1024", "prompt": "military experience transforming into professional CV", "title": "Unlock Industry-Fit CV"},
    {"id": "R05", "folder": "promotional", "name": "unlock_career_map", "size": "1024x1024", "prompt": "multiple career paths being revealed", "title": "Unlock Career Map"},
    {"id": "R06", "folder": "promotional", "name": "cv_career_profile", "size": "1024x1024", "prompt": "CV + professional profile + premium unlock concept", "title": "CV + Career Profile"},
    {"id": "R07", "folder": "promotional", "name": "unlock_your_next_step", "size": "1024x1024", "prompt": "forward career pathway being revealed", "title": "Unlock Your Next Step"}
]

def load_api_key():
    """Load OPENAI_API_KEY from .env file."""
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('OPENAI_API_KEY='):
                    return line.split('=', 1)[1].strip()
    return None

def setup_directories():
    """Create the required directory structure."""
    if not os.path.exists(BASE_DIR):
        os.makedirs(BASE_DIR)
    
    for category in ["banners", "icons", "premium", "promotional"]:
        path = os.path.join(BASE_DIR, category)
        if not os.path.exists(path):
            os.makedirs(path)

def generate_image(api_key, full_prompt, size):
    """Call OpenAI API to generate the image."""
    data = json.dumps({
        "model": MODEL,
        "prompt": full_prompt,
        "n": 1,
        "size": size
    }).encode("utf-8")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    req = urllib.request.Request(API_URL, data=data, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            data = result['data'][0]
            if 'url' in data:
                return {"url": data['url'], "b64_json": None, "error": None}
            elif 'b64_json' in data:
                return {"url": None, "b64_json": data['b64_json'], "error": None}
            else:
                return {"url": None, "b64_json": None, "error": "No url or b64_json in response"}
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        return {"url": None, "b64_json": None, "error": error_msg}
    except Exception as e:
        return {"url": None, "b64_json": None, "error": str(e)}

def save_image(result, filepath):
    """Save the image from either URL or Base64."""
    try:
        if result.get('url'):
            urllib.request.urlretrieve(result['url'], filepath)
            return True
        elif result.get('b64_json'):
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(result['b64_json']))
            return True
    except Exception as e:
        pass
    return False

def append_to_manifest(entry):
    """Append a generation record to manifest.json."""
    manifest_path = os.path.join(BASE_DIR, "manifest.json")
    
    data = []
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, 'r') as f:
                data = json.load(f)
        except:
            data = []
            
    data.append(entry)
    
    with open(manifest_path, 'w') as f:
        json.dump(data, f, indent=4)

def main():
    api_key = load_api_key()
    if not api_key:
        print("Error: OPENAI_API_KEY not found in .env file.")
        return
        
    setup_directories()
    
    total_assets = len(ASSETS)
    print(f"Starting generation of {total_assets} VeerNXT assets...")
    print("=" * 60)
    
    for i, asset in enumerate(ASSETS, 1):
        filename = f"{asset['id']}_{asset['name']}.png"
        filepath = os.path.join(BASE_DIR, asset['folder'], filename)
        
        print(f"[{i:02d}/{total_assets}] Generating {asset['id']} - {asset['title']}...", end=" ", flush=True)
        
        if os.path.exists(filepath):
            print("\n+ Already exists, skipping")
            continue
            
        full_prompt = f"{asset['prompt']}. {SHARED_PROMPT}"
        
        result = generate_image(api_key, full_prompt, asset['size'])
        
        status = "Error"
        if result.get('url') or result.get('b64_json'):
            if save_image(result, filepath):
                print("\n+ Saved")
                status = "Success"
            else:
                print("\n- Failed to save image")
                status = "Save Error"
        else:
            print(f"\n- Generation failed: {result['error']}")
            
        manifest_entry = {
            "asset_id": asset['id'],
            "asset_name": asset['title'],
            "category": asset['folder'],
            "filename": filename,
            "complete_prompt": full_prompt,
            "model": MODEL,
            "timestamp": datetime.now().isoformat(),
            "status": status
        }
        
        if result.get('error'):
            manifest_entry['error_details'] = result['error']
            
        append_to_manifest(manifest_entry)
        
        # Sleep slightly to avoid rate limit bursts (DALL-E 3 can be strict)
        time.sleep(2)

    print("=" * 60)
    print("Generation complete! Check veernxt_assets/manifest.json for details.")

if __name__ == "__main__":
    main()
