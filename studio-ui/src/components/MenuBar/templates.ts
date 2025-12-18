import type { AgentSchema } from '../../types/project';

export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  agents: Record<string, AgentSchema>;
}

export const TEMPLATES: Template[] = [
  {
    id: 'simple_chat',
    name: 'Simple Chat Agent',
    icon: '💬',
    description: 'A basic conversational agent',
    agents: {
      'chat_agent': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'You are a helpful, friendly assistant. Answer questions clearly and concisely.',
        tools: [],
        sub_agents: [],
        position: { x: 50, y: 150 },
      }
    }
  },
  {
    id: 'research_pipeline',
    name: 'Research Pipeline',
    icon: '🔍',
    description: 'Sequential: Researcher → Summarizer',
    agents: {
      'researcher': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'Research the given topic thoroughly. Gather key facts, data, and insights.',
        tools: ['google_search'],
        sub_agents: [],
        position: { x: 0, y: 0 },
      },
      'summarizer': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'Summarize the research findings into a clear, concise report with key takeaways.',
        tools: [],
        sub_agents: [],
        position: { x: 0, y: 0 },
      },
      'research_pipeline': {
        type: 'sequential',
        instruction: '',
        tools: [],
        sub_agents: ['researcher', 'summarizer'],
        position: { x: 50, y: 150 },
      }
    }
  },
  {
    id: 'content_refiner',
    name: 'Content Refiner',
    icon: '✨',
    description: 'Loop agent that iteratively improves content',
    agents: {
      'improver': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'Improve the content: fix errors, enhance clarity, improve flow.',
        tools: [],
        sub_agents: [],
        position: { x: 0, y: 0 },
      },
      'reviewer': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'Review the content. If it meets quality standards, call exit_loop. Otherwise, suggest improvements.',
        tools: ['exit_loop'],
        sub_agents: [],
        position: { x: 0, y: 0 },
      },
      'content_refiner': {
        type: 'loop',
        instruction: '',
        tools: [],
        sub_agents: ['improver', 'reviewer'],
        position: { x: 50, y: 150 },
        max_iterations: 3,
      }
    }
  },
  {
    id: 'parallel_analyzer',
    name: 'Parallel Analyzer',
    icon: '⚡',
    description: 'Run multiple analyses concurrently',
    agents: {
      'sentiment_analyzer': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'Analyze the sentiment of the text. Identify emotional tone, positive/negative aspects.',
        tools: [],
        sub_agents: [],
        position: { x: 0, y: 0 },
      },
      'entity_extractor': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'Extract key entities: people, organizations, locations, dates, and other important items.',
        tools: [],
        sub_agents: [],
        position: { x: 0, y: 0 },
      },
      'parallel_analyzer': {
        type: 'parallel',
        instruction: '',
        tools: [],
        sub_agents: ['sentiment_analyzer', 'entity_extractor'],
        position: { x: 50, y: 150 },
      }
    }
  },
  {
    id: 'support_router',
    name: 'Support Router',
    icon: '🔀',
    description: 'Route requests to specialized agents',
    agents: {
      'router': {
        type: 'router',
        model: 'gemini-2.0-flash',
        instruction: 'Classify the user request into: technical (coding, bugs, errors), billing (payments, subscriptions), or general (other questions).',
        tools: [],
        sub_agents: [],
        position: { x: 50, y: 100 },
        routes: [
          { condition: 'technical', target: 'tech_support' },
          { condition: 'billing', target: 'billing_support' },
          { condition: 'general', target: 'general_support' },
        ],
      },
      'tech_support': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'You are a technical support specialist. Help with coding issues, bugs, and technical problems.',
        tools: [],
        sub_agents: [],
        position: { x: 50, y: 300 },
      },
      'billing_support': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'You are a billing specialist. Help with payment issues, subscriptions, and account questions.',
        tools: [],
        sub_agents: [],
        position: { x: 250, y: 300 },
      },
      'general_support': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'You are a general support agent. Help with general questions and inquiries.',
        tools: [],
        sub_agents: [],
        position: { x: 450, y: 300 },
      }
    }
  },
  {
    id: 'web_browser',
    name: 'Web Browser Agent',
    icon: '🌐',
    description: 'Agent with web browsing capabilities',
    agents: {
      'browser_agent': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'You can browse the web to find information. Navigate to websites, read content, and extract relevant data to answer questions.',
        tools: ['browser'],
        sub_agents: [],
        position: { x: 50, y: 150 },
      }
    }
  },
  {
    id: 'mcp_agent',
    name: 'MCP Integration',
    icon: '🔌',
    description: 'Agent with MCP server tools',
    agents: {
      'mcp_agent': {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'You have access to external tools via MCP. Use them to accomplish tasks.',
        tools: ['mcp'],
        sub_agents: [],
        position: { x: 50, y: 150 },
      }
    }
  },
];
