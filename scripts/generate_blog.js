const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const INSIGHTS_HTML = 'insights.html';
const TEMPLATE_PATH = 'scripts/blog_template.html';
const INSIGHTS_DIR = 'insights';
const SITEMAP_PATH = 'sitemap.xml';

// Curated high-resolution Unsplash images of office partitions/design
const CATEGORY_IMAGES = {
    "Design & Architecture": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200",
    "Acoustics": "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=1200",
    "Maintenance": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200",
    "Trends": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
    "Compliance": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=1200",
    "Execution": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200",
    "Industry Insights": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200",
    "Wellness": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200",
    "Sustainability": "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=1200",
    "Strategy": "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&q=80&w=1200"
};

// Available categories for generation
const CATEGORIES = Object.keys(CATEGORY_IMAGES);

const PROMPT = `
Write a high-quality, professional B2B blog post for 'Meaven Designs' (an office partition and premium workspace execution company in Bangalore, India).
Tone: Premium, highly technical, architectural, and authoritative.
Target Audience: Project owners, builders, managed space developers, corporate leaders, and office architects in Bangalore.

Content Guidelines:
- Highlight concepts like "Execution Intelligence", "precision modular systems", "fixed-scope turnkey accountability", "zero-error site execution", and avoiding the "construction blame-shifting cycle".
- Target localized office hubs like Bangalore (Outer Ring Road, Whitefield, Indiranagar, Electronic City).
- Choose ONE category from this exact list: ${CATEGORIES.map(c => `"${c}"`).join(', ')}.

Output strictly a JSON object with exactly these keys:
- "title": A compelling, expert-level B2B article title.
- "category": The exact category selected from the list.
- "meta_description": A clear SEO description (120-160 characters).
- "lead_text": A strong, punchy introductory lead paragraph (1-2 sentences).
- "content_html": The full article body in HTML. Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags. Must include technical details, concrete design or material specifications (e.g. STC ratings for acoustics, millimetre clearances, aluminum extrusion profiles, toughened vs. laminated glass), and clear actionable insights.
- "slug": A URL-friendly version of the title (all lowercase, hyphens instead of spaces, no special characters).

Strictly return ONLY the JSON object. Do not wrap it in markdown block or any additional text.
`;

// Helper: HTTP POST request using native https module
function makePostRequest(url, data) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}

// Generate blog content with model fallback
async function generateBlogContent() {
    if (process.argv.includes('--mock')) {
        console.log("Mock mode enabled. Generating high-quality mock B2B blog post...");
        return {
            title: "Precision Modular Partitions: Designing for 45dB Acoustic Isolation in Modern Bangalore Workspaces",
            category: "Acoustics",
            meta_description: "Learn how to achieve 45dB acoustic isolation using double-glazed partition systems and precision aluminum frame engineering in high-density Bangalore offices.",
            lead_text: "In high-density office hubs like Outer Ring Road and Whitefield, open-plan noise is the primary barrier to leadership focus. Achieving high-performance acoustic privacy requires more than just glass — it requires precision modular coordination.",
            content_html: `<h2>The Physics of Acoustic Leaks</h2>
<p>Noise doesn't just pass through glass; it exploits structural gaps. A mere 2mm gap in a perimeter silicone joint or a poorly aligned floor spring pivot can degrade a 48dB partition assembly down to 32dB, completely negating the benefit of premium double-glazed glass.</p>
<h3>Double Glazing and STC Ratings</h3>
<p>For conference rooms and private executive suites in Bangalore, we specify custom-manufactured double-glazed systems using 10mm and 12mm toughened acoustic laminated glass. By combining two different glass thicknesses, we prevent resonance coupling, allowing the system to achieve an active Sound Transmission Class (STC) rating of 45dB to 48dB.</p>
<h2>Precision Engineering Over Site Guesswork</h2>
<ul>
<li><strong>Clearance Tolerances:</strong> All aluminum extrusions are manufactured to a sub-millimetre clearance tolerance (+/- 0.5mm), ensuring air-tight compression joints.</li>
<li><strong>Acoustic Seals:</strong> Double-finned heavy-duty EPDM gaskets are installed continuously along the glass perimeters to seal off micro-air gaps.</li>
<li><strong>Drop-Seal Mechanisms:</strong> For glass doors, we integrate premium automatic drop seals that activate when the door shuts, closing the standard 6mm floor clearance gap.</li>
</ul>
<p>At Meaven, our Execution Intelligence framework ensures that site measurements are taken using high-precision digital laser tools, eliminating errors before the modular frames are delivered to site.</p>`,
            slug: "precision-modular-partitions-acoustic-isolation-bangalore"
        };
    }

    if (!GEMINI_API_KEY) {
        console.error("ERROR: GEMINI_API_KEY is not set.");
        process.exit(1);
    }

    const apiKey = GEMINI_API_KEY.trim();
    // Prioritized model chain
    const models = ["gemini-3.5-flash", "gemini-2.5-flash"];
    
    for (const model of models) {
        console.log(`Attempting blog generation using ${model}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const requestData = {
            contents: [{
                parts: [{ text: PROMPT }]
            }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        try {
            const res = await makePostRequest(url, requestData);
            const textResponse = res.candidates[0].content.parts[0].text.trim();
            
            // Clean up any potential markdown wrapper (e.g. ```json ... ```)
            let cleanedJson = textResponse;
            if (cleanedJson.startsWith("```")) {
                cleanedJson = cleanedJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
            }
            
            const parsedData = JSON.parse(cleanedJson);
            
            // Basic validation
            const requiredKeys = ["title", "category", "meta_description", "lead_text", "content_html", "slug"];
            for (const key of requiredKeys) {
                if (!parsedData[key]) {
                    throw new Error(`Response is missing required JSON key: "${key}"`);
                }
            }
            
            console.log(`Successfully generated article content using ${model}!`);
            return parsedData;
        } catch (error) {
            console.warn(`Warning: Model ${model} failed. Error: ${error.message}`);
            // Proceed to the next model in the list
        }
    }

    throw new Error("All prioritized models failed to generate content.");
}

// Create the individual blog HTML page from template
function createBlogPage(postData, imageUrl) {
    console.log(`Creating blog page for: ${postData.title}`);
    const templateContent = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const readTime = Math.max(1, Math.round(postData.content_html.split(/\s+/).length / 200));

    const replacements = {
        "{{TITLE}}": postData.title,
        "{{META_DESCRIPTION}}": postData.meta_description,
        "{{CATEGORY}}": postData.category,
        "{{DATE}}": today,
        "{{READ_TIME}}": readTime.toString(),
        "{{LEAD_TEXT}}": postData.lead_text,
        "{{IMAGE_URL}}": imageUrl.startsWith("http") ? imageUrl : "../" + imageUrl,
        "{{IMAGE_ALT}}": postData.title,
        "{{ARTICLE_CONTENT}}": postData.content_html
    };

    let populatedContent = templateContent;
    for (const [key, value] of Object.entries(replacements)) {
        populatedContent = populatedContent.replace(new RegExp(key, 'g'), value);
    }

    const filename = path.join(INSIGHTS_DIR, `${postData.slug}.html`);
    fs.mkdirSync(INSIGHTS_DIR, { recursive: true });
    fs.writeFileSync(filename, populatedContent, 'utf-8');
    console.log(`Successfully wrote blog page to: ${filename}`);
}

// Inject new article card into insights.html
function updateInsightsIndex(postData, imageUrl) {
    console.log(`Injecting card into insights.html...`);
    const insightsContent = fs.readFileSync(INSIGHTS_HTML, 'utf-8');

    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    
    const cardHtml = `
                <!-- Article -->
                <article class="insight-card animate-reveal">
                    <div class="insight-image">
                        <img src="${imageUrl}" alt="${postData.title}">
                        <span class="insight-category">${postData.category}</span>
                    </div>
                    <div class="insight-content">
                        <span class="insight-date">${today}</span>
                        <h3>${postData.title}</h3>
                        <p>${postData.meta_description}</p>
                        <a href="insights/${postData.slug}.html" class="btn-text" aria-label="Read Article: ${postData.title}">Read Article <span>→</span></a>
                    </div>
                </article>`;

    if (!insightsContent.includes('<!-- BLOG_GRID_START -->')) {
        throw new Error('Could not find <!-- BLOG_GRID_START --> comment inside insights.html');
    }

    const updatedContent = insightsContent.replace(
        '<!-- BLOG_GRID_START -->',
        `<!-- BLOG_GRID_START -->\n${cardHtml}`
    );

    fs.writeFileSync(INSIGHTS_HTML, updatedContent, 'utf-8');
    console.log(`Successfully updated ${INSIGHTS_HTML}!`);
}

// Append new URL entry to sitemap.xml
function updateSitemap(postData) {
    console.log(`Updating sitemap.xml...`);
    if (!fs.existsSync(SITEMAP_PATH)) {
        console.warn(`Sitemap ${SITEMAP_PATH} not found. Skipping sitemap update.`);
        return;
    }

    const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    const todayIso = new Date().toISOString().split('T')[0];

    const urlEntry = `  <url>
    <loc>https://meaven.in/insights/${postData.slug}.html</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

    if (!sitemapContent.includes('</urlset>')) {
        throw new Error('Could not find </urlset> closing tag inside sitemap.xml');
    }

    const updatedSitemap = sitemapContent.replace('</urlset>', urlEntry);
    fs.writeFileSync(SITEMAP_PATH, updatedSitemap, 'utf-8');
    console.log(`Successfully updated sitemap.xml!`);
}

// Main runner execution
async function run() {
    try {
        console.log(`Starting automated B2B blog generation...`);
        const postData = await generateBlogContent();
        
        // Match category to a premium Unsplash image, or fallback to default
        const imageUrl = CATEGORY_IMAGES[postData.category] || CATEGORY_IMAGES["Design & Architecture"];
        
        createBlogPage(postData, imageUrl);
        updateInsightsIndex(postData, imageUrl);
        updateSitemap(postData);
        
        console.log(`\nAll operations completed successfully! New blog post is live.`);
        console.log(`Title: "${postData.title}"`);
        console.log(`Category: "${postData.category}"`);
        console.log(`Slug: "insights/${postData.slug}.html"\n`);
    } catch (e) {
        console.error(`\nFatal Error in blog generation pipeline: ${e.message}`);
        process.exit(1);
    }
}

run();
