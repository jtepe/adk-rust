import type { FunctionToolConfig } from '../types/project';

export const FUNCTION_TEMPLATES = [
  { name: 'HTTP Request', icon: '🌐', template: { name: 'http_request', description: 'Make HTTP requests', parameters: [{ name: 'url', param_type: 'string' as const, description: 'URL', required: true }, { name: 'method', param_type: 'string' as const, description: 'GET/POST', required: false }], code: 'Ok(json!({"status": "ok"}))' }},
  { name: 'Read File', icon: '📄', template: { name: 'read_file', description: 'Read file', parameters: [{ name: 'path', param_type: 'string' as const, description: 'Path', required: true }], code: 'Ok(json!({"content": ""}))' }},
  { name: 'Write File', icon: '💾', template: { name: 'write_file', description: 'Write file', parameters: [{ name: 'path', param_type: 'string' as const, description: 'Path', required: true }, { name: 'content', param_type: 'string' as const, description: 'Content', required: true }], code: 'Ok(json!({"status": "written"}))' }},
  { name: 'Calculator', icon: '🧮', template: { name: 'calculate', description: 'Math operations', parameters: [{ name: 'a', param_type: 'number' as const, description: 'First', required: true }, { name: 'b', param_type: 'number' as const, description: 'Second', required: true }], code: 'Ok(json!({"result": a + b}))' }},
];

export const MCP_TEMPLATES = [
  { name: 'Time', icon: '🕐', command: 'uvx', args: ['mcp-server-time'], desc: 'Get current time' },
  { name: 'Fetch', icon: '🌐', command: 'uvx', args: ['mcp-server-fetch'], desc: 'Fetch URLs' },
  { name: 'Filesystem', icon: '📁', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'], desc: 'Read/write files' },
  { name: 'GitHub', icon: '🐙', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], desc: 'GitHub API' },
  { name: 'SQLite', icon: '💾', command: 'uvx', args: ['mcp-server-sqlite', '--db-path', '/tmp/data.db'], desc: 'Query SQLite' },
  { name: 'Memory', icon: '🧠', command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'], desc: 'Key-value memory' },
];

export function generateFunctionTemplate(config: FunctionToolConfig): string {
  const fnName = config.name || 'my_function';
  const params = config.parameters.map(p => {
    const extractor = p.param_type === 'number' ? 'as_f64().unwrap_or(0.0)' : p.param_type === 'boolean' ? 'as_bool().unwrap_or(false)' : 'as_str().unwrap_or("")';
    return `    let ${p.name} = args["${p.name}"].${extractor};`;
  }).join('\n');
  const code = config.code || 'Ok(json!({"status": "ok"}))';
  return `async fn ${fnName}_fn(_ctx: Arc<dyn ToolContext>, args: Value) -> Result<Value, AdkError> {\n${params}\n    ${code}\n}`;
}

export function extractUserCode(fullCode: string, config: FunctionToolConfig): string {
  const lines = fullCode.split('\n');
  const startIdx = config.parameters.length + 1;
  const endIdx = lines.length - 1;
  if (startIdx >= endIdx) return config.code || '';
  return lines.slice(startIdx, endIdx).map(l => l.replace(/^    /, '')).join('\n');
}
