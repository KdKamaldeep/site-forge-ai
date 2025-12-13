/**
 * Register OpenAI Agent
 * Creates and registers the Microsite Builder Agent with OpenAI
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Import agent definition
const { agentDefinition } = await import('./agent-definition.js');

const AGENT_ID_FILE = join(__dirname, 'agent-id.txt');

async function registerAgent() {
  try {
    console.log('🚀 Registering OpenAI Agent...');
    console.log(`   Name: ${agentDefinition.name}`);
    console.log(`   Model: ${agentDefinition.model}`);
    console.log(`   Tools: ${agentDefinition.tools.length}`);
    console.log('');

    // Check if agent already exists
    try {
      const existingId = await readFile(AGENT_ID_FILE, 'utf-8').then(id => id.trim());
      if (existingId) {
        console.log(`⚠️  Agent ID file exists: ${existingId}`);
        console.log('   Delete agent-id.txt to register a new agent, or use the existing ID.');
        console.log('');
        
        // Verify the agent still exists
        try {
          const existingAgent = await client.beta.assistants.retrieve(existingId);
          console.log(`✅ Existing agent found: ${existingAgent.name}`);
          console.log(`   Agent ID: ${existingId}`);
          console.log('   Using existing agent. Delete agent-id.txt and run again to create a new one.');
          return existingId;
        } catch (error) {
          console.log(`⚠️  Existing agent ID not found. Creating new agent...`);
          // Continue to create new agent
        }
      }
    } catch (error) {
      // File doesn't exist, continue to create agent
      console.log('   No existing agent ID found. Creating new agent...');
    }

    // Create the agent (using Assistants API)
    console.log('📝 Creating agent...');
    const agent = await client.beta.assistants.create({
      name: agentDefinition.name,
      model: agentDefinition.model === 'gpt-4.1' ? 'gpt-4o' : agentDefinition.model, // Use gpt-4o if gpt-4.1 is specified
      instructions: agentDefinition.instructions,
      tools: agentDefinition.tools,
      temperature: 0.7,
      top_p: 1.0
    });

    // Save agent ID
    await writeFile(AGENT_ID_FILE, agent.id, 'utf-8');

    console.log('');
    console.log('✅ Agent registered successfully!');
    console.log(`   Agent ID: ${agent.id}`);
    console.log(`   Saved to: ${AGENT_ID_FILE}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('   Run: node openai/run-agent.js <domain>');
    console.log('   Example: node openai/run-agent.js travel.ai');
    console.log('');

    return agent.id;
  } catch (error) {
    console.error('❌ Error registering agent:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run registration
registerAgent()
  .then((agentId) => {
    console.log(`✅ Registration complete. Agent ID: ${agentId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Registration failed:', error);
    process.exit(1);
  });

