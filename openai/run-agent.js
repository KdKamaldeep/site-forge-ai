/**
 * Run OpenAI Agent
 * Executes the Microsite Builder Agent for a given domain
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { toolHandlers, initializeAuth } from './tool-handlers.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const AGENT_ID_FILE = join(__dirname, 'agent-id.txt');

/**
 * Load agent ID from file
 */
async function loadAgentId() {
  try {
    const agentId = await readFile(AGENT_ID_FILE, 'utf-8');
    return agentId.trim();
  } catch (error) {
    console.error('❌ Error reading agent-id.txt:', error.message);
    console.error('   Please run: node openai/register-agent.js first');
    process.exit(1);
  }
}

/**
 * Handle tool calls from the agent
 */
async function handleToolCall(toolCall) {
  const { name, arguments: args } = toolCall.function;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 Tool Call: ${name}`);
  console.log(`   Arguments: ${JSON.stringify(args, null, 2).substring(0, 200)}...`);
  console.log(`${'='.repeat(60)}`);

  const handler = toolHandlers[name];
  if (!handler) {
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({
        success: false,
        error: `Unknown tool: ${name}`
      })
    };
  }

  try {
    let parsedArgs;
    if (typeof args === 'string') {
      parsedArgs = JSON.parse(args);
    } else {
      parsedArgs = args;
    }

    const result = await handler(parsedArgs);
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify(result)
    };
  } catch (error) {
    console.error(`❌ Error executing tool ${name}:`, error.message);
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

/**
 * Main execution function
 */
async function runAgent() {
  try {
    // Get domain from CLI arguments
    const domain = process.argv[2];
    if (!domain) {
      console.error('❌ Usage: node openai/run-agent.js <domain>');
      console.error('   Example: node openai/run-agent.js travel.ai');
      process.exit(1);
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not set in environment variables');
      process.exit(1);
    }

    // Load agent ID
    const agentId = await loadAgentId();
    console.log(`🤖 Agent ID: ${agentId}`);
    console.log(`🌐 Domain: ${domain}`);
    console.log('');

    // Initialize authentication
    await initializeAuth();

    // Create thread
    console.log('📝 Creating conversation thread...');
    const thread = await client.beta.threads.create();
    console.log(`✅ Thread created: ${thread.id}\n`);

    // Add user message
    const userMessage = `Generate and publish 3-5 new SEO pages for ${domain}. 

Important guidelines:
- Work efficiently: Generate and publish pages one at a time
- Each page should be 1500-2000 words with proper HTML structure
- Include H2/H3 headings, paragraphs, and lists
- Add meta title, description, and keywords for SEO
- Use createPage tool for each new page
- If a page already exists, skip it and continue with the next topic`;
    console.log(`💬 User message: ${userMessage}\n`);

    await client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userMessage
    });

    // Create and poll run (using Assistants API)
    console.log('🚀 Starting agent run...');
    console.log('   (This may take several minutes depending on content generation)\n');

    // Create run
    let run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: agentId,
      instructions: `You are working on domain: ${domain}. Focus on creating high-quality SEO content for this specific tenant.`
    });

    // Main execution loop - handles polling and tool calls
    let maxToolRounds = 20; // Increased for more complex workflows
    let toolRound = 0;
    let totalAttempts = 0;
    const maxAttempts = 1800; // Max 30 minutes (content generation can take time)

    while (toolRound < maxToolRounds && totalAttempts < maxAttempts) {
      totalAttempts++;

      // Poll for status updates
      while (run.status === 'queued' || run.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        run = await client.beta.threads.runs.retrieve(thread.id, run.id);
        totalAttempts++;

        if (totalAttempts % 10 === 0) {
          console.log(`   ⏳ Status: ${run.status} (${totalAttempts * 2}s)`);
        }
        
        // Check for failed status while polling
        if (run.status === 'failed') {
          console.log(`\n⚠️  Run failed during processing`);
          break;
        }

        if (totalAttempts >= maxAttempts) {
          console.error('❌ Timeout: Run took too long (exceeded 30 minutes)');
          console.error('   The agent may be generating large amounts of content.');
          console.error('   Consider checking the OpenAI dashboard for more details.');
          break;
        }
      }

      // Process the run status
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Run Status: ${run.status}`);
      if (toolRound > 0) console.log(`   Tool Round: ${toolRound}`);
      console.log(`${'='.repeat(60)}\n`);

      // Handle requires_action (tool calls)
      if (run.status === 'requires_action') {
        toolRound++;
        console.log(`⚠️  Run requires action (tool calls) - Round ${toolRound}\n`);

        if (run.required_action && run.required_action.submit_tool_outputs) {
          const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
          console.log(`🔧 Processing ${toolCalls.length} tool call(s)...\n`);

          const toolOutputs = [];
          for (const toolCall of toolCalls) {
            const output = await handleToolCall(toolCall);
            toolOutputs.push(output);
          }

          // Submit tool outputs
          console.log('\n📤 Submitting tool outputs...');
          try {
            run = await client.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
              tool_outputs: toolOutputs
            });
            console.log(`✅ Tool outputs submitted. New status: ${run.status}`);
          } catch (error) {
            console.error(`❌ Error submitting tool outputs:`, error.message);
            throw error;
          }

          // Reset polling attempts after tool submission
          // Wait a moment before starting to poll again
          await new Promise(resolve => setTimeout(resolve, 1000));
          run = await client.beta.threads.runs.retrieve(thread.id, run.id);
          console.log(`🔄 Continuing run... Status: ${run.status}\n`);
          
          // Continue loop to poll again
          continue;
        }
      }

      // Break if completed or failed
      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        break;
      }

      // If status is still requires_action but we couldn't handle it, break
      if (run.status === 'requires_action' && toolRound >= maxToolRounds) {
        console.error('❌ Maximum tool rounds reached');
        break;
      }
    }

    // Final status check
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Final Run Status: ${run.status}`);
    console.log(`${'='.repeat(60)}\n`);

    if (run.status === 'completed') {
      console.log('✅ Agent run completed successfully!\n');

      // Get final messages
      const messages = await client.beta.threads.messages.list(thread.id, {
        order: 'desc',
        limit: 10
      });

      console.log('📋 Agent Messages:');
      console.log(`${'='.repeat(60)}`);
      
      for (const message of messages.data) {
        if (message.role === 'assistant') {
          console.log(`\n🤖 Assistant:`);
          
          // Print text content
          if (message.content && message.content.length > 0) {
            message.content.forEach(block => {
              if (block.type === 'text') {
                console.log(`   ${block.text.value}`);
              }
            });
          }

          // Print tool calls
          if (message.tool_calls && message.tool_calls.length > 0) {
            console.log(`\n   Tools used: ${message.tool_calls.length}`);
            message.tool_calls.forEach(toolCall => {
              console.log(`   - ${toolCall.function.name}`);
            });
          }
        }
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log('✅ Execution complete!');
      console.log(`🌐 Check your microsite at: http://${domain}`);
      console.log('');
    } else {
      console.log(`⚠️  Run ended with status: ${run.status}`);
      
      // Detailed error information
      if (run.last_error) {
        console.error(`\n❌ Error Details:`);
        console.error(`   Type: ${run.last_error.type || 'Unknown'}`);
        console.error(`   Message: ${run.last_error.message || 'No message'}`);
        console.error(`   Code: ${run.last_error.code || 'No code'}`);
        
        console.error(`\n   Full Error Object:`);
        console.error(JSON.stringify(run.last_error, null, 2));
      }
      
      // Check for additional error information in run object
      if (run.status_details) {
        console.error(`\n   Status Details:`, JSON.stringify(run.status_details, null, 2));
      }
      
      // Show run steps/thread info for debugging
      if (run.status === 'failed') {
        console.log(`\n🔍 Debugging Information:`);
        console.log(`   Run ID: ${run.id}`);
        console.log(`   Thread ID: ${thread.id}`);
        console.log(`   Tool Rounds Completed: ${toolRound}`);
        console.log(`   Total Attempts: ${totalAttempts}`);
        
        // Try to get recent messages to see what happened
        try {
          const recentMessages = await client.beta.threads.messages.list(thread.id, {
            order: 'desc',
            limit: 5
          });
          
          console.log(`\n   Recent Messages:`);
          for (const msg of recentMessages.data) {
            console.log(`   - ${msg.role}: ${msg.content?.[0]?.text?.value?.substring(0, 100) || 'No content'}`);
          }
        } catch (err) {
          console.log(`   Could not fetch recent messages: ${err.message}`);
        }
      }
      
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error running agent:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute
runAgent()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

