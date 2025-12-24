/**
 * CLI script to create a video-backed page from storyboard
 * 
 * Usage:
 *   node scripts/create-page.js <domain> --video-dir <path> --youtube-video-url <url> --category <category>
 * 
 * Examples:
 *   node scripts/create-page.js example.com --video-dir ./video --youtube-video-url https://youtube.com/watch?v=XXX --category home-maintenance
 * 
 * This will:
 * 1. Read storyboard.json from video-dir
 * 2. Collect and upload images to S3
 * 3. Generate content with Gemini (content only, no images)
 * 4. Build video-backed UX layout with scene-driven sections
 * 5. Create and publish the page
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { uploadFileToS3 } from '../src/services/S3Service.js';
import { randomUUID } from 'crypto';
import slugify from '../src/utils/slugify.js';

// Load environment variables FIRST
dotenv.config();

// Import all models to ensure they're registered with Mongoose
import '../src/models/Tenant.js';
import '../src/models/Page.js';
import '../src/models/KeywordCluster.js';

// Now import services
import { TenantService } from '../src/services/TenantService.js';
import { PageService } from '../src/services/PageService.js';
import { KeywordService } from '../src/services/KeywordService.js';
import { MicrositeBuilderAgent } from '../src/agents/micrositeBuilderAgent.js';
import { ContentQualityValidator } from '../src/utils/contentQualityValidator.js';
import { SchemaMarkupService } from '../src/services/SchemaMarkupService.js';
import { ImageOptimizationService } from '../src/services/ImageOptimizationService.js';
import { validateUXLayout } from '../src/utils/uxSchemaValidator.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

/**
 * Find storyboard JSON file in video-dir
 */
async function findStoryboardJSON(videoDir) {
  const storyboardPath = join(videoDir, 'storyboard.json');
  
  if (existsSync(storyboardPath)) {
    console.log(`✅ Found storyboard JSON: ${storyboardPath}`);
    return storyboardPath;
  }
  
  // Search for JSON files matching storyboard structure
  const files = await readdir(videoDir);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = join(videoDir, file);
      try {
        const content = await readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        if (data.stories && Array.isArray(data.stories) && data.stories.length > 0) {
          const story = data.stories[0];
          if (story.title && story.slug && story.scenes && Array.isArray(story.scenes)) {
            console.log(`✅ Found storyboard JSON: ${filePath}`);
            return filePath;
          }
        }
      } catch (err) {
        continue;
      }
    }
  }
  
  throw new Error(`No storyboard JSON found in ${videoDir}. Expected storyboard.json or JSON with { "stories": [{ "title", "slug", "scenes": [...] }] }`);
}

/**
 * Validate storyboard structure and scenes
 */
function validateStoryboard(storyboard) {
  if (!storyboard.stories || !Array.isArray(storyboard.stories) || storyboard.stories.length === 0) {
    throw new Error('Storyboard must have a "stories" array with at least one story');
  }
  
  const story = storyboard.stories[0];
  if (!story.scenes || !Array.isArray(story.scenes)) {
    throw new Error('Story must have a "scenes" array');
  }
  
  const missingFields = [];
  story.scenes.forEach((scene, index) => {
    if (!scene.id) {
      missingFields.push(`Scene ${index}: missing id`);
    }
    if (!scene.visual_reference || scene.visual_reference.trim() === '') {
      missingFields.push(`Scene ${index} (id: ${scene.id || 'unknown'}): missing visual_reference`);
    }
    if (!scene.best_frame_filename || scene.best_frame_filename.trim() === '') {
      missingFields.push(`Scene ${index} (id: ${scene.id || 'unknown'}): missing best_frame_filename`);
    }
  });
  
  if (missingFields.length > 0) {
    throw new Error(`Storyboard validation failed:\n${missingFields.join('\n')}`);
  }
  
  return story;
}

/**
 * Recursively find image file in directory
 */
async function findImageFile(videoDir, filename) {
  // Try direct path first
  const directPath = join(videoDir, filename);
  if (existsSync(directPath)) {
    return directPath;
  }
  
  // Try images/ subfolder
  const imagesPath = join(videoDir, 'images', filename);
  if (existsSync(imagesPath)) {
    return imagesPath;
  }
  
  // Recursive search
  async function searchRecursive(dir) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = await searchRecursive(fullPath);
          if (found) return found;
        } else if (entry.name === filename) {
          return fullPath;
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
    return null;
  }
  
  return await searchRecursive(videoDir);
}

/**
 * Collect all images referenced in scenes
 */
async function collectImages(videoDir, scenes) {
  const imageMap = new Map(); // scene_id -> { image_filename, filePath }
  const missingImages = [];
  
  for (const scene of scenes) {
    const filename = scene.best_frame_filename;
    const filePath = await findImageFile(videoDir, filename);
    
    if (!filePath) {
      missingImages.push(filename);
      continue;
    }
    
    imageMap.set(scene.id, {
      image_filename: filename,
      filePath: filePath,
      visual_reference: scene.visual_reference
    });
  }
  
  if (missingImages.length > 0) {
    throw new Error(`Missing image files:\n${missingImages.map(f => `  - ${f}`).join('\n')}`);
  }
  
  return imageMap;
}

/**
 * Upload images to S3 and return mapping
 */
async function uploadImagesToS3(imageMap, storySlug) {
  const sceneToS3Map = new Map(); // scene_id -> { visual_reference, s3_url }
  
  // Determine S3 key prefix
  const s3Prefix = storySlug 
    ? `tenants/${storySlug}/images/`
    : `tenants/${Date.now()}_${randomUUID().substring(0, 8)}/images/`;
  
  console.log(`📤 Uploading ${imageMap.size} image(s) to S3...`);
  
  for (const [sceneId, imageData] of imageMap.entries()) {
    try {
      const s3Key = `${s3Prefix}${imageData.image_filename}`;
      
      // Determine content type from file extension
      const ext = extname(imageData.image_filename).toLowerCase();
      const contentType = ext === '.jpg' || ext === '.jpeg' 
        ? 'image/jpeg' 
        : ext === '.png' 
        ? 'image/png' 
        : 'image/jpeg';
      
      const s3Url = await uploadFileToS3(imageData.filePath, s3Key, contentType);
      
      sceneToS3Map.set(sceneId, {
        visual_reference: imageData.visual_reference,
        s3_url: s3Url
      });
      
      console.log(`   ✅ Uploaded: ${imageData.image_filename} -> ${s3Url}`);
    } catch (error) {
      throw new Error(`Failed to upload ${imageData.image_filename}: ${error.message}`);
    }
  }
  
  console.log(`✅ Uploaded ${sceneToS3Map.size} image(s) successfully`);
  return sceneToS3Map;
}

/**
 * Build Visual Reference Block for Gemini prompt
 */
function buildVisualReferenceBlock(scenes, sceneToS3Map) {
  let block = `VISUAL REFERENCE CONTEXT (FIXED IMAGES ON PAGE):
The following images will be displayed on the page. Use them as CONTEXT for writing informative content about the topic.
IMPORTANT: Do NOT describe what the images show. Instead, write informative content about the topic/concept that the images illustrate.
The visual_reference describes the theme/concept - write about that concept, not about the image itself.

`;
  
  scenes.forEach((scene, index) => {
    const s3Data = sceneToS3Map.get(scene.id);
    
    if (s3Data) {
      const imageNum = String(index + 1).padStart(2, '0');
      block += `Scene ${imageNum} (Image URL: ${s3Data.s3_url}):
Theme/Concept: ${scene.visual_reference}
Write informative content about this theme/concept, NOT a description of the image.

`;
    }
  });
  
  block += `CRITICAL RULES:
- Write informative, educational content about the topic/concept described in visual_reference
- Do NOT write "The image shows..." or describe what appears in the image
- Write about the topic/issue/concept itself (what homeowners need to know, what to look for, etc.)
- The images will support your content visually - your text should stand alone as valuable information

`;
  
  return block;
}

/**
 * Extract FAQ items from content
 */
function extractFAQItems(content) {
  const faqItems = [];
  
  // Pattern: <h3>Question</h3> followed by <p>Answer</p> (may have multiple paragraphs)
  // Use a more flexible regex that captures multiple paragraphs
  const h3Regex = /<h3[^>]*>(.*?)<\/h3>/gi;
  const h3Matches = [];
  let match;
  
  while ((match = h3Regex.exec(content)) !== null) {
    h3Matches.push({
      index: match.index,
      question: match[1].replace(/<[^>]+>/g, '').trim(), // Strip HTML from question
      tagEnd: match.index + match[0].length
    });
  }
  
  // For each H3, extract all content until next H3 or end
  for (let i = 0; i < h3Matches.length; i++) {
    const h3Match = h3Matches[i];
    const nextH3Index = i < h3Matches.length - 1 ? h3Matches[i + 1].index : content.length;
    const answerContent = content.substring(h3Match.tagEnd, nextH3Index);
    
    // Extract all paragraph text from answer content
    const pMatches = answerContent.match(/<p[^>]*>(.*?)<\/p>/gis);
    let answer = '';
    if (pMatches) {
      answer = pMatches.map(p => {
        // Extract text content from paragraph, stripping HTML but preserving text
        return p.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '').replace(/<[^>]+>/g, ' ').trim();
      }).filter(t => t.length > 0).join(' ');
    }
    
    if (h3Match.question && answer) {
      faqItems.push({
        question: h3Match.question,
        answer: answer
      });
    }
  }
  
  if (faqItems.length > 0) {
    return {
      type: 'faq',
      title: 'Frequently Asked Questions',
      items: faqItems
    };
  }
  
  return null;
}

/**
 * Extract H2 sections from Gemini content
 */
function extractH2Sections(content) {
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  const sections = [];
  let lastIndex = 0;
  let match;
  let sectionIndex = 0;
  
  while ((match = h2Regex.exec(content)) !== null) {
    // Extract H2 title and strip HTML markup (plain text only)
    const h2TitleWithMarkup = match[1].trim();
    const h2Title = h2TitleWithMarkup.replace(/<[^>]+>/g, '').trim(); // Strip all HTML tags
    
    const h2Start = match.index;
    const h2TagEnd = match.index + match[0].length; // End of the H2 tag
    
    // Get content between this H2 and next H2 (or end)
    const nextMatch = h2Regex.exec(content);
    h2Regex.lastIndex = match.index + match[0].length; // Reset for next iteration
    
    const sectionEnd = nextMatch ? nextMatch.index : content.length;
    // Extract content AFTER the H2 tag (remove the H2 tag itself)
    const sectionContent = content.substring(h2TagEnd, sectionEnd).trim();
    
    sections.push({
      index: sectionIndex++,
      title: h2Title, // Plain text title
      content: sectionContent // Content without the H2 tag
    });
  }
  
  return sections;
}

/**
 * Extract YouTube video ID from URL
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * Returns video ID or null
 */
function extractYouTubeVideoId(url) {
  if (!url) return null;
  
  // Match youtube.com/watch?v=VIDEO_ID or youtube.com/embed/VIDEO_ID
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch && youtubeMatch[1]) {
    return youtubeMatch[1];
  }
  
  return null;
}

/**
 * Build video-backed UX layout from scenes and Gemini content
 */
function buildVideoBackedUXLayout(story, scenes, sceneToS3Map, geminiContent, youtubeVideoUrl) {
  console.log(`🏗️  Building video-backed UX layout...`);
  
  const sections = [];
  
  // 1. HERO section
  sections.push({
    type: 'hero',
    title: story.title,
    subtitle: '', // Will be populated from intro paragraph if available
    image: '' // No image in hero for video-backed pages
  });
  
  // 2. Extract intro paragraph (content before first H2)
  const firstH2Index = geminiContent.indexOf('<h2');
  if (firstH2Index > 0) {
    const introText = geminiContent.substring(0, firstH2Index).trim();
    if (introText) {
      // Clean up HTML tags for subtitle
      const subtitleText = introText
        .replace(/<[^>]+>/g, '')
        .substring(0, 150)
        .trim();
      if (subtitleText) {
        sections[0].subtitle = subtitleText;
      }
      
      // Add intro as paragraph section
      sections.push({
        type: 'paragraph',
        text: introText
      });
    }
  }
  
  // 3. YouTube video embed section (insert after intro, before scenes)
  if (youtubeVideoUrl) {
    // Convert YouTube URL to embed format
    const videoId = extractYouTubeVideoId(youtubeVideoUrl);
    let embedUrl = youtubeVideoUrl;
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (embedUrl.includes('watch?v=')) {
      const extractedId = embedUrl.split('watch?v=')[1].split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${extractedId}`;
    } else if (embedUrl.includes('youtu.be/')) {
      const extractedId = embedUrl.split('youtu.be/')[1].split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${extractedId}`;
    }
    
    // Create a paragraph section with YouTube embed HTML
    sections.push({
      type: 'paragraph',
      text: `<div class="video-embed" style="margin: 2rem 0;"><iframe width="100%" height="400" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    });
  }
  
  // 4. Extract H2 sections from Gemini content
  const h2Sections = extractH2Sections(geminiContent);
  
  // 5. Build scene-driven sections (one combined paragraph with image per scene)
  // Skip FAQ H2 section if it exists (we'll handle it separately)
  const sceneH2Sections = h2Sections.filter(section => {
    const title = section.title.toLowerCase();
    return !title.includes('frequently asked questions') && 
           !title.includes('faq') && 
           title !== 'faq' &&
           !title.includes('conclusion') &&
           !title.includes('summary') &&
           !title.includes('introduction') &&
           !title.includes('overview');
  });
  
  // Validate we have enough H2 sections for all scenes
  if (sceneH2Sections.length < scenes.length) {
    throw new Error(`Gemini output has ${sceneH2Sections.length} scene H2 sections but ${scenes.length} scenes are required`);
  }
  
  /**
   * Match scene to H2 section based on visual_reference similarity
   * Returns the best matching H2 section index
   */
  function findBestMatchingH2(scene, availableH2Sections, usedIndices) {
    const visualRef = scene.visual_reference.toLowerCase();
    const visualWords = visualRef.split(/\s+/).filter(w => w.length > 3); // Key words from visual_reference
    
    let bestMatch = null;
    let bestScore = 0;
    
    availableH2Sections.forEach((h2Section, index) => {
      if (usedIndices.has(index)) return; // Skip already used sections
      
      const h2Title = h2Section.title.toLowerCase();
      const h2Content = h2Section.content.toLowerCase();
      const h2Text = `${h2Title} ${h2Content}`;
      
      // Calculate similarity score
      let score = 0;
      
      // Check if visual_reference words appear in H2 title or content
      visualWords.forEach(word => {
        if (h2Title.includes(word)) score += 3; // Title match is stronger
        if (h2Content.includes(word)) score += 1; // Content match
      });
      
      // Bonus if visual_reference phrase appears in title
      if (h2Title.includes(visualRef)) score += 5;
      
      // Prefer earlier sections (Gemini should follow order, but we allow flexibility)
      if (index < scenes.length) score += 0.5;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = index;
      }
    });
    
    // Fallback: if no good match, use the first unused section
    if (bestMatch === null || bestScore === 0) {
      for (let i = 0; i < availableH2Sections.length; i++) {
        if (!usedIndices.has(i)) {
          return i;
        }
      }
    }
    
    return bestMatch;
  }
  
  // Map scenes to H2 sections using semantic matching
  const usedH2Indices = new Set();
  const sceneToH2Map = new Map(); // scene.id -> h2Section
  
  scenes.forEach((scene, sceneIndex) => {
    const matchedH2Index = findBestMatchingH2(scene, sceneH2Sections, usedH2Indices);
    
    if (matchedH2Index === null || matchedH2Index === undefined) {
      throw new Error(`Could not find matching H2 section for scene ${sceneIndex} (id: ${scene.id}, visual_reference: ${scene.visual_reference})`);
    }
    
    const h2Section = sceneH2Sections[matchedH2Index];
    usedH2Indices.add(matchedH2Index);
    sceneToH2Map.set(scene.id, h2Section);
    
    console.log(`   ✅ Matched Scene ${sceneIndex + 1} (${scene.visual_reference}) → H2: "${h2Section.title}"`);
  });
  
  // Build paragraph sections with images in scene order
  scenes.forEach((scene, sceneIndex) => {
    const h2Section = sceneToH2Map.get(scene.id);
    if (!h2Section) {
      throw new Error(`No H2 section mapped for scene ${sceneIndex} (id: ${scene.id})`);
    }
    
    const sceneId = scene.id;
    const s3Data = sceneToS3Map.get(sceneId);
    
    if (!s3Data) {
      throw new Error(`Scene ${sceneIndex} (id: ${sceneId}) has no matching S3 image URL`);
    }
    
    // Combined paragraph section with image, title, and layout_type
    // Use H2 title (already plain text from extractH2Sections) or fallback to visual_reference
    const paragraphTitle = h2Section.title || scene.visual_reference;
    
    sections.push({
      type: 'paragraph',
      text: h2Section.content,
      image: s3Data.s3_url,
      title: paragraphTitle,
      layout_type: 'NEW'
    });
  });
  
  // Handle any extra H2 sections (after all scenes) as regular paragraphs
  if (sceneH2Sections.length > scenes.length) {
    for (let i = scenes.length; i < sceneH2Sections.length; i++) {
      sections.push({
        type: 'paragraph',
        text: sceneH2Sections[i].content
      });
    }
  }
  
  // 6. Check if FAQ section exists in any H2 section or remaining content
  let faqSection = null;
  
  // First, check all H2 sections for FAQ
  for (const h2Section of h2Sections) {
    const sectionTitle = h2Section.title.toLowerCase();
    if (sectionTitle.includes('frequently asked questions') || 
        sectionTitle.includes('faq') ||
        sectionTitle === 'faq') {
      // This H2 is the FAQ section - extract FAQ items from its content
      const faqContent = h2Section.content;
      faqSection = extractFAQItems(faqContent);
      if (faqSection) break;
    }
  }
  
  // If FAQ not found in H2 sections, check remaining content after last H2
  if (!faqSection) {
    const lastH2Index = geminiContent.lastIndexOf('</h2>');
    if (lastH2Index !== -1) {
      const remainingContent = geminiContent.substring(lastH2Index + 5).trim();
      if (remainingContent) {
        const lowerContent = remainingContent.toLowerCase();
        if (lowerContent.includes('frequently asked questions') || 
            lowerContent.includes('<h2>faq') ||
            lowerContent.includes('faq')) {
          faqSection = extractFAQItems(remainingContent);
        }
      }
    }
  }
  
  // Also check the full content for FAQ section (in case it's embedded differently)
  if (!faqSection) {
    faqSection = extractFAQItems(geminiContent);
  }
  
  // Add FAQ section if found
  if (faqSection && faqSection.items.length > 0) {
    sections.push(faqSection);
    console.log(`   ✅ FAQ section added with ${faqSection.items.length} items`);
  } else {
    console.warn(`   ⚠️  No FAQ section found in content`);
  }
  
  // Add any remaining non-FAQ content (conclusion, etc.)
  // Only add content that comes after the FAQ section (if FAQ was found in H2)
  if (faqSection) {
    // FAQ was found - don't add remaining content as it's likely part of FAQ or conclusion
    // Conclusion should be before FAQ per instructions
  } else {
    // No FAQ found - add remaining content as paragraph
    const lastH2Index = geminiContent.lastIndexOf('</h2>');
    if (lastH2Index !== -1) {
      const remainingContent = geminiContent.substring(lastH2Index + 5).trim();
      if (remainingContent) {
        sections.push({
          type: 'paragraph',
          text: remainingContent
        });
      }
    }
  }
  
  const layout = {
    layout: 'StandardArticle',
    sections: sections
  };
  
  // Validate layout
  const validation = validateUXLayout(layout);
  if (!validation.valid) {
    throw new Error(`UX Layout validation failed: ${validation.errors.join(', ')}`);
  }
  
  console.log(`✅ UX layout built: ${sections.length} sections`);
  console.log(`   - Hero: 1`);
  console.log(`   - Video embed: ${youtubeVideoUrl ? '1' : '0'}`);
  console.log(`   - Scene sections: ${scenes.length} (combined paragraph with image each)`);
  console.log(`   - Additional sections: ${sections.length - 1 - (youtubeVideoUrl ? 1 : 0) - scenes.length}`);
  
  return layout;
}

/**
 * Main function
 */
async function createVideoBackedPage() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.error('❌ Usage: node scripts/create-page.js <domain> --video-dir <path> --youtube-video-url <url> --category <category>');
      console.error('');
      console.error('Examples:');
      console.error('   node scripts/create-page.js example.com --video-dir ./video --youtube-video-url https://youtube.com/watch?v=XXX --category home-maintenance');
      console.error('');
      console.error('Required arguments:');
      console.error('   --video-dir <path>        Directory containing storyboard.json and images');
      console.error('   --youtube-video-url <url> YouTube video URL to embed');
      console.error('   --category <category>     Category key for the page');
      process.exit(1);
    }
    
    const domain = args[0];
    
    // Parse required flags
    const videoDirIndex = args.indexOf('--video-dir');
    const youtubeUrlIndex = args.indexOf('--youtube-video-url');
    const categoryIndex = args.indexOf('--category');
    
    const videoDir = videoDirIndex !== -1 && args[videoDirIndex + 1] ? args[videoDirIndex + 1] : null;
    const youtubeVideoUrl = youtubeUrlIndex !== -1 && args[youtubeUrlIndex + 1] ? args[youtubeUrlIndex + 1] : null;
    const category = categoryIndex !== -1 && args[categoryIndex + 1] ? args[categoryIndex + 1] : null;
    
    // Validate all required arguments
    if (!videoDir || !youtubeVideoUrl || !category) {
      console.error('❌ Missing required arguments');
      if (!videoDir) console.error('   --video-dir is required');
      if (!youtubeVideoUrl) console.error('   --youtube-video-url is required');
      if (!category) console.error('   --category is required');
      process.exit(1);
    }
    
    if (!existsSync(videoDir)) {
      console.error(`❌ Video directory does not exist: ${videoDir}`);
      process.exit(1);
    }
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Resolve tenant
    console.log(`🔍 Looking up tenant by domain: ${domain}`);
    const tenant = await TenantService.getTenantByDomain(domain);
    
    if (!tenant) {
      console.error(`❌ Tenant not found with domain: ${domain}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    const tenantId = tenant._id.toString();
    
    // Validate category exists
    const categoryConfig = tenant.contentPillars?.find(c => c.categoryKey === category);
    if (!categoryConfig) {
      console.error(`❌ Category "${category}" not found in tenant's contentPillars`);
      console.error(`   Available categories: ${tenant.contentPillars?.map(c => c.categoryKey).join(', ') || 'none'}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`\n🎬 Processing video directory: ${videoDir}`);
    console.log('='.repeat(70));
    
    // A) STORYBOARD + ASSET COLLECTION
    const storyboardPath = await findStoryboardJSON(videoDir);
    const storyboardContent = await readFile(storyboardPath, 'utf-8');
    const storyboard = JSON.parse(storyboardContent);
    
    const story = validateStoryboard(storyboard);
    console.log(`✅ Found ${story.scenes.length} scene(s) in storyboard`);
    console.log(`   Story: ${story.title} (slug: ${story.slug})`);
    
    // Collect images
    console.log(`\n🖼️  Collecting images...`);
    const imageMap = await collectImages(videoDir, story.scenes);
    console.log(`✅ Found ${imageMap.size} image file(s)`);
    
    // Upload to S3
    console.log(`\n☁️  Uploading to S3...`);
    const sceneToS3Map = await uploadImagesToS3(imageMap, story.slug);
    
    // B) GEMINI PROMPT (CONTENT ONLY)
    console.log(`\n📝 Generating content with Gemini...`);
    const visualReferenceBlock = buildVisualReferenceBlock(story.scenes, sceneToS3Map);
    
    // Generate keywords
    const keywords = await KeywordService.generateKeywords(story.title, 10, tenantId);
    
    // Generate content with visual reference block
    // We'll call generateContentWithEAT but need to manually modify the prompt
    // For now, let's create a custom content generation that reuses the same logic
    const { generateText } = await import('../src/services/AIProviderService.js');
    
    // Extract brand identity (same as generateContentWithEAT)
    const brandIdentity = tenant.brandIdentity || {};
    const compliance = tenant.compliance || {};
    const tone = brandIdentity.tone || 'friendly';
    const language = brandIdentity.language || 'en';
    const brandName = brandIdentity.brandName || tenant.name || 'this website';
    const tagline = brandIdentity.tagline || '';
    
    // Build compliance warnings
    let complianceWarnings = '';
    if (compliance.forbiddenTopics?.length > 0) {
      complianceWarnings += `\n- NEVER mention or write about these topics: ${compliance.forbiddenTopics.join(', ')}`;
    }
    if (compliance.noFakePricing !== false) {
      complianceWarnings += `\n- NEVER use fake prices or made-up pricing information`;
    }
    if (compliance.noGuaranteedResults !== false) {
      complianceWarnings += `\n- NEVER use "guaranteed results" or similar absolute claims`;
    }
    
    // Build prompt with visual reference block prepended
    const prompt = `${visualReferenceBlock}Write a comprehensive, SEO-optimized article about "${story.title}" that meets Google's E-E-A-T standards (Experience, Expertise, Authoritativeness, Trustworthiness).

CRITICAL: The visual references above indicate themes/concepts that images will illustrate. Your job is to write informative, educational content about these topics/concepts. 
- Do NOT describe the images (e.g., "The image shows...", "This image depicts...", "The image features...")
- DO write valuable information about the topic/concept (what it is, why it matters, how to handle it, what to look for, etc.)
- Write as if the images don't exist - create standalone informative content that teaches readers
- The images will be displayed alongside your content to support it visually

CRITICAL WORD COUNT REQUIREMENT: The article MUST be AT LEAST 1000 words (minimum). Target 1500-2000 words for optimal SEO and authority. Do NOT create articles shorter than 1000 words. Count your words and ensure you meet this requirement.

BRAND IDENTITY:
- Brand: ${brandName}${tagline ? ` - ${tagline}` : ''}
- Tone: ${tone}
- Language: ${language}
- Write in a ${tone} tone that matches this brand's voice.

COMPLIANCE RULES (CRITICAL - MUST FOLLOW):${complianceWarnings}

VIDEO MODE INSTRUCTIONS:
- Create exactly ONE H2 section per scene (in the order provided in Visual Reference)
- Each H2 section must be informative content about the topic, NOT a description of the image
- The image is a visual reference/support - write about the topic/issue, not about what the image shows
- Each H2 section must include:
  * Informative content about the topic/issue (related to the visual_reference but not describing the image)
  * What homeowners usually overlook about this issue
  * What can happen if this issue is ignored (calm, informative tone)
  * One simple safe action homeowners can take
- CRITICAL: Do NOT write "The image shows..." or "This image depicts..." - write informative content about the topic itself
- Do NOT generate <img> tags - images are already provided
- Do NOT generate links
- Do NOT mention AI, automation, or Google
- Write valuable, informative content that teaches readers about the topic - the images support this content visually

REQUIREMENTS:
1. Content Quality (CRITICAL):
   - ABSOLUTE MINIMUM: 1000 words (required, no exceptions)
   - TARGET: 1500-2000 words for optimal SEO and authority
   - Write substantial, detailed content - do not use filler or repetition
   - Each section must contain meaningful, valuable information
   - Well-researched, factual, and up-to-date information
   - Clear structure with H2/H3 headings
   - Answer-first format (direct answer in first paragraph)
   - Scannable with bullet points, numbered lists, and short paragraphs

2. SEO Optimization:
   - Include these keywords naturally: ${keywords.join(', ')}
   - Use semantic keywords and related terms
   - Optimize for featured snippets (clear answers, lists, tables)
   - Include long-tail keywords
   - Natural keyword density (1-2% for primary keywords)

3. E-E-A-T Principles:
   - Demonstrate expertise through detailed, accurate information
   - Show experience with practical examples and real-world applications
   - Build authority with comprehensive coverage
   - Establish trustworthiness with clear sourcing and citations

4. Content Structure:
   - Start with a direct answer to the main question (100-150 words)
   - Use clear H2 headings for main sections (one per scene, in order)
   - Each H2 section should be 200-400 words with substantial, informative detail about the topic
   - Write about the issue/concept/topic itself, not about what appears in the image
   - The image supports your content - reference concepts related to the visual_reference but don't describe the image
   - Include H3 subheadings for detailed points (100-200 words each)
   - Add bullet points and numbered lists for scannability
   - Include a conclusion that summarizes key points (150-200 words)
   - MANDATORY: Include an FAQ section with 5 questions and answers (see details below)
   - Ensure total word count reaches AT LEAST 1000 words across all sections

5. FAQ Section (MANDATORY):
   - Include an FAQ section with exactly 5 questions and detailed answers
   - Use H2 heading: <h2>Frequently Asked Questions</h2>
   - Each FAQ item should follow this format:
     <h3>Question here?</h3>
     <p>Detailed answer here (100-150 words per answer). Provide comprehensive, helpful answers that address the question thoroughly.</p>
   - Questions should be relevant to the topic and things readers commonly ask
   - Answers should be substantial (100-150 words each) with detailed explanations
   - Total FAQ section should add approximately 500-750 words to the article
   - Place FAQ section before the conclusion

6. Formatting:
   - Use HTML tags: <h2> for main headings, <h3> for subheadings
   - Use <ul> and <ol> for lists
   - Use <strong> for emphasis
   - Use <p> for paragraphs
   - Include at least 4-6 H2 headings to support substantial content
   - Include at least 3-5 lists with detailed explanations
   - Each paragraph should be 3-5 sentences with detailed information

FINAL REMINDER: 
- Your article MUST be at least 1000 words total. Count your words. 
- The FAQ section with 5 questions and answers is MANDATORY and will add 500-750 words.
- Write comprehensive, detailed sections with substantial information. Short articles will be rejected.
- Structure: Introduction → Main sections (one H2 per scene) → FAQ section (5 Q&As) → Conclusion

Write the article now, ensuring it's comprehensive, valuable, includes the mandatory FAQ section, is at least 1000 words, and optimized for both search engines and human readers.`;

    const content = await generateText({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      systemPrompt: `You are an expert content writer specializing in SEO-optimized, E-E-A-T compliant articles. 
You write comprehensive, well-researched content that demonstrates expertise, experience, authoritativeness, and trustworthiness.
Your articles are optimized for Google AdSense approval and search engine visibility.
You always write original, valuable content that provides real value to readers.
CRITICAL: Every article you write MUST be at least 1000 words. Write substantial, detailed content with meaningful information. Short articles are not acceptable.
CRITICAL: Write content as pure HTML. Do NOT use markdown syntax, code blocks, or any markdown formatting. Write HTML tags directly.`,
      temperature: 0.7,
      maxTokens: 8000
    });
    
    // Clean content: Remove markdown code blocks if present
    let cleanedContent = content;
    cleanedContent = cleanedContent.replace(/```html\s*([\s\S]*?)```/gi, '$1');
    cleanedContent = cleanedContent.replace(/```\s*([\s\S]*?)```/gi, '$1');
    cleanedContent = cleanedContent.replace(/^```/gm, '').replace(/```$/gm, '');
    cleanedContent = cleanedContent.trim();
    
    // Extract meta information (simplified - reuse MicrositeBuilderAgent methods if available)
    // Remove HTML tags (including meta tags) and decode HTML entities
    let metaDescription = cleanedContent
      .replace(/<meta[^>]*>/gi, '') // Remove meta tags first
      .replace(/<[^>]+>/g, '') // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Decode &amp;
      .replace(/&lt;/g, '<') // Decode &lt;
      .replace(/&gt;/g, '>') // Decode &gt;
      .replace(/&quot;/g, '"') // Decode &quot;
      .replace(/&#39;/g, "'") // Decode &#39;
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 160)
      .trim();
    
    // Find a good breaking point (sentence end or word boundary)
    if (metaDescription.length >= 157) {
      const lastSpace = metaDescription.lastIndexOf(' ');
      if (lastSpace > 120) {
        metaDescription = metaDescription.substring(0, lastSpace) + '...';
      } else {
        metaDescription = metaDescription.substring(0, 157) + '...';
      }
    }
    const metaTitle = story.title;
    const author = {
      name: tenant.name || 'Content Team',
      bio: `Expert content creators at ${tenant.name}`,
      expertise: keywords.slice(0, 3)
    };
    
    // Extract citations (look for URLs in content)
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const citations = (cleanedContent.match(urlRegex) || []).slice(0, 5);
    
    const contentData = {
      content: cleanedContent,
      metaTitle,
      metaDescription,
      author,
      citations
    };
    
    console.log(`✅ Content generated (${contentData.content.length} characters)`);
    
    // Validate content quality
    const qualityCheck = ContentQualityValidator.validateContent(
      contentData.content,
      {
        title: contentData.metaTitle || story.title,
        description: contentData.metaDescription,
        keywords,
        author: contentData.author
      }
    );
    
    if (!qualityCheck.valid) {
      console.warn(`⚠️  Content quality issues:`, qualityCheck.issues);
    }
    console.log(`📊 Content quality score: ${qualityCheck.score}/100`);
    
    // C) UX LAYOUT ADAPTATION (VIDEO-BACKED)
    console.log(`\n🏗️  Building video-backed UX layout...`);
    const uxLayout = buildVideoBackedUXLayout(
      story,
      story.scenes,
      sceneToS3Map,
      contentData.content,
      youtubeVideoUrl
    );
    
    // Optimize layout (reuses existing service)
    const optimizedLayout = ImageOptimizationService.optimizeLayoutImages(uxLayout);
    
    // Calculate metrics
    const wordCount = qualityCheck.metrics.wordCount;
    const readingTime = Math.ceil(wordCount / 200);
    
    // Generate schema markup
    const baseUrl = `https://${tenant.domain}`;
    const pageSlug = slugify(story.title);
    const schemaMarkup = SchemaMarkupService.generateAllSchemas(
      {
        title: story.title,
        slug: pageSlug,
        content: contentData.content,
        wordCount,
        categoryKey: category
      },
      tenant,
      baseUrl
    );
    
    // D) CREATE PAGE
    console.log(`\n📄 Creating page...`);
    
    // Prepare thumbnail: if YouTube URL is provided, use it as thumbnail URL
    const thumbnail = youtubeVideoUrl ? {
      url: youtubeVideoUrl
    } : null;
    
    // Check if page already exists
    const existingPage = await PageService.getPageBySlug(tenantId, pageSlug, true);
    
    if (existingPage) {
      console.log(`⚠️  Page with slug "${pageSlug}" already exists. Updating...`);
      
      const updateData = {
        title: story.title,
        content: contentData.content,
        meta: {
          title: contentData.metaTitle || story.title,
          description: contentData.metaDescription || contentData.content.substring(0, 160),
          keywords,
          author: contentData.author,
          citations: contentData.citations,
          lastReviewed: new Date()
        },
        uxLayout: optimizedLayout,
        schemaMarkup,
        readingTime,
        wordCount,
        categoryKey: category,
        primaryKeyword: keywords[0] || story.title
      };
      
      // Set thumbnail if YouTube URL is provided
      if (thumbnail) {
        updateData.thumbnail = thumbnail;
        console.log(`   📸 Setting thumbnail to YouTube URL: ${youtubeVideoUrl}`);
      }
      
      await PageService.updatePage(existingPage._id, updateData);
      
      console.log(`✅ Page updated: "${story.title}" (slug: ${pageSlug})`);
    } else {
      const pageData = {
        tenantId,
        title: story.title,
        slug: pageSlug,
        content: contentData.content,
        published: true, // Publish immediately
        meta: {
          title: contentData.metaTitle || story.title,
          description: contentData.metaDescription || contentData.content.substring(0, 160),
          keywords,
          author: contentData.author,
          citations: contentData.citations,
          lastReviewed: new Date()
        },
        uxLayout: optimizedLayout,
        schemaMarkup,
        readingTime,
        wordCount,
        categoryKey: category,
        primaryKeyword: keywords[0] || story.title,
        adZones: ['above-content', 'mid-content', 'below-content'],
        qualityScore: qualityCheck.score,
        intent: 'informational',
        monetizationMode: 'adsense'
      };
      
      // Set thumbnail if YouTube URL is provided
      if (thumbnail) {
        pageData.thumbnail = thumbnail;
        console.log(`   📸 Setting thumbnail to YouTube URL: ${youtubeVideoUrl}`);
      }
      
      const page = await PageService.createPage(pageData);
      
      console.log(`✅ Page created: "${story.title}" (slug: ${pageSlug})`);
    }
    
    // Logging
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`   UX layout mode: video-backed`);
    console.log(`   Total scenes: ${story.scenes.length}`);
    console.log(`   Total paragraphs with images: ${story.scenes.length}`);
    console.log(`   YouTube video embedded: ${youtubeVideoUrl ? 'Yes' : 'No'}`);
    console.log(`   Category: ${category}`);
    console.log(`   Page slug: ${pageSlug}`);
    console.log('='.repeat(70) + '\n');
    
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ Fatal error:', error.message);
    console.error('='.repeat(70));
    
    if (process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

createVideoBackedPage();

