import os
import datetime
import re
import json
import urllib.request
from pathlib import Path

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
INSIGHTS_HTML = "insights.html"
TEMPLATE_PATH = "scripts/blog_template.html"
INSIGHTS_DIR = "insights"

def generate_blog_content():
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY is not set.")
        exit(1)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    prompt = """
    Write a high-quality, professional B2B blog post for 'Meaven Designs' (Bangalore office partitions).
    Tone: Premium, technical, architectural.
    
    Return STRICTLY ONLY JSON:
    {
        "title": "SEO Title",
        "category": "Trends",
        "meta_description": "160 chars",
        "lead_text": "Intro paragraph",
        "content_html": "Article body with <h2> and <p>",
        "slug": "url-slug",
        "image_keywords": "office glass"
    }
    """
    
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            text = res_data['candidates'][0]['content']['parts'][0]['text']
            
            # Extract JSON
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if not match:
                print(f"Error: No JSON in AI response: {text}")
                exit(1)
            return json.loads(match.group(0))
    except Exception as e:
        print(f"API Error: {str(e)}")
        exit(1)

def update_insights_index(post_data, image_url):
    try:
        with open(INSIGHTS_HTML, 'r', encoding='utf-8') as f:
            html = f.read()
        
        today = datetime.date.today().strftime("%B %d, %Y")
        
        new_card = f"""
                <!-- Article -->
                <article class="insight-card animate-reveal">
                    <div class="insight-image">
                        <img src="{image_url}" alt="{post_data['title']}">
                        <span class="insight-category">{post_data['category']}</span>
                    </div>
                    <div class="insight-content">
                        <span class="insight-date">{today}</span>
                        <h3>{post_data['title']}</h3>
                        <p>{post_data['meta_description']}</p>
                        <a href="insights/{post_data['slug']}.html" class="btn-text">Read Article <span>→</span></a>
                    </div>
                </article>
        """
        
        if '<!-- BLOG_GRID_START -->' not in html:
            print("Error: <!-- BLOG_GRID_START --> comment not found in insights.html")
            exit(1)
            
        updated_html = html.replace('<!-- BLOG_GRID_START -->', f'<!-- BLOG_GRID_START -->\n{new_card}')
        
        with open(INSIGHTS_HTML, 'w', encoding='utf-8') as f:
            f.write(updated_html)
    except Exception as e:
        print(f"Error updating index: {str(e)}")
        exit(1)

def create_blog_page(post_data, image_url):
    try:
        with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
            template = f.read()
        
        replacements = {
            "{{TITLE}}": post_data['title'],
            "{{META_DESCRIPTION}}": post_data['meta_description'],
            "{{CATEGORY}}": post_data['category'],
            "{{DATE}}": datetime.date.today().strftime("%B %d, %Y"),
            "{{READ_TIME}}": str(len(post_data['content_html'].split()) // 200 + 1),
            "{{LEAD_TEXT}}": post_data['lead_text'],
            "{{IMAGE_URL}}": image_url,
            "{{IMAGE_ALT}}": post_data['title'],
            "{{ARTICLE_CONTENT}}": post_data['content_html']
        }
        
        for key, value in replacements.items():
            template = template.replace(key, value)
        
        filename = f"{INSIGHTS_DIR}/{post_data['slug']}.html"
        os.makedirs(INSIGHTS_DIR, exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(template)
    except Exception as e:
        print(f"Error creating page: {str(e)}")
        exit(1)

if __name__ == "__main__":
    print(f"Starting blog generation at {datetime.datetime.now()}")
    data = generate_blog_content()
    img_url = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
    
    print(f"Generated: {data['title']}")
    create_blog_page(data, img_url)
    update_insights_index(data, img_url)
    print("Success! Post created and index updated.")
