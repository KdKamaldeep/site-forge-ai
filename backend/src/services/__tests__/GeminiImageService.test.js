/**
 * Test suite for GeminiImageService
 * Tests image generation functionality
 * 
 * Run with: node src/services/__tests__/GeminiImageService.test.js
 */

import { GeminiImageService } from '../GeminiImageService.js';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_PROMPT = 'A clean, professional editorial thumbnail image of a laptop on a desk with soft lighting';
const TEST_OPTIONS = {
  width: 1200,
  height: 675,
  style: 'professional',
  context: 'thumbnail',
  tenantId: null, // Use null for tests to avoid ObjectId validation errors
  provider: 'gemini'
};

// Helper function to clean up test images
function cleanupTestImages() {
  const imagesDir = path.join(__dirname, '../../../images');
  if (existsSync(imagesDir)) {
    // Note: In a real test, you'd want to track created files and delete only those
    // For now, we'll just check if the directory exists
    console.log('📁 Images directory exists');
  }
}

// Helper to extract filename from URL
function extractFilenameFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/images\/([^\/]+)$/);
  return match ? match[1] : null;
}

/**
 * Test 1: Basic image generation
 */
async function testBasicImageGeneration() {
  console.log('\n🧪 Test 1: Basic Image Generation');
  console.log('=' .repeat(50));
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️  Skipping test: GEMINI_API_KEY not set');
      return { passed: false, skipped: true, reason: 'GEMINI_API_KEY not set' };
    }

    console.log(`📝 Prompt: "${TEST_PROMPT}"`);
    console.log(`📐 Options: ${JSON.stringify(TEST_OPTIONS, null, 2)}`);
    
    const startTime = Date.now();
    const imageUrl = await GeminiImageService.generateImage(TEST_PROMPT, TEST_OPTIONS);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Image generated in ${duration}ms`);
    console.log(`📸 Image URL: ${imageUrl}`);
    
    // Verify URL format
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Image URL is not a valid string');
    }
    
    if (!imageUrl.includes('/images/')) {
      throw new Error('Image URL does not contain /images/ path');
    }
    
    // Extract filename and verify file exists
    const filename = extractFilenameFromUrl(imageUrl);
    if (!filename) {
      throw new Error('Could not extract filename from URL');
    }
    
    const filePath = path.join(__dirname, '../../../images', filename);
    if (!existsSync(filePath)) {
      throw new Error(`Image file does not exist: ${filePath}`);
    }
    
    // Verify file is not empty
    const fileStats = readFileSync(filePath);
    if (fileStats.length === 0) {
      throw new Error('Image file is empty');
    }
    
    console.log(`✅ File exists and is ${fileStats.length} bytes`);
    console.log(`✅ Test passed!`);
    
    return { 
      passed: true, 
      imageUrl, 
      filename, 
      fileSize: fileStats.length,
      duration 
    };
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return { passed: false, error: error.message };
  }
}

/**
 * Test 2: Image generation with different dimensions
 */
async function testDifferentDimensions() {
  console.log('\n🧪 Test 2: Different Dimensions');
  console.log('=' .repeat(50));
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️  Skipping test: GEMINI_API_KEY not set');
      return { passed: false, skipped: true };
    }

    const testCases = [
      { width: 800, height: 600, name: '4:3 ratio' },
      { width: 1920, height: 1080, name: '16:9 ratio' },
      { width: 1200, height: 1200, name: '1:1 ratio' }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      console.log(`\n📐 Testing ${testCase.name} (${testCase.width}x${testCase.height})...`);
      
      const options = {
        ...TEST_OPTIONS,
        width: testCase.width,
        height: testCase.height
      };
      
      const startTime = Date.now();
      const imageUrl = await GeminiImageService.generateImage(TEST_PROMPT, options);
      const duration = Date.now() - startTime;
      
      const filename = extractFilenameFromUrl(imageUrl);
      const filePath = path.join(__dirname, '../../../images', filename);
      
      if (existsSync(filePath)) {
        const fileStats = readFileSync(filePath);
        console.log(`✅ Generated ${testCase.name}: ${fileStats.length} bytes in ${duration}ms`);
        results.push({ 
          ...testCase, 
          passed: true, 
          fileSize: fileStats.length,
          duration 
        });
      } else {
        throw new Error(`File not found for ${testCase.name}`);
      }
    }
    
    console.log(`\n✅ All dimension tests passed!`);
    return { passed: true, results };
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 3: Error handling - missing API key
 */
async function testErrorHandling() {
  console.log('\n🧪 Test 3: Error Handling');
  console.log('=' .repeat(50));
  
  try {
    // Save original API key
    const originalKey = process.env.GEMINI_API_KEY;
    
    // Temporarily remove API key
    delete process.env.GEMINI_API_KEY;
    
    try {
      await GeminiImageService.generateImage(TEST_PROMPT, TEST_OPTIONS);
      // Should not reach here
      throw new Error('Expected error for missing API key');
    } catch (error) {
      if (error.message.includes('GEMINI_API_KEY') || error.message.includes('required')) {
        console.log('✅ Correctly throws error for missing API key');
      } else {
        throw error;
      }
    } finally {
      // Restore API key
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    }
    
    return { passed: true };
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 4: Prompt enhancement
 */
async function testPromptEnhancement() {
  console.log('\n🧪 Test 4: Prompt Enhancement');
  console.log('=' .repeat(50));
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️  Skipping test: GEMINI_API_KEY not set');
      return { passed: false, skipped: true };
    }

    const simplePrompt = 'laptop on desk';
    console.log(`📝 Original prompt: "${simplePrompt}"`);
    
    const enhancedPrompt = await GeminiImageService.generateImagePrompt(simplePrompt, {
      style: 'professional',
      context: 'thumbnail'
    });
    
    console.log(`✨ Enhanced prompt: "${enhancedPrompt}"`);
    
    if (!enhancedPrompt || enhancedPrompt.length < simplePrompt.length) {
      throw new Error('Enhanced prompt should be longer than original');
    }
    
    if (enhancedPrompt === simplePrompt) {
      console.log('⚠️  Prompt was not enhanced (might be fallback)');
    }
    
    console.log('✅ Prompt enhancement test passed');
    return { passed: true, original: simplePrompt, enhanced: enhancedPrompt };
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 5: Full generateImage flow (with prompt enhancement)
 */
async function testFullGenerateImageFlow() {
  console.log('\n🧪 Test 5: Full generateImage Flow');
  console.log('=' .repeat(50));
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️  Skipping test: GEMINI_API_KEY not set');
      return { passed: false, skipped: true };
    }

    const simplePrompt = 'professional workspace';
    console.log(`📝 Simple prompt: "${simplePrompt}"`);
    
    const startTime = Date.now();
    const imageUrl = await GeminiImageService.generateImage(simplePrompt, TEST_OPTIONS);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Full flow completed in ${duration}ms`);
    console.log(`📸 Image URL: ${imageUrl}`);
    
    // Verify image exists
    const filename = extractFilenameFromUrl(imageUrl);
    const filePath = path.join(__dirname, '../../../images', filename);
    
    if (!existsSync(filePath)) {
      throw new Error('Generated image file does not exist');
    }
    
    const fileStats = readFileSync(filePath);
    console.log(`✅ Image file: ${fileStats.length} bytes`);
    
    return { passed: true, imageUrl, fileSize: fileStats.length, duration };
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Starting Gemini Image Service Tests');
  console.log('=' .repeat(50));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
  };
  
  // Run all tests
  const tests = [
    { name: 'Basic Image Generation', fn: testBasicImageGeneration },
    { name: 'Different Dimensions', fn: testDifferentDimensions },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Prompt Enhancement', fn: testPromptEnhancement },
    { name: 'Full generateImage Flow', fn: testFullGenerateImageFlow }
  ];
  
  for (const test of tests) {
    results.total++;
    console.log(`\n▶️  Running: ${test.name}`);
    
    try {
      const result = await test.fn();
      results.tests.push({ name: test.name, ...result });
      
      if (result.skipped) {
        results.skipped++;
        console.log(`⏭️  ${test.name}: Skipped`);
      } else if (result.passed) {
        results.passed++;
        console.log(`✅ ${test.name}: Passed`);
      } else {
        results.failed++;
        console.log(`❌ ${test.name}: Failed`);
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ 
        name: test.name, 
        passed: false, 
        error: error.message 
      });
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
  
  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Summary');
  console.log('=' .repeat(50));
  console.log(`Total: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log('=' .repeat(50));
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
// Check if this is the main module by comparing the resolved paths
const currentFile = path.resolve(__filename);
const mainFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFile === mainFile || process.argv[1]?.includes('GeminiImageService.test.js')) {
  runAllTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  });
}

export {
  testBasicImageGeneration,
  testDifferentDimensions,
  testErrorHandling,
  testPromptEnhancement,
  testFullGenerateImageFlow,
  runAllTests
};
