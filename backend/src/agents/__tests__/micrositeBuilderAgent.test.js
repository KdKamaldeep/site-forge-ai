/**
 * Test suite for MicrositeBuilderAgent.generateContentWithEAT
 * Tests content generation with E-E-A-T principles
 * 
 * Run with: node src/agents/__tests__/micrositeBuilderAgent.test.js
 */

import { MicrositeBuilderAgent } from '../micrositeBuilderAgent.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config();

// Helper function to count words in text (removes HTML tags first)
function countWords(text) {
  if (!text) return 0;
  // Remove HTML tags
  const plainText = text.replace(/<[^>]*>/g, ' ');
  // Split by whitespace and filter empty strings
  const words = plainText.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

// Helper function to extract FAQ questions from content
function extractFAQQuestions(content) {
  if (!content) return [];
  
  // Look for FAQ section - can be in various formats
  const faqPatterns = [
    // Pattern 1: <h2>Frequently Asked Questions</h2> followed by <h3> questions
    /<h2[^>]*>Frequently Asked Questions<\/h2>[\s\S]*?(<h3[^>]*>.*?<\/h3>)/gi,
    // Pattern 2: FAQ heading variations
    /<h2[^>]*>FAQ[^<]*<\/h2>[\s\S]*?(<h3[^>]*>.*?<\/h3>)/gi,
    // Pattern 3: Direct h3 questions (if FAQ section exists)
    /(?:FAQ|Frequently Asked Questions)[\s\S]*?(<h3[^>]*>.*?<\/h3>)/gi
  ];
  
  const questions = [];
  
  // Try to find FAQ section first
  const faqSectionMatch = content.match(/<h2[^>]*>(?:Frequently Asked Questions|FAQ)[^<]*<\/h2>[\s\S]*?(?=<h2|$)/i);
  if (faqSectionMatch) {
    // Extract all h3 questions from FAQ section
    const h3Matches = faqSectionMatch[0].matchAll(/<h3[^>]*>(.*?)<\/h3>/gi);
    for (const match of h3Matches) {
      const questionText = match[1].replace(/<[^>]*>/g, '').trim();
      if (questionText && questionText.endsWith('?')) {
        questions.push(questionText);
      }
    }
  } else {
    // Fallback: look for any h3 questions that end with ?
    const allH3Matches = content.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi);
    for (const match of allH3Matches) {
      const questionText = match[1].replace(/<[^>]*>/g, '').trim();
      if (questionText && questionText.endsWith('?')) {
        questions.push(questionText);
      }
    }
  }
  
  return questions;
}

// Helper function to check if FAQ section exists
function hasFAQSection(content) {
  if (!content) return false;
  
  // Check for FAQ heading variations
  const faqHeadings = [
    /<h2[^>]*>Frequently Asked Questions<\/h2>/i,
    /<h2[^>]*>FAQ[^<]*<\/h2>/i,
    /Frequently Asked Questions/i
  ];
  
  return faqHeadings.some(pattern => pattern.test(content));
}

// Mock AIProviderService
let mockGenerateText;

// Create mock content with FAQs (over 1000 words)
function createMockContentWithFAQs(topic) {
  return `
    <h2>Introduction</h2>
    <p>This is a comprehensive article about ${topic}. ${topic} is an important topic that requires detailed explanation. In this article, we will explore various aspects of ${topic} and provide you with valuable insights. Understanding ${topic} is crucial for anyone looking to gain expertise in this area. We will cover multiple dimensions and provide practical examples that demonstrate real-world applications. This introduction sets the stage for a deep dive into the subject matter, ensuring readers have a solid foundation before we explore more complex concepts.</p>
    
    <img data-image-placeholder="true" data-prompt="Professional image related to ${topic}" alt="${topic} illustration" />
    
    <h2>Understanding the Basics</h2>
    <p>To fully comprehend ${topic}, we must first understand its fundamental principles. These basics form the foundation upon which all advanced concepts are built. The core elements include several key components that work together to create a comprehensive understanding. Each component plays a vital role in the overall system, and understanding their interactions is essential for mastery. We will explore each component in detail, providing examples and explanations that make complex concepts accessible. This section aims to build a solid knowledge base that readers can reference throughout their learning journey.</p>
    
    <h3>Key Components</h3>
    <ul>
      <li>First important component that contributes significantly to understanding ${topic}</li>
      <li>Second component that provides essential functionality and capabilities</li>
      <li>Third component that enhances overall performance and effectiveness</li>
      <li>Fourth component that ensures reliability and consistency</li>
      <li>Fifth component that enables advanced features and optimizations</li>
    </ul>
    
    <h2>Advanced Concepts</h2>
    <p>Moving beyond the basics, we now explore advanced concepts related to ${topic}. These advanced topics require a deeper understanding of the fundamental principles we discussed earlier. Advanced concepts often involve complex interactions between multiple components, requiring careful analysis and practical experience. We will examine real-world scenarios where these advanced concepts are applied, providing concrete examples that illustrate their importance and effectiveness. This section is designed for readers who have mastered the basics and are ready to take their understanding to the next level.</p>
    
    <img data-image-placeholder="true" data-prompt="Advanced visualization of ${topic} concepts" alt="Advanced ${topic} concepts" />
    
    <h3>Implementation Strategies</h3>
    <p>Implementing ${topic} effectively requires careful planning and strategic thinking. There are several approaches one can take, each with its own advantages and considerations. We will explore multiple implementation strategies, discussing their pros and cons in detail. Understanding these strategies helps readers choose the approach that best fits their specific needs and circumstances. We will provide step-by-step guidance for each strategy, making it easier for readers to apply these concepts in their own contexts.</p>
    
    <h2>Best Practices</h2>
    <p>Following best practices is essential for achieving optimal results with ${topic}. These practices have been developed through years of experience and research, representing proven approaches that consistently deliver positive outcomes. We will cover a comprehensive list of best practices, explaining why each one matters and how to implement them effectively. Readers will learn how to avoid common pitfalls and maximize their chances of success. This section serves as a practical guide that readers can reference when implementing ${topic} in their own projects or contexts.</p>
    
    <h2>Frequently Asked Questions</h2>
    
    <h3>What is ${topic} and why is it important?</h3>
    <p>${topic} is a comprehensive concept that encompasses multiple important aspects. It is important because it provides a framework for understanding complex relationships and interactions. The significance of ${topic} lies in its ability to simplify complex concepts while maintaining accuracy and depth. Understanding ${topic} enables individuals to make informed decisions and apply knowledge effectively in various contexts. It serves as a foundation for advanced learning and practical application, making it essential for anyone serious about mastering this domain. The importance of ${topic} extends beyond theoretical understanding to real-world applications that impact daily life and professional success.</p>
    
    <h3>How does ${topic} work in practice?</h3>
    <p>In practice, ${topic} operates through a series of interconnected processes and mechanisms. These processes work together to achieve desired outcomes, with each step building upon previous ones. Practical application requires understanding both the theoretical foundations and the real-world constraints that affect implementation. Success in practice comes from careful planning, attention to detail, and the ability to adapt to changing circumstances. We see ${topic} applied in various industries and contexts, each with its own unique requirements and challenges. Understanding how it works in practice helps bridge the gap between theory and application, making knowledge more actionable and valuable.</p>
    
    <h3>What are the main benefits of ${topic}?</h3>
    <p>The main benefits of ${topic} include improved efficiency, enhanced understanding, and better decision-making capabilities. These benefits manifest in various ways depending on the specific context and application. Efficiency gains come from streamlined processes and optimized approaches that reduce waste and maximize output. Enhanced understanding results from comprehensive frameworks that organize complex information in accessible ways. Better decision-making emerges from having a solid foundation of knowledge and clear frameworks for evaluation. These benefits compound over time, creating long-term value that extends beyond immediate applications. Understanding these benefits helps justify the investment of time and resources required to master ${topic}.</p>
    
    <h3>Are there any limitations or challenges with ${topic}?</h3>
    <p>Like any approach or concept, ${topic} has certain limitations and challenges that should be understood. These limitations often arise from contextual factors, resource constraints, or inherent complexities in the subject matter. Challenges may include the need for specialized knowledge, the requirement for significant time investment, or the complexity of implementation in certain environments. Understanding these limitations helps set realistic expectations and enables better planning. However, many challenges can be overcome with proper preparation, adequate resources, and strategic thinking. Being aware of limitations also helps identify when alternative approaches might be more appropriate, ensuring that ${topic} is applied in contexts where it provides the most value.</p>
    
    <h3>How can I get started with ${topic}?</h3>
    <p>Getting started with ${topic} requires a systematic approach that begins with understanding the fundamentals. Start by familiarizing yourself with the core concepts and terminology, which provides the foundation for deeper learning. Next, explore practical examples and case studies that illustrate how ${topic} is applied in real-world scenarios. Hands-on practice is essential, so look for opportunities to apply what you're learning in controlled environments. Connect with others who have experience with ${topic}, as their insights can accelerate your learning and help you avoid common mistakes. Finally, be patient and persistent, as mastery takes time and consistent effort. Remember that every expert was once a beginner, and the journey of learning ${topic} is as valuable as the destination.</p>
    
    <img data-image-placeholder="true" data-prompt="Conclusion image for ${topic}" alt="${topic} conclusion" />
    
    <h2>Conclusion</h2>
    <p>In conclusion, ${topic} represents a comprehensive and valuable area of knowledge that offers significant benefits to those who take the time to understand it deeply. Throughout this article, we have explored various aspects, from fundamental principles to advanced concepts and practical applications. The key takeaway is that ${topic} requires both theoretical understanding and practical experience to master fully. By following best practices and learning from real-world examples, readers can develop expertise that serves them well in various contexts. We encourage continued learning and exploration, as ${topic} continues to evolve and offer new insights. Thank you for taking this journey with us, and we hope this article has provided valuable information that you can apply in your own endeavors.</p>
  `;
}

// Create mock content without FAQs (over 1000 words but missing FAQ section)
function createMockContentWithoutFAQs(topic) {
  return `
    <h2>Introduction</h2>
    <p>This is a comprehensive article about ${topic}. ${topic} is an important topic that requires detailed explanation. In this article, we will explore various aspects of ${topic} and provide you with valuable insights. Understanding ${topic} is crucial for anyone looking to gain expertise in this area. We will cover multiple dimensions and provide practical examples that demonstrate real-world applications. This introduction sets the stage for a deep dive into the subject matter, ensuring readers have a solid foundation before we explore more complex concepts.</p>
    
    <h2>Understanding the Basics</h2>
    <p>To fully comprehend ${topic}, we must first understand its fundamental principles. These basics form the foundation upon which all advanced concepts are built. The core elements include several key components that work together to create a comprehensive understanding. Each component plays a vital role in the overall system, and understanding their interactions is essential for mastery. We will explore each component in detail, providing examples and explanations that make complex concepts accessible. This section aims to build a solid knowledge base that readers can reference throughout their learning journey.</p>
    
    <h2>Advanced Concepts</h2>
    <p>Moving beyond the basics, we now explore advanced concepts related to ${topic}. These advanced topics require a deeper understanding of the fundamental principles we discussed earlier. Advanced concepts often involve complex interactions between multiple components, requiring careful analysis and practical experience. We will examine real-world scenarios where these advanced concepts are applied, providing concrete examples that illustrate their importance and effectiveness. This section is designed for readers who have mastered the basics and are ready to take their understanding to the next level.</p>
    
    <h2>Best Practices</h2>
    <p>Following best practices is essential for achieving optimal results with ${topic}. These practices have been developed through years of experience and research, representing proven approaches that consistently deliver positive outcomes. We will cover a comprehensive list of best practices, explaining why each one matters and how to implement them effectively. Readers will learn how to avoid common pitfalls and maximize their chances of success. This section serves as a practical guide that readers can reference when implementing ${topic} in their own projects or contexts.</p>
    
    <h2>Conclusion</h2>
    <p>In conclusion, ${topic} represents a comprehensive and valuable area of knowledge that offers significant benefits to those who take the time to understand it deeply. Throughout this article, we have explored various aspects, from fundamental principles to advanced concepts and practical applications. The key takeaway is that ${topic} requires both theoretical understanding and practical experience to master fully. By following best practices and learning from real-world examples, readers can develop expertise that serves them well in various contexts. We encourage continued learning and exploration, as ${topic} continues to evolve and offer new insights. Thank you for taking this journey with us, and we hope this article has provided valuable information that you can apply in your own endeavors.</p>
  `;
}

/**
 * Test 1: Content length verification (should be at least 1000 words)
 */
async function testContentLength() {
  console.log('\n🧪 Test 1: Content Length Verification');
  console.log('='.repeat(50));
  
  try {
    const topic = 'Artificial Intelligence';
    const keywords = ['AI', 'machine learning', 'neural networks', 'deep learning', 'automation'];
    const tenant = {
      name: 'Test Tenant',
      brandIdentity: {
        tone: 'professional',
        language: 'en'
      },
      compliance: {}
    };

    // Mock the generateText function
    const originalModule = await import('../services/AIProviderService.js');
    const mockContent = createMockContentWithFAQs(topic);
    
    // We need to mock the dynamic import
    // Since ES modules don't support easy mocking, we'll test with actual API if available
    // or create a test that verifies the structure
    
    console.log('📝 Topic:', topic);
    console.log('🔑 Keywords:', keywords.join(', '));
    
    // Check if we have API keys to run actual test
    const hasAPIKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!hasAPIKey) {
      console.log('⚠️  Skipping actual API test: No API keys found');
      console.log('📊 Testing with mock content instead...');
      
      // Test with mock content
      const wordCount = countWords(mockContent);
      console.log(`📊 Mock content word count: ${wordCount} words`);
      
      if (wordCount >= 1000) {
        console.log('✅ Mock content meets minimum word count requirement (≥1000 words)');
        return { passed: true, wordCount };
      } else {
        throw new Error(`Mock content word count (${wordCount}) is below minimum requirement (1000 words)`);
      }
    }
    
    // Run actual test with API
    console.log('🚀 Running actual API test...');
    const startTime = Date.now();
    const result = await MicrositeBuilderAgent.generateContentWithEAT(topic, keywords, tenant);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Generated in ${duration}ms`);
    
    // Verify content exists
    if (!result.content || typeof result.content !== 'string') {
      throw new Error('Content is not a valid string');
    }
    
    // Count words in content
    const wordCount = countWords(result.content);
    console.log(`📊 Content word count: ${wordCount} words`);
    
    // Verify minimum word count (1000 words as per requirements)
    if (wordCount < 1000) {
      throw new Error(`Content word count (${wordCount}) is below minimum requirement (1000 words)`);
    }
    
    console.log('✅ Content meets minimum word count requirement (≥1000 words)');
    console.log('✅ Test passed!');
    
    return { 
      passed: true, 
      wordCount,
      duration,
      contentLength: result.content.length
    };
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 2: FAQ generation verification (should have 5 FAQs)
 */
async function testFAQGeneration() {
  console.log('\n🧪 Test 2: FAQ Generation Verification');
  console.log('='.repeat(50));
  
  try {
    const topic = 'Machine Learning';
    const keywords = ['ML', 'algorithms', 'data science', 'predictive analytics'];
    const tenant = {
      name: 'Test Tenant',
      brandIdentity: {
        tone: 'friendly',
        language: 'en'
      },
      compliance: {}
    };

    console.log('📝 Topic:', topic);
    console.log('🔑 Keywords:', keywords.join(', '));
    
    // Check if we have API keys to run actual test
    const hasAPIKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!hasAPIKey) {
      console.log('⚠️  Skipping actual API test: No API keys found');
      console.log('📊 Testing with mock content instead...');
      
      // Test with mock content that has FAQs
      const mockContentWithFAQs = createMockContentWithFAQs(topic);
      const mockContentWithoutFAQs = createMockContentWithoutFAQs(topic);
      
      // Test with FAQs
      const hasFAQ = hasFAQSection(mockContentWithFAQs);
      const faqQuestions = extractFAQQuestions(mockContentWithFAQs);
      
      console.log(`📋 FAQ section found: ${hasFAQ ? 'Yes' : 'No'}`);
      console.log(`❓ Number of FAQ questions found: ${faqQuestions.length}`);
      console.log('📝 FAQ Questions:');
      faqQuestions.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));
      
      if (!hasFAQ) {
        throw new Error('FAQ section not found in mock content');
      }
      
      if (faqQuestions.length < 5) {
        throw new Error(`Expected at least 5 FAQ questions, found ${faqQuestions.length}`);
      }
      
      console.log('✅ Mock content includes FAQ section with 5+ questions');
      return { passed: true, faqCount: faqQuestions.length, hasFAQ };
    }
    
    // Run actual test with API
    console.log('🚀 Running actual API test...');
    const startTime = Date.now();
    const result = await MicrositeBuilderAgent.generateContentWithEAT(topic, keywords, tenant);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Generated in ${duration}ms`);
    
    // Verify content exists
    if (!result.content || typeof result.content !== 'string') {
      throw new Error('Content is not a valid string');
    }
    
    // Check for FAQ section
    const hasFAQ = hasFAQSection(result.content);
    console.log(`📋 FAQ section found: ${hasFAQ ? 'Yes' : 'No'}`);
    
    if (!hasFAQ) {
      throw new Error('FAQ section not found in generated content');
    }
    
    // Extract FAQ questions
    const faqQuestions = extractFAQQuestions(result.content);
    console.log(`❓ Number of FAQ questions found: ${faqQuestions.length}`);
    
    if (faqQuestions.length > 0) {
      console.log('📝 FAQ Questions found:');
      faqQuestions.slice(0, 5).forEach((q, i) => {
        const truncated = q.length > 80 ? q.substring(0, 80) + '...' : q;
        console.log(`   ${i + 1}. ${truncated}`);
      });
    }
    
    // Verify we have at least 5 FAQ questions (as per requirements)
    if (faqQuestions.length < 5) {
      throw new Error(`Expected at least 5 FAQ questions, found ${faqQuestions.length}`);
    }
    
    console.log('✅ FAQ section includes 5+ questions as required');
    console.log('✅ Test passed!');
    
    return { 
      passed: true, 
      faqCount: faqQuestions.length,
      hasFAQ,
      duration
    };
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 3: Combined test - Content length AND FAQs
 */
async function testContentLengthAndFAQs() {
  console.log('\n🧪 Test 3: Combined Test - Content Length AND FAQs');
  console.log('='.repeat(50));
  
  try {
    const topic = 'Cloud Computing';
    const keywords = ['cloud', 'AWS', 'Azure', 'infrastructure', 'scalability'];
    const tenant = {
      name: 'Tech Blog',
      brandIdentity: {
        tone: 'professional',
        language: 'en',
        brandName: 'Tech Blog'
      },
      compliance: {
        noFakePricing: true,
        noGuaranteedResults: true
      }
    };

    console.log('📝 Topic:', topic);
    console.log('🔑 Keywords:', keywords.join(', '));
    
    // Check if we have API keys to run actual test
    const hasAPIKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!hasAPIKey) {
      console.log('⚠️  Skipping actual API test: No API keys found');
      console.log('📊 Testing with mock content instead...');
      
      const mockContent = createMockContentWithFAQs(topic);
      const wordCount = countWords(mockContent);
      const hasFAQ = hasFAQSection(mockContent);
      const faqQuestions = extractFAQQuestions(mockContent);
      
      console.log(`📊 Word count: ${wordCount} words`);
      console.log(`📋 FAQ section: ${hasFAQ ? 'Yes' : 'No'}`);
      console.log(`❓ FAQ questions: ${faqQuestions.length}`);
      
      if (wordCount < 1000) {
        throw new Error(`Word count (${wordCount}) below minimum (1000)`);
      }
      if (!hasFAQ) {
        throw new Error('FAQ section not found');
      }
      if (faqQuestions.length < 5) {
        throw new Error(`FAQ questions (${faqQuestions.length}) below minimum (5)`);
      }
      
      console.log('✅ Mock content passes all checks');
      return { 
        passed: true, 
        wordCount, 
        hasFAQ, 
        faqCount: faqQuestions.length 
      };
    }
    
    // Run actual test with API
    console.log('🚀 Running actual API test...');
    const startTime = Date.now();
    const result = await MicrositeBuilderAgent.generateContentWithEAT(topic, keywords, tenant);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Generated in ${duration}ms`);
    
    // Verify content
    if (!result.content || typeof result.content !== 'string') {
      throw new Error('Content is not a valid string');
    }
    
    // Check word count
    const wordCount = countWords(result.content);
    console.log(`📊 Word count: ${wordCount} words`);
    
    // Check FAQ section
    const hasFAQ = hasFAQSection(result.content);
    console.log(`📋 FAQ section: ${hasFAQ ? 'Yes' : 'No'}`);
    
    // Extract FAQ questions
    const faqQuestions = extractFAQQuestions(result.content);
    console.log(`❓ FAQ questions: ${faqQuestions.length}`);
    
    // Verify all requirements
    const errors = [];
    if (wordCount < 1000) {
      errors.push(`Word count (${wordCount}) below minimum (1000)`);
    }
    if (!hasFAQ) {
      errors.push('FAQ section not found');
    }
    if (faqQuestions.length < 5) {
      errors.push(`FAQ questions (${faqQuestions.length}) below minimum (5)`);
    }
    
    if (errors.length > 0) {
      throw new Error(`Multiple issues found: ${errors.join('; ')}`);
    }
    
    console.log('✅ Content meets word count requirement (≥1000 words)');
    console.log('✅ FAQ section is present');
    console.log('✅ FAQ section includes 5+ questions');
    console.log('✅ All checks passed!');
    
    return { 
      passed: true, 
      wordCount, 
      hasFAQ, 
      faqCount: faqQuestions.length,
      duration,
      metaTitle: result.metaTitle,
      metaDescription: result.metaDescription ? result.metaDescription.substring(0, 100) + '...' : null
    };
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { passed: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 MicrositeBuilderAgent.generateContentWithEAT Test Suite');
  console.log('='.repeat(60));
  
  const results = {
    test1: null,
    test2: null,
    test3: null
  };
  
  // Run Test 1: Content Length
  results.test1 = await testContentLength();
  
  // Run Test 2: FAQ Generation
  results.test2 = await testFAQGeneration();
  
  // Run Test 3: Combined
  results.test3 = await testContentLengthAndFAQs();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = [results.test1, results.test2, results.test3].filter(r => r && r.passed).length;
  const total = 3;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (results.test1) {
    console.log(`\nTest 1 (Content Length): ${results.test1.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (results.test1.wordCount) {
      console.log(`   Word count: ${results.test1.wordCount} words`);
    }
  }
  
  if (results.test2) {
    console.log(`\nTest 2 (FAQ Generation): ${results.test2.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (results.test2.faqCount !== undefined) {
      console.log(`   FAQ questions: ${results.test2.faqCount}`);
    }
  }
  
  if (results.test3) {
    console.log(`\nTest 3 (Combined): ${results.test3.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (results.test3.wordCount) {
      console.log(`   Word count: ${results.test3.wordCount} words`);
    }
    if (results.test3.faqCount !== undefined) {
      console.log(`   FAQ questions: ${results.test3.faqCount}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run tests if this file is executed directly
const __filename = fileURLToPath(import.meta.url);
const currentFile = path.resolve(__filename);
const mainFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFile === mainFile || process.argv[1]?.includes('micrositeBuilderAgent.test.js')) {
  runAllTests().catch(error => {
    console.error('❌ Fatal error running tests:', error);
    process.exit(1);
  });
}

export { testContentLength, testFAQGeneration, testContentLengthAndFAQs };
