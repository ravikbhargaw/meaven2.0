const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const INSIGHTS_HTML = 'insights.html';
const TEMPLATE_PATH = 'scripts/blog_template.html';
const INSIGHTS_DIR = 'insights';
const SITEMAP_PATH = 'sitemap.xml';

// Expanded premium pool of high-resolution Unsplash images of office partitions/design
const PREMIUM_IMAGES = [
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1497215842964-222b430eb094?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1200"
];

// Fallback image in case
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200";

// Standard blog categories
const CATEGORIES = [
    "Design & Architecture",
    "Acoustics",
    "Maintenance",
    "Trends",
    "Compliance",
    "Execution",
    "Industry Insights",
    "Wellness",
    "Sustainability",
    "Strategy"
];

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

// Extract existing blog headlines and images to guarantee absolute uniqueness
function getExistingContent() {
    if (!fs.existsSync(INSIGHTS_HTML)) {
        return { titles: [], images: [] };
    }

    const html = fs.readFileSync(INSIGHTS_HTML, 'utf-8');
    const titles = [];
    const images = [];

    // Match <h3>Title Here</h3> inside index/grid
    const titleRegex = /<h3>([^<]+)<\/h3>/g;
    let match;
    while ((match = titleRegex.exec(html)) !== null) {
        titles.push(match[1].trim());
    }

    // Match <img src="URL"> inside index/grid
    const imgRegex = /<img\s+src="([^"]+)"/g;
    while ((match = imgRegex.exec(html)) !== null) {
        images.push(match[1].trim());
    }

    return { titles, images };
}

// Generate blog content with model fallback and dynamic prompt avoidance
async function generateBlogContent(existingTitles) {
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
    const models = ["gemini-3.5-flash", "gemini-2.5-flash"];

    // Format list of existing titles to instruct the AI what NOT to write about
    const avoidedTitlesText = existingTitles.length > 0 
        ? existingTitles.map(t => `- "${t}"`).join('\n')
        : "None (first article)";

    const prompt = `
Write a high-quality, professional B2B blog post for 'Meaven Designs' (an office partition and premium workspace execution company in Bangalore, India).
Tone: Premium, highly technical, architectural, and authoritative.
Target Audience: Project owners, builders, developers, managed office operators, and architects in Bangalore.

CRITICAL REQUIREMENT (TOPIC & HEADLINE UNIQUENESS):
You MUST NOT write about, duplicate, or closely match any of these existing article headlines already on our site:
${avoidedTitlesText}

Core Hot Topics to Select From (Ensure fresh angles and highly knowledgeable insights):
- High-spec managed office developments and coworking structures (flexible, modular floor plates).
- The massive wave of Global Capability Centers (GCCs) setting up in Bangalore and their rigorous demand for acoustic privacy, fast-track turnkey execution, and strict architectural standards.
- Advanced acoustics (STC calculations, glass asymmetrical laminations, dual-durometer EPDM gaskets).
- Turnkey execution, pre-construction 3D laser scanning (preventing beam deflection and structural leveling mismatch, defeating the blame-shifting construction cycle).
- Concrete structural engineering specs (e.g. 6063-T6 architectural aluminum extrusions, sub-millimetre tolerance clearances).
- Highly localized focus targeting builders, top-tier architects, and key Bangalore micro-markets (Outer Ring Road, Sarjapur, Whitefield, Manyata Tech Park, Electronic City, Indiranagar).

Choose ONE category from: ${CATEGORIES.map(c => `"${c}"`).join(', ')}.

Output strictly a JSON object with exactly these keys:
- "title": A unique, expert-level B2B article title focusing on coworking, GCCs, acoustics, or premium workspace execution (never repeat or closely mimic the avoided headlines above!).
- "category": The exact category selected.
- "meta_description": A clear SEO description (120-160 characters).
- "lead_text": A strong, punchy introductory lead paragraph (1-2 sentences).
- "content_html": The full article body in HTML. Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags. Must include technical engineering details, localized context, and deep execution insights.
- "slug": A URL-friendly version of the title.

Strictly return ONLY the JSON object. Do not wrap it in markdown code block or any additional text.
`;

    for (const model of models) {
        console.log(`Attempting blog generation using ${model}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const requestData = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        category: { type: "string" },
                        meta_description: { type: "string" },
                        lead_text: { type: "string" },
                        content_html: { type: "string" },
                        slug: { type: "string" }
                    },
                    required: ["title", "category", "meta_description", "lead_text", "content_html", "slug"]
                }
            }
        };

        try {
            const res = await makePostRequest(url, requestData);
            const textResponse = res.candidates[0].content.parts[0].text.trim();
            
            let cleanedJson = textResponse;
            if (cleanedJson.startsWith("```")) {
                cleanedJson = cleanedJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
            }
            
            const parsedData = JSON.parse(cleanedJson);
            
            // Safety fallback: generate slug if it's missing but title is present
            if (!parsedData.slug && parsedData.title) {
                parsedData.slug = parsedData.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '');
            }

            const unrecoverableKeys = ["title", "content_html"];
            for (const key of unrecoverableKeys) {
                if (!parsedData[key]) {
                    throw new Error(`Response is missing required JSON key: "${key}"`);
                }
            }

            // Set fallbacks for other less critical fields if missing
            if (!parsedData.category) parsedData.category = "Industry Insights";
            if (!parsedData.meta_description) parsedData.meta_description = parsedData.lead_text || parsedData.title;
            if (!parsedData.lead_text) parsedData.lead_text = parsedData.title;
            
            console.log(`Successfully generated article content using ${model}!`);
            return parsedData;
        } catch (error) {
            console.warn(`Warning: Model ${model} failed. Error: ${error.message}`);
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
        
        // 1. Gather existing content (headlines & images currently used)
        const { titles: existingTitles, images: existingImages } = getExistingContent();
        console.log(`Found ${existingTitles.length} existing articles currently live on site.`);

        // 2. Select a 100% unique cover photo from our curated premium pool
        const unusedImages = PREMIUM_IMAGES.filter(img => !existingImages.includes(img));
        let selectedImage = DEFAULT_IMAGE;
        if (unusedImages.length > 0) {
            // Select a random image from the pool of UNUSED images
            selectedImage = unusedImages[Math.floor(Math.random() * unusedImages.length)];
            console.log(`Selected a 100% unique cover photo from the premium pool.`);
        } else {
            console.log(`All premium pool images are currently in use. Selecting a fallback.`);
            selectedImage = PREMIUM_IMAGES[Math.floor(Math.random() * PREMIUM_IMAGES.length)];
        }

        // 3. Generate unique B2B blog post content with dynamic headline avoidance
        const postData = await generateBlogContent(existingTitles);
        
        // 4. Create detail page and update index files
        createBlogPage(postData, selectedImage);
        updateInsightsIndex(postData, selectedImage);
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
