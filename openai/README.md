# OpenAI Agent for Microsite Builder

This directory contains the OpenAI-hosted agent that can autonomously generate SEO content and manage pages for microsites.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env` file:
   ```env
   # OpenAI API Key
   OPENAI_API_KEY=your_openai_api_key_here

   # Backend API Configuration
   BACKEND_URL=http://localhost:5000/api
   
   # Admin Credentials (for authentication)
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=your_admin_password_here
   ```

3. Register the agent:
   ```bash
   node register-agent.js
   ```
   
   **Note:** If you update `agent-definition.js`, you must re-register the agent:
   ```bash
   # Delete the old agent ID first
   rm agent-id.txt
   # Then re-register
   node register-agent.js
   ```

4. Run the agent:
   ```bash
   node run-agent.js travel.ai
   ```

## How It Works

1. **Authentication**: The agent automatically logs in to the backend API using credentials from `.env` file
2. **Token Management**: Authentication token is cached and automatically refreshed if expired
3. **Tool Usage**: The agent uses three tools:
   - `getTenantInfo` - Fetch tenant information by domain
   - `createPage` - Create new pages with SEO content
   - `updatePage` - Update existing pages

## Files

- `agent-definition.js` - Agent configuration and tool schemas
- `tool-handlers.js` - Backend API integration and authentication
- `register-agent.js` - Script to register the agent with OpenAI
- `run-agent.js` - Script to execute the agent
- `agent-id.txt` - Generated file containing the agent ID (created after registration)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `BACKEND_URL` | Backend API base URL | No (defaults to http://localhost:5000/api) |
| `ADMIN_EMAIL` | Admin user email for authentication | Yes |
| `ADMIN_PASSWORD` | Admin user password for authentication | Yes |

## Notes

- The agent automatically handles authentication - you don't need to manage tokens manually
- All backend requests are authenticated using the login token
- Token is automatically refreshed if it expires during execution

