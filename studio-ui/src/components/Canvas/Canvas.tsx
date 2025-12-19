import { useCallback, useEffect, useState, useRef, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Editor from '@monaco-editor/react';
import { useStore } from '../../store';
import { TestConsole } from '../Console/TestConsole';
import { MenuBar } from '../MenuBar';
import { nodeTypes } from '../Nodes';
import { AgentPalette, ToolPalette, PropertiesPanel, ToolConfigPanel, TOOL_TYPES } from '../Panels';
import { api, GeneratedProject } from '../../api/client';
import { generateFunctionTemplate, extractUserCode } from '../../utils/functionTemplates';
import type { FunctionToolConfig, AgentSchema, ToolConfig } from '../../types/project';

type FlowPhase = 'idle' | 'input' | 'output';

export function Canvas() {
  const { currentProject, openProject, closeProject, saveProject, selectNode, selectedNodeId, updateAgent: storeUpdateAgent, addAgent, removeAgent, addEdge: addProjectEdge, removeEdge: removeProjectEdge, addToolToAgent, removeToolFromAgent, addSubAgentToContainer, selectedToolId, selectTool, updateToolConfig: storeUpdateToolConfig } = useStore();
  const [showConsole, setShowConsole] = useState(true);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('idle');
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [iteration, setIteration] = useState(0);
  const [selectedSubAgent, setSelectedSubAgent] = useState<{parent: string, sub: string} | null>(null);
  const [compiledCode, setCompiledCode] = useState<GeneratedProject | null>(null);
  const [buildOutput, setBuildOutput] = useState<{success: boolean, output: string, path: string | null} | null>(null);
  const [building, setBuilding] = useState(false);
  const [builtBinaryPath, setBuiltBinaryPath] = useState<string | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveProject(), 500);
  }, [saveProject]);

  // Wrap update functions to invalidate build and auto-save
  const updateAgent = useCallback((id: string, updates: Partial<AgentSchema>) => {
    storeUpdateAgent(id, updates);
    setBuiltBinaryPath(null);
    debouncedSave();
  }, [storeUpdateAgent, debouncedSave]);

  const updateToolConfig = useCallback((toolId: string, config: ToolConfig) => {
    storeUpdateToolConfig(toolId, config);
    setBuiltBinaryPath(null);
    debouncedSave();
  }, [storeUpdateToolConfig, debouncedSave]);
  const handleCompile = useCallback(async () => {
    if (!currentProject) return;
    try {
      const result = await api.projects.compile(currentProject.id);
      setCompiledCode(result);
    } catch (e) {
      alert('Compile failed: ' + (e as Error).message);
    }
  }, [currentProject]);

  const handleBuild = useCallback(async () => {
    if (!currentProject) return;
    setBuilding(true);
    setBuildOutput({ success: false, output: '', path: null });
    
    const eventSource = new EventSource(`/api/projects/${currentProject.id}/build-stream`);
    let output = '';
    
    eventSource.addEventListener('status', (e) => {
      output += e.data + '\n';
      setBuildOutput({ success: false, output, path: null });
    });
    
    eventSource.addEventListener('output', (e) => {
      output += e.data + '\n';
      setBuildOutput({ success: false, output, path: null });
    });
    
    eventSource.addEventListener('done', (e) => {
      setBuildOutput({ success: true, output, path: e.data });
      setBuiltBinaryPath(e.data);
      setBuilding(false);
      eventSource.close();
    });
    
    eventSource.addEventListener('error', (e) => {
      const data = (e as MessageEvent).data || 'Build failed';
      output += '\nError: ' + data;
      setBuildOutput({ success: false, output, path: null });
      setBuilding(false);
      eventSource.close();
    });
    
    eventSource.onerror = () => {
      setBuilding(false);
      eventSource.close();
    };
  }, [currentProject]);

  const removeSubAgent = useCallback((parentId: string, subId: string) => {
    if (!currentProject) return;
    const parent = currentProject.agents[parentId];
    if (!parent || parent.sub_agents.length <= 1) return;
    updateAgent(parentId, { sub_agents: parent.sub_agents.filter(s => s !== subId) });
    removeAgent(subId);
    setSelectedSubAgent(null);
  }, [currentProject, updateAgent, removeAgent]);

  useEffect(() => {
    if (!currentProject) return;
    
    const agentIds = Object.keys(currentProject.agents);
    // Filter out sub-agents (those that belong to a sequential)
    const allSubAgents = new Set(
      agentIds.flatMap(id => currentProject.agents[id].sub_agents || [])
    );
    const topLevelAgents = agentIds.filter(id => !allSubAgents.has(id));
    
    // Sort agents by workflow order (follow edges from START)
    const sortedAgents: string[] = [];
    const edges = currentProject.workflow.edges;
    let current = 'START';
    while (sortedAgents.length < topLevelAgents.length) {
      const nextEdge = edges.find(e => e.from === current && e.to !== 'END');
      if (!nextEdge) break;
      if (topLevelAgents.includes(nextEdge.to)) {
        sortedAgents.push(nextEdge.to);
      }
      current = nextEdge.to;
    }
    // Add any remaining agents not in the chain
    topLevelAgents.forEach(id => {
      if (!sortedAgents.includes(id)) sortedAgents.push(id);
    });
    
    const newNodes: Node[] = [
      { id: 'START', position: { x: 50, y: 50 }, data: { label: '▶ START' }, type: 'input', style: { background: '#1a472a', border: '2px solid #4ade80', borderRadius: 8, padding: 10, color: '#fff' } },
      { id: 'END', position: { x: 50, y: 150 + sortedAgents.length * 150 }, data: { label: '⏹ END' }, type: 'output', style: { background: '#4a1a1a', border: '2px solid #f87171', borderRadius: 8, padding: 10, color: '#fff' } },
    ];
    
    sortedAgents.forEach((id, i) => {
      const agent = currentProject.agents[id];
      if (agent.type === 'sequential' || agent.type === 'loop' || agent.type === 'parallel') {
        const isParallel = agent.type === 'parallel';
        const isLoop = agent.type === 'loop';
        const subAgentNodes = (agent.sub_agents || []).map((subId, idx) => {
          const subAgent = currentProject.agents[subId];
          const isSelected = selectedSubAgent?.parent === id && selectedSubAgent?.sub === subId;
          const isActive = activeAgent === subId;
          const subTools = subAgent?.tools || [];
          return (
            <div 
              key={subId} 
              className={`rounded p-2 cursor-pointer transition-all duration-300 ${isParallel ? '' : idx > 0 ? 'mt-2 border-t border-gray-600 pt-2' : ''} ${isActive ? 'bg-green-900 ring-2 ring-green-400 shadow-lg shadow-green-500/50' : isSelected ? 'bg-gray-600 ring-2 ring-blue-400' : 'bg-gray-800 hover:bg-gray-700'}`}
              onClick={(e) => { e.stopPropagation(); setSelectedSubAgent(isSelected ? null : {parent: id, sub: subId}); selectNode(isSelected ? null : subId); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const dragData = e.dataTransfer.getData('text/plain');
                const toolType = dragData.startsWith('tool:') ? dragData.slice(5) : '';
                if (toolType && subAgent) {
                  addToolToAgent(subId, toolType);
                  setSelectedSubAgent({parent: id, sub: subId});
                  selectNode(subId);
                }
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">{isActive ? '⚡' : (isParallel ? '∥' : `${idx + 1}.`)} 🤖 {subId}</span>
                {isSelected && agent.sub_agents.length > 1 && (
                  <button 
                    className="text-red-400 hover:text-red-300 text-xs"
                    onClick={(e) => { e.stopPropagation(); removeSubAgent(id, subId); }}
                  >×</button>
                )}
              </div>
              <div className="text-xs text-gray-400">{isActive ? 'Running...' : 'LLM Agent'}</div>
              {subTools.length > 0 && (
                <div className="border-t border-gray-600 pt-1 mt-1">
                  {subTools.map(t => {
                    const baseType = t.startsWith('function') ? 'function' : t.startsWith('mcp') ? 'mcp' : t;
                    const tool = TOOL_TYPES.find(tt => tt.type === baseType);
                    const isConfigurable = tool?.configurable;
                    const toolConfigId = `${subId}_${t}`;
                    const toolConfig = currentProject?.tool_configs?.[toolConfigId];
                    let displayName = tool?.label || t;
                    if (baseType === 'function' && toolConfig && 'name' in toolConfig && toolConfig.name) {
                      displayName = toolConfig.name;
                    } else if (baseType === 'mcp') {
                      if (toolConfig && 'name' in toolConfig && toolConfig.name) {
                        displayName = toolConfig.name;
                      } else {
                        const num = t.match(/mcp_(\d+)/)?.[1] || '1';
                        displayName = `MCP Tool ${num}`;
                      }
                    }
                    return (
                      <div 
                        key={t} 
                        className={`text-xs text-gray-300 px-1 py-0.5 rounded ${isConfigurable ? 'cursor-pointer hover:bg-gray-700 hover:text-white' : ''}`}
                        onClick={(e) => {
                          if (isConfigurable) {
                            e.stopPropagation();
                            setSelectedSubAgent({parent: id, sub: subId});
                            selectNode(subId);
                            selectTool(toolConfigId);
                          }
                        }}
                      >
                        {tool?.icon} {displayName} {isConfigurable && <span className="text-blue-400">⚙</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        });
        const isLoopActive = agent.type === 'loop' && activeAgent && agent.sub_agents?.includes(activeAgent);
        const config = {
          sequential: { icon: '⛓', label: 'Sequential Agent', bg: '#1e3a5f', border: '#60a5fa' },
          loop: { icon: '🔄', label: isLoopActive ? `Loop Agent (iter ${iteration + 1}/${agent.max_iterations || 3})` : `Loop Agent (${agent.max_iterations || 3}x)`, bg: '#3d1e5f', border: '#a855f7' },
          parallel: { icon: '⚡', label: 'Parallel Agent', bg: '#1e5f3d', border: '#34d399' },
        }[agent.type]!;
        newNodes.push({
          id,
          position: { x: 50, y: 150 + i * 150 },
          data: { 
            label: (
              <div className="text-center min-w-[180px]">
                <div className="font-semibold">{config.icon} {id}</div>
                <div className="text-xs text-gray-400 mb-1">{config.label}</div>
                <div className={`border-t border-gray-600 pt-2 mt-1 ${isLoop ? 'relative' : ''}`}>
                  {isLoop && (
                    <div className="absolute -left-2 top-0 bottom-0 w-1 border-l-2 border-t-2 border-b-2 border-purple-400 rounded-l" />
                  )}
                  {isParallel ? (
                    <div className="flex gap-2 flex-wrap justify-center">{subAgentNodes}</div>
                  ) : (
                    <div className={isLoop ? 'ml-1' : ''}>{subAgentNodes}</div>
                  )}
                  {isLoop && (
                    <div className="absolute -right-2 top-1/2 text-purple-400 text-xs">↩</div>
                  )}
                </div>
              </div>
            )
          },
          style: { background: config.bg, border: `2px solid ${config.border}`, borderRadius: 8, padding: 12, color: '#fff', minWidth: isParallel ? 280 : 200 },
        });
      } else if (agent.type === 'router') {
        // Router Agent - use new node component
        newNodes.push({
          id,
          type: 'router',
          position: { x: 50, y: 150 + i * 150 },
          data: { 
            label: id,
            routes: agent.routes || [],
            isActive: activeAgent === id,
          },
        });
      } else {
        // LLM Agent - use new node component
        newNodes.push({
          id,
          type: 'llm',
          position: { x: 50, y: 150 + i * 150 },
          data: { 
            label: id,
            model: agent.model,
            tools: agent.tools || [],
            isActive: activeAgent === id,
          },
        });
      }
    });
    setNodes(newNodes);
  }, [currentProject, setNodes, selectedSubAgent, removeSubAgent, activeAgent, iteration, selectNode, selectTool]);

  // Handle Delete key for selected tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedToolId && selectedNodeId) {
        // Don't delete if focus is in an input/textarea
        const active = document.activeElement;
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
        
        // Extract tool type from selectedToolId (e.g., "agent_1_function_1" -> "function_1")
        const parts = selectedToolId.split('_');
        const toolType = parts.slice(-2).join('_'); // e.g., "function_1" or "mcp_1"
        
        removeToolFromAgent(selectedNodeId, toolType);
        selectTool(null);
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedToolId, selectedNodeId, removeToolFromAgent, selectTool]);

  // Update edges based on flow phase and active agent
  useEffect(() => {
    if (!currentProject) return;
    
    const newEdges: Edge[] = currentProject.workflow.edges.map((e, i) => {
      const isStartEdge = e.from === 'START';
      const isEndEdge = e.to === 'END';
      const isActiveEdge = activeAgent && (e.from === activeAgent || e.to === activeAgent);
      const animated = isActiveEdge || (flowPhase === 'input' && isStartEdge) || (flowPhase === 'output' && isEndEdge);
      
      return {
        id: `e${i}`,
        source: e.from,
        target: e.to,
        type: 'smoothstep',
        animated,
        style: { stroke: animated ? '#4ade80' : '#e94560', strokeWidth: animated ? 3 : 2 },
        interactionWidth: 20,
      };
    });
    setEdges(newEdges);
  }, [currentProject, flowPhase, activeAgent, setEdges]);

  const createAgent = useCallback((agentType: string = 'llm') => {
    if (!currentProject) return;
    const agentCount = Object.keys(currentProject.agents).length;
    const prefix = { sequential: 'seq', loop: 'loop', parallel: 'par', router: 'router' }[agentType] || 'agent';
    const id = `${prefix}_${agentCount + 1}`;
    
    if (agentType === 'sequential' || agentType === 'loop' || agentType === 'parallel') {
      // Create container with 2 default sub-agents
      const sub1 = `${id}_agent_1`;
      const sub2 = `${id}_agent_2`;
      const isLoop = agentType === 'loop';
      addAgent(sub1, {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: isLoop ? 'Process and refine the content.' : 'You are agent 1.',
        tools: [],
        sub_agents: [],
        position: { x: 0, y: 0 },
      });
      addAgent(sub2, {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: isLoop ? 'Answer user. Review and improve only if necessary. Call exit_loop when done.' : 'You are agent 2.',
        tools: isLoop ? ['exit_loop'] : [],
        sub_agents: [],
        position: { x: 0, y: 0 },
      });
      addAgent(id, {
        type: agentType as 'sequential' | 'loop' | 'parallel',
        instruction: '',
        tools: [],
        sub_agents: [sub1, sub2],
        position: { x: 50, y: 150 + agentCount * 180 },
        max_iterations: agentType === 'loop' ? 3 : undefined,
      });
    } else if (agentType === 'router') {
      addAgent(id, {
        type: 'router',
        model: 'gemini-2.0-flash',
        instruction: 'Route the request based on intent.',
        tools: [],
        sub_agents: [],
        position: { x: 50, y: 150 + agentCount * 120 },
        routes: [
          { condition: 'default', target: 'END' },
        ],
      });
    } else {
      addAgent(id, {
        type: 'llm',
        model: 'gemini-2.0-flash',
        instruction: 'You are a helpful assistant.',
        tools: [],
        sub_agents: [],
        position: { x: 50, y: 150 + agentCount * 120 },
      });
    }
    
    // Insert new agent into the chain: find what points to END, insert before it
    const edges = currentProject.workflow.edges;
    const edgeToEnd = edges.find(e => e.to === 'END');
    
    if (edgeToEnd) {
      // Remove old edge to END, insert new agent in between
      removeProjectEdge(edgeToEnd.from, 'END');
      addProjectEdge(edgeToEnd.from, id);
      addProjectEdge(id, 'END');
    } else {
      // No edges yet, connect START → agent → END
      addProjectEdge('START', id);
      addProjectEdge(id, 'END');
    }
    
    selectNode(id);
  }, [currentProject, addAgent, addProjectEdge, removeProjectEdge, selectNode]);

  const onDragStart = (e: DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    // Match dropEffect to what's being dragged
    if (e.dataTransfer.types.includes('text/plain')) {
      e.dataTransfer.dropEffect = 'copy';  // tools
    } else {
      e.dataTransfer.dropEffect = 'move';  // agents
    }
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('onDrop fired');
    
    // Check if dropping a tool
    const dragData = e.dataTransfer.getData('text/plain');
    const toolType = dragData.startsWith('tool:') ? dragData.slice(5) : '';
    console.log('onDrop - dragData:', dragData, 'toolType:', toolType, 'selectedNodeId:', selectedNodeId);
    if (toolType) {
      // Find node at drop point using DOM
      const target = e.target as HTMLElement;
      console.log('drop target:', target, 'className:', target.className);
      const nodeElement = target.closest('[data-id]');
      let nodeId = nodeElement?.getAttribute('data-id');
      console.log('nodeElement:', nodeElement, 'nodeId:', nodeId);
      
      // Also try elementsFromPoint as fallback
      if (!nodeId || nodeId === 'START' || nodeId === 'END') {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        console.log('elementsFromPoint:', elements.map(el => ({ tag: el.tagName, class: el.className, dataId: (el as HTMLElement).closest('[data-id]')?.getAttribute('data-id') })));
        for (const el of elements) {
          const node = (el as HTMLElement).closest('[data-id]');
          const id = node?.getAttribute('data-id');
          if (id && id !== 'START' && id !== 'END' && currentProject?.agents[id]) {
            nodeId = id;
            break;
          }
        }
      }
      
      // Fall back to selected node if no drop target found
      if ((!nodeId || !currentProject?.agents[nodeId]) && selectedNodeId && currentProject?.agents[selectedNodeId]) {
        console.log('falling back to selectedNodeId:', selectedNodeId);
        nodeId = selectedNodeId;
      }
      
      console.log('final nodeId:', nodeId, 'exists:', !!currentProject?.agents[nodeId || '']);
      if (nodeId && nodeId !== 'START' && nodeId !== 'END' && currentProject?.agents[nodeId]) {
        addToolToAgent(nodeId, toolType);
        selectNode(nodeId);
        if (TOOL_TYPES.find(t => t.type === toolType)?.configurable) {
          const agentTools = currentProject?.agents[nodeId]?.tools || [];
          let newToolId: string;
          if (toolType === 'function') {
            const count = agentTools.filter(t => t.startsWith('function')).length;
            newToolId = `${nodeId}_function_${count + 1}`;
          } else if (toolType === 'mcp') {
            const count = agentTools.filter(t => t.startsWith('mcp')).length;
            newToolId = `${nodeId}_mcp_${count + 1}`;
          } else {
            newToolId = `${nodeId}_${toolType}`;
          }
          selectTool(newToolId);
        }
      }
      return;
    }
    
    // Otherwise, creating an agent
    const type = e.dataTransfer.getData('application/reactflow');
    console.log('agent drop - type:', type);
    if (!type) return;
    createAgent(type);
  }, [createAgent, nodes, addToolToAgent, selectNode, selectTool, currentProject]);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      addProjectEdge(params.source, params.target);
    }
  }, [addProjectEdge]);

  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    edgesToDelete.forEach((edge) => {
      removeProjectEdge(edge.source, edge.target);
    });
  }, [removeProjectEdge]);

  const onNodesDelete = useCallback((nodesToDelete: Node[]) => {
    nodesToDelete.forEach((node) => {
      if (node.id !== 'START' && node.id !== 'END') {
        removeAgent(node.id);
      }
    });
  }, [removeAgent]);

  const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    removeProjectEdge(edge.source, edge.target);
  }, [removeProjectEdge]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id !== 'START' && node.id !== 'END') {
      selectNode(node.id);
    } else {
      selectNode(null);
    }
  }, [selectNode]);

  const onPaneClick = useCallback(() => selectNode(null), [selectNode]);

  const handleAddTool = useCallback((type: string) => {
    if (!selectedNodeId) return;
    addToolToAgent(selectedNodeId, type);
    const agentTools = currentProject?.agents[selectedNodeId]?.tools || [];
    const isMulti = type === 'function' || type === 'mcp';
    const count = isMulti ? agentTools.filter(t => t.startsWith(type)).length : 0;
    const newToolId = isMulti ? `${selectedNodeId}_${type}_${count + 1}` : `${selectedNodeId}_${type}`;
    setTimeout(() => selectTool(newToolId), 0);
  }, [selectedNodeId, currentProject, addToolToAgent, selectTool]);

  if (!currentProject) return null;

  const selectedAgent = selectedNodeId ? currentProject.agents[selectedNodeId] : null;
  const hasAgents = Object.keys(currentProject.agents).length > 0;
  const agentTools = selectedNodeId ? currentProject.agents[selectedNodeId]?.tools || [] : [];

  return (
    <div className="flex flex-col h-full">
      <MenuBar 
        onExportCode={() => setShowCodeEditor(true)} 
        onNewProject={async () => {
          const name = prompt('Project name:');
          if (name) {
            const p = await api.projects.create(name);
            openProject(p.id);
          }
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <div className="w-48 bg-studio-panel border-r border-gray-700 p-4 flex flex-col overflow-y-auto">
          <AgentPalette onDragStart={onDragStart} onCreate={createAgent} />
          <div className="my-4" />
          <ToolPalette selectedNodeId={selectedNodeId} agentTools={agentTools} onAdd={handleAddTool} onRemove={(t) => selectedNodeId && removeToolFromAgent(selectedNodeId, t)} />
          <div className="mt-auto space-y-2 pt-4">
            <button onClick={handleCompile} className="w-full px-3 py-2 bg-blue-700 hover:bg-blue-600 rounded text-sm">📄 View Code</button>
            <button onClick={handleBuild} disabled={building} className={`w-full px-3 py-2 rounded text-sm ${building ? 'bg-gray-600' : builtBinaryPath ? 'bg-green-700 hover:bg-green-600' : 'bg-orange-600 hover:bg-orange-500 animate-pulse'}`}>
              {building ? '⏳ Building...' : builtBinaryPath ? '🔨 Build' : '🔨 Build Required'}
            </button>
            <button onClick={() => setShowConsole(!showConsole)} className="w-full px-3 py-2 bg-gray-700 rounded text-sm">{showConsole ? 'Hide Console' : 'Show Console'}</button>
            <button onClick={closeProject} className="w-full px-3 py-2 bg-gray-700 rounded text-sm">Back</button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgesDelete={onEdgesDelete}
            onNodesDelete={onNodesDelete}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            deleteKeyCode={['Backspace', 'Delete']}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background color="#333" gap={20} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Properties */}
        {selectedAgent && selectedNodeId && (
          <PropertiesPanel
            nodeId={selectedNodeId}
            agent={selectedAgent}
            agents={currentProject.agents}
            toolConfigs={currentProject.tool_configs || {}}
            onUpdate={updateAgent}
            onAddSubAgent={() => addSubAgentToContainer(selectedNodeId)}
            onClose={() => selectNode(null)}
            onSelectTool={selectTool}
            onRemoveTool={(t) => removeToolFromAgent(selectedNodeId, t)}
          />
        )}

        {/* Tool Configuration Panel */}
        {selectedToolId && currentProject && (
          <ToolConfigPanel
            toolId={selectedToolId}
            config={currentProject.tool_configs?.[selectedToolId] || null}
            onUpdate={(config) => updateToolConfig(selectedToolId, config)}
            onClose={() => selectTool(null)}
            onOpenCodeEditor={() => setShowCodeEditor(true)}
          />
        )}
      </div>

      {/* Test Console */}
      {showConsole && hasAgents && builtBinaryPath && (
        <div className="h-64">
          <TestConsole onFlowPhase={setFlowPhase} onActiveAgent={setActiveAgent} onIteration={setIteration} binaryPath={builtBinaryPath} />
        </div>
      )}
      {showConsole && hasAgents && !builtBinaryPath && (
        <div className="h-32 bg-studio-panel border-t border-gray-700 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div>Build the project first to test it</div>
            <button onClick={handleBuild} className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm">
              Build Project
            </button>
          </div>
        </div>
      )}
      {showConsole && !hasAgents && (
        <div className="h-32 bg-studio-panel border-t border-gray-700 flex items-center justify-center text-gray-500">
          Drag "LLM Agent" onto the canvas to get started
        </div>
      )}

      {/* Compiled Code Modal */}
      {compiledCode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setCompiledCode(null)}>
          <div className="bg-studio-panel rounded-lg w-4/5 h-4/5 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Generated Rust Code</h2>
              <button onClick={() => setCompiledCode(null)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {compiledCode.files.map(file => (
                <div key={file.path} className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-mono text-blue-400">{file.path}</h3>
                    <button 
                      onClick={() => navigator.clipboard.writeText(file.content)}
                      className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
                    >Copy</button>
                  </div>
                  <div className="border border-gray-700 rounded overflow-hidden">
                    <Editor
                      height={Math.min(600, file.content.split('\n').length * 19 + 20)}
                      language={file.path.endsWith('.toml') ? 'toml' : 'rust'}
                      value={file.content}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 12,
                        lineNumbers: 'on',
                        folding: true,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Build Output Modal */}
      {buildOutput && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setBuildOutput(null)}>
          <div className="bg-studio-panel rounded-lg w-3/5 max-h-4/5 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className={`text-lg font-semibold ${building ? 'text-blue-400' : buildOutput.success ? 'text-green-400' : 'text-red-400'}`}>
                {building ? '⏳ Building...' : buildOutput.success ? '✓ Build Successful' : '✗ Build Failed'}
              </h2>
              <button onClick={() => setBuildOutput(null)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {buildOutput.path && (
                <div className="mb-4 p-3 bg-green-900/30 rounded">
                  <div className="text-sm text-gray-400">Binary path:</div>
                  <code className="text-green-400 text-sm">{buildOutput.path}</code>
                </div>
              )}
              <pre 
                ref={el => { if (el && building) el.scrollTop = el.scrollHeight; }}
                className="bg-gray-900 p-4 rounded text-xs overflow-auto whitespace-pre max-h-96"
              >{buildOutput.output}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Code Editor Modal */}
      {showCodeEditor && selectedToolId && (() => {
        const toolConfig = currentProject?.tool_configs?.[selectedToolId];
        if (!toolConfig || toolConfig.type !== 'function') return null;
        const fnConfig = toolConfig as FunctionToolConfig;
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowCodeEditor(false)}>
            <div className="bg-studio-panel rounded-lg w-11/12 h-5/6 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-blue-400">
                  {fnConfig.name || 'function'}_fn
                </h2>
                <button onClick={() => setShowCodeEditor(false)} className="text-gray-400 hover:text-white text-xl">×</button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  defaultLanguage="rust"
                  theme="vs-dark"
                  value={generateFunctionTemplate(fnConfig)}
                  onChange={(value) => {
                    if (value) {
                      const code = extractUserCode(value, fnConfig);
                      updateToolConfig(selectedToolId, { ...fnConfig, code });
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                  }}
                />
              </div>
              <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
                <button 
                  onClick={() => setShowCodeEditor(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
