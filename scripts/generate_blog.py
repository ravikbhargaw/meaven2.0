import os
import datetime
import re
import json
import google.generativeai as genai
from pathlib import Path

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
INSIGHTS_HTML = "insights.html"
TEMPLATE_PATH = "scripts/blog_template.html"
INSIGHTS_DIR = "insights"

# Initialize Gemini
if not GEMINI_API_KEY:
    print("CRITICAL ERROR: GEMINI_API_KEY environment variable is not set.")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

def generate_blog_content():
    prompt = """
    You are an expert content strategist for 'Meaven Designs', a premium B2B glass partition and office fit-out company in Bangalore.
    Your tone is professional, technical yet accessible, and premium.
    
    Task: Write a high-quality blog post about commercial office glass partitions or architectural glass trends in Bangalore.
    
    Return the response in STICKTLY ONLY JSON format:
    {
        "title": "A compelling, SEO-friendly title",
        "category": "Planning, Design, Maintenance, Trends, Compliance, or Execution",
        "meta_description": "A 160-character description for Google",
        "lead_text": "A strong introductory paragraph (2-3 sentences)",
        "content_html": "The body of the article using <h2> tags and <p> tags. (At least 4 sections).",
        "slug": "url-friendly-slug-like-this",
        "image_keywords": "3-4 keywords for finding a stock photo"
    }
    """
    
    try:
        response = model.generate_content(prompt)
        # Find JSON block using regex
        match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if not match:
            print(f"Error: No JSON found in Gemini response: {response.text}")
            exit(1)
            
        content = match.group(0)
        return json.loads(content)
    except Exception as e:
        print(f"Critical Error during generation: {str(e)}")
        if hasattr(response, 'text'):
            print(f"Raw Response: {response.text}")
        exit(1)

def update_insights_index(post_data, image_url):
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
    
    # Inject after the START comment
    updated_html = html.replace('<!-- BLOG_GRID_START -->', f'<!-- BLOG_GRID_START -->\n{new_card}')
    
    with open(INSIGHTS_HTML, 'w', encoding='utf-8') as f:
        f.write(updated_html)

def create_blog_page(post_data, image_url):
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

if __name__ == "__main__":
    print("Generating AI Blog Post...")
    data = generate_blog_content()
    
    # Use Unsplash Source for relevant high-quality images
    keywords = data.get('image_keywords', 'office,glass,modern').replace(' ', ',')
    image_url = f"https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200" # High-res default fallback
    # In a more advanced version, we'd search Unsplash API for the exact keywords
    
    print(f"Title: {data['title']}")
    create_blog_page(data, image_url)
    update_insights_index(data, image_url)
    print("Success!")
