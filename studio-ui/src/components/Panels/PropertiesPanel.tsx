import type { AgentSchema, ToolConfig } from '../../types/project';
import { TOOL_TYPES } from './ToolPalette';

interface Props {
  nodeId: string;
  agent: AgentSchema;
  agents: Record<string, AgentSchema>;
  toolConfigs: Record<string, ToolConfig>;
  onUpdate: (id: string, updates: Partial<AgentSchema>) => void;
  onAddSubAgent: () => void;
  onClose: () => void;
  onSelectTool: (toolId: string) => void;
  onRemoveTool: (toolType: string) => void;
}

export function PropertiesPanel({ nodeId, agent, agents, toolConfigs, onUpdate, onAddSubAgent, onClose, onSelectTool, onRemoveTool }: Props) {
  const isContainer = agent.type === 'sequential' || agent.type === 'loop' || agent.type === 'parallel';

  return (
    <div className="w-72 bg-studio-panel border-l border-gray-700 p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">{nodeId}</h3>
        <button onClick={onClose} className="px-2 py-1 bg-gray-600 rounded text-xs">Close</button>
      </div>

      {isContainer ? (
        <ContainerProperties nodeId={nodeId} agent={agent} agents={agents} onUpdate={onUpdate} onAddSubAgent={onAddSubAgent} />
      ) : agent.type === 'router' ? (
        <RouterProperties nodeId={nodeId} agent={agent} onUpdate={onUpdate} />
      ) : (
        <LlmProperties nodeId={nodeId} agent={agent} toolConfigs={toolConfigs} onUpdate={onUpdate} onSelectTool={onSelectTool} onRemoveTool={onRemoveTool} />
      )}
    </div>
  );
}

function ContainerProperties({ nodeId, agent, agents, onUpdate, onAddSubAgent }: { nodeId: string; agent: AgentSchema; agents: Record<string, AgentSchema>; onUpdate: Props['onUpdate']; onAddSubAgent: () => void }) {
  return (
    <div>
      {agent.type === 'loop' && (
        <>
          <div className="mb-4 p-2 bg-purple-900/50 border border-purple-600 rounded text-xs">
            <div className="font-semibold text-purple-400 mb-1">💡 Loop Agent Tips</div>
            <p className="text-purple-200">Sub-agents run repeatedly until max iterations or exit_loop tool is called.</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Max Iterations</label>
            <input
              type="number"
              min="1"
              className="w-full px-2 py-1 bg-studio-bg border border-gray-600 rounded text-sm"
              value={agent.max_iterations || 3}
              onChange={(e) => onUpdate(nodeId, { max_iterations: parseInt(e.target.value) || 3 })}
            />
          </div>
        </>
      )}
      <label className="block text-sm text-gray-400 mb-2">
        Sub-Agents {agent.type === 'parallel' ? '(run concurrently)' : '(in order)'}
      </label>
      {(agent.sub_agents || []).map((subId, idx) => {
        const subAgent = agents[subId];
        if (!subAgent) return null;
        return (
          <div key={subId} className="mb-4 p-2 bg-gray-800 rounded">
            <div className="text-sm font-medium mb-2">{agent.type === 'parallel' ? '∥' : `${idx + 1}.`} {subId}</div>
            <label className="block text-xs text-gray-400 mb-1">Model</label>
            <input
              className="w-full px-2 py-1 bg-studio-bg border border-gray-600 rounded text-xs mb-2"
              value={subAgent.model || ''}
              onChange={(e) => onUpdate(subId, { model: e.target.value })}
            />
            <label className="block text-xs text-gray-400 mb-1">Instruction</label>
            <textarea
              className="w-full px-2 py-1 bg-studio-bg border border-gray-600 rounded text-xs h-20"
              value={subAgent.instruction}
              onChange={(e) => onUpdate(subId, { instruction: e.target.value })}
            />
          </div>
        );
      })}
      <button onClick={onAddSubAgent} className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">+ Add Sub-Agent</button>
    </div>
  );
}

function RouterProperties({ nodeId, agent, onUpdate }: { nodeId: string; agent: AgentSchema; onUpdate: Props['onUpdate'] }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">Model</label>
      <input
        className="w-full px-2 py-1 bg-studio-bg border border-gray-600 rounded text-sm mb-3"
        value={agent.model || ''}
        onChange={(e) => onUpdate(nodeId, { model: e.target.value })}
      />
      <label className="block text-sm text-gray-400 mb-1">Routing Instruction</label>
      <textarea
        className="w-full px-2 py-1 bg-studio-bg border border-gray-600 rounded text-sm h-20 mb-3"
        value={agent.instruction}
        onChange={(e) => onUpdate(nodeId, { instruction: e.target.value })}
      />
      <label className="block text-sm text-gray-400 mb-2">Routes</label>
      {(agent.routes || []).map((route, idx) => (
        <div key={idx} className="flex gap-1 mb-2 items-center">
          <input
            className="flex-1 px-2 py-1 bg-studio-bg border border-gray-600 rounded text-xs"
            placeholder="condition"
            value={route.condition}
            onChange={(e) => {
              const routes = [...(agent.routes || [])];
              routes[idx] = { ...route, condition: e.target.value };
              onUpdate(nodeId, { routes });
            }}
          />
          <span className="text-gray-500">→</span>
          <input
            className="flex-1 px-2 py-1 bg-studio-bg border border-gray-600 rounded text-xs"
            placeholder="target"
            value={route.target}
            onChange={(e) => {
              const routes = [...(agent.routes || [])];
              routes[idx] = { ...route, target: e.target.value };
              onUpdate(nodeId, { routes });
            }}
          />
          <button className="text-red-400 hover:text-red-300 text-sm" onClick={() => onUpdate(nodeId, { routes: (agent.routes || []).filter((_, i) => i !== idx) })}>×</button>
        </div>
      ))}
      <button className="w-full py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs" onClick={() => onUpdate(nodeId, { routes: [...(agent.routes || []), { condition: '', target: '' }] })}>+ Add Route</button>
    </div>
  );
}

function LlmProperties({ nodeId, agent, toolConfigs, onUpdate, onSelectTool, onRemoveTool }: { nodeId: string; agent: AgentSchema; toolConfigs: Record<string, ToolConfig>; onUpdate: Props['onUpdate']; onSelectTool: (id: string) => void; onRemoveTool: (type: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">Model</label>
      <input
        className="w-full px-2 py-1 bg-studio-bg border border-gray-600 rounded text-sm mb-3"
        value={agent.model || ''}
        onChange={(e) => onUpdate(nodeId, { model: e.target.value })}
      />
      <label className="block text-sm text-gray-400 mb-1">Instruction</label>
      <textarea
        className="w-full px-2 py-1 bg-studio-bg border border-gray-600 rounded text-sm h-24"
        value={agent.instruction}
        onChange={(e) => onUpdate(nodeId, { instruction: e.target.value })}
      />
      {agent.tools.length > 0 && (
        <div className="mt-3">
          <label className="block text-sm text-gray-400 mb-1">Tools</label>
          <div className="flex flex-wrap gap-1">
            {agent.tools.map(t => {
              const baseType = t.startsWith('function') ? 'function' : t.startsWith('mcp') ? 'mcp' : t;
              const tool = TOOL_TYPES.find(tt => tt.type === baseType);
              const toolId = `${nodeId}_${t}`;
              const config = toolConfigs[toolId];
              const displayName = config && 'name' in config && config.name ? config.name : tool?.label || t;
              return (
                <span key={t} className={`text-xs px-2 py-1 rounded flex items-center gap-1 cursor-pointer ${config ? 'bg-green-800' : 'bg-gray-700'} hover:bg-gray-600`} onClick={() => onSelectTool(toolId)}>
                  {tool?.icon} {displayName} <span className="text-blue-400">⚙</span>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveTool(t); }} className="ml-1 text-red-400 hover:text-red-300">×</button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
