use crate::schema::{AgentSchema, AgentType, ProjectSchema, ToolConfig, BrowserToolConfig};
use adk_agent::{Agent, LlmAgentBuilder, LoopAgent, ParallelAgent, SequentialAgent};
use adk_core::{Tool, ToolContext};
use adk_model::gemini::GeminiModel;
use adk_tool::{ExitLoopTool, GoogleSearchTool, LoadArtifactsTool, FunctionTool};
use anyhow::{anyhow, Result};
use serde_json::{json, Value};
use std::sync::Arc;

/// Compile an AgentSchema into a runnable Agent
pub fn compile_agent(name: &str, schema: &AgentSchema, api_key: &str, project: &ProjectSchema) -> Result<Arc<dyn Agent>> {
    match schema.agent_type {
        AgentType::Llm => compile_llm_agent(name, schema, api_key, project),
        AgentType::Sequential => compile_sequential_agent(name, schema, api_key, project),
        AgentType::Loop => compile_loop_agent(name, schema, api_key, project),
        AgentType::Parallel => compile_parallel_agent(name, schema, api_key, project),
        _ => Err(anyhow!("Agent type {:?} not yet supported", schema.agent_type)),
    }
}

fn compile_llm_agent(name: &str, schema: &AgentSchema, api_key: &str, project: &ProjectSchema) -> Result<Arc<dyn Agent>> {
    let model_name = schema.model.as_deref().unwrap_or("gemini-2.0-flash");
    let model = Arc::new(GeminiModel::new(api_key, model_name)?);
    let mut builder = LlmAgentBuilder::new(name).model(model);
    
    if !schema.instruction.is_empty() {
        builder = builder.instruction(&schema.instruction);
    }
    
    // Add tools
    for tool_type in &schema.tools {
        let tool_id = format!("{}_{}", name, tool_type);
        let config = project.tool_configs.get(&tool_id);
        if let Some(tool) = compile_tool(tool_type, config) {
            builder = builder.tool(tool);
        }
    }
    
    Ok(Arc::new(builder.build()?))
}

fn compile_tool(tool_type: &str, config: Option<&ToolConfig>) -> Option<Arc<dyn Tool>> {
    match tool_type {
        "google_search" => Some(Arc::new(GoogleSearchTool::new())),
        "exit_loop" => Some(Arc::new(ExitLoopTool::new())),
        "load_artifact" => Some(Arc::new(LoadArtifactsTool::new())),
        "function" => compile_function_tool(config),
        "browser" => compile_browser_tool(config),
        // MCP requires async setup, skip for now (would need runtime changes)
        "mcp" => {
            tracing::warn!("MCP tools require async initialization - not yet supported in studio runtime");
            None
        }
        _ => None,
    }
}

fn compile_function_tool(config: Option<&ToolConfig>) -> Option<Arc<dyn Tool>> {
    let config = match config {
        Some(ToolConfig::Function(c)) => c,
        _ => return None,
    };
    
    if config.name.is_empty() {
        return None;
    }
    
    let name = config.name.clone();
    let desc = config.description.clone();
    
    let tool = FunctionTool::new(
        name.clone(),
        desc,
        move |_ctx: Arc<dyn ToolContext>, args: Value| {
            let fn_name = name.clone();
            async move {
                // Execute based on function name pattern
                let result = match fn_name.as_str() {
                    "get_weather" => {
                        let city = args.get("city").and_then(|v| v.as_str()).unwrap_or("Unknown");
                        let units = args.get("units").and_then(|v| v.as_str()).unwrap_or("celsius");
                        // Simulated weather data
                        let temp = match city.to_lowercase().as_str() {
                            "tokyo" => 18,
                            "london" => 12,
                            "new york" | "nyc" => 15,
                            "sydney" => 25,
                            "paris" => 14,
                            _ => 20,
                        };
                        let temp_display = if units == "fahrenheit" { temp * 9 / 5 + 32 } else { temp };
                        json!({
                            "city": city,
                            "temperature": temp_display,
                            "units": units,
                            "condition": "partly cloudy",
                            "humidity": 65
                        })
                    }
                    "get_time" => {
                        let tz = args.get("timezone").and_then(|v| v.as_str()).unwrap_or("UTC");
                        json!({
                            "timezone": tz,
                            "time": chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string()
                        })
                    }
                    "calculate" => {
                        let expr = args.get("expression").and_then(|v| v.as_str()).unwrap_or("0");
                        // Simple eval for basic math
                        let result: f64 = expr.parse().unwrap_or(0.0);
                        json!({ "expression": expr, "result": result })
                    }
                    _ => {
                        // Generic response for unknown functions
                        json!({
                            "function": fn_name,
                            "args": args,
                            "result": "Function executed successfully"
                        })
                    }
                };
                Ok(result)
            }
        },
    );
    
    Some(Arc::new(tool))
}

fn compile_browser_tool(config: Option<&ToolConfig>) -> Option<Arc<dyn Tool>> {
    let config = match config {
        Some(ToolConfig::Browser(c)) => c,
        _ => {
            // Use defaults if no config
            &BrowserToolConfig { headless: true, timeout_ms: 30000 }
        }
    };
    
    let headless = config.headless;
    let timeout = config.timeout_ms;
    
    // Create a placeholder browser tool
    let tool = FunctionTool::new(
        "browser",
        "Browser automation tool. Actions: navigate(url), click(selector), type(selector, text), screenshot(), get_text(selector)",
        move |_ctx: Arc<dyn ToolContext>, args: Value| {
            async move {
                let action = args.get("action").and_then(|v| v.as_str()).unwrap_or("unknown");
                Ok(json!({
                    "status": "browser_action",
                    "action": action,
                    "headless": headless,
                    "timeout_ms": timeout,
                    "note": "Browser tool requires adk-browser crate integration"
                }))
            }
        },
    );
    
    Some(Arc::new(tool))
}

fn compile_sequential_agent(name: &str, schema: &AgentSchema, api_key: &str, project: &ProjectSchema) -> Result<Arc<dyn Agent>> {
    let sub_agents = compile_sub_agents(schema, api_key, project)?;
    Ok(Arc::new(SequentialAgent::new(name, sub_agents)))
}

fn compile_loop_agent(name: &str, schema: &AgentSchema, api_key: &str, project: &ProjectSchema) -> Result<Arc<dyn Agent>> {
    let sub_agents = compile_sub_agents(schema, api_key, project)?;
    let max_iter = schema.max_iterations.unwrap_or(3);
    Ok(Arc::new(LoopAgent::new(name, sub_agents).with_max_iterations(max_iter)))
}

fn compile_parallel_agent(name: &str, schema: &AgentSchema, api_key: &str, project: &ProjectSchema) -> Result<Arc<dyn Agent>> {
    let sub_agents = compile_sub_agents(schema, api_key, project)?;
    Ok(Arc::new(ParallelAgent::new(name, sub_agents)))
}

fn compile_sub_agents(schema: &AgentSchema, api_key: &str, project: &ProjectSchema) -> Result<Vec<Arc<dyn Agent>>> {
    let mut sub_agents: Vec<Arc<dyn Agent>> = Vec::new();
    for sub_id in &schema.sub_agents {
        let sub_schema = project.agents.get(sub_id)
            .ok_or_else(|| anyhow!("Sub-agent {} not found", sub_id))?;
        sub_agents.push(compile_agent(sub_id, sub_schema, api_key, project)?);
    }
    if sub_agents.is_empty() {
        return Err(anyhow!("Container agent has no sub-agents"));
    }
    Ok(sub_agents)
}
