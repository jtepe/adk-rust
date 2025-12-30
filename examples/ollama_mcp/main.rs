//! Ollama MCP Integration Example
//!
//! This example demonstrates how to use the McpToolset with a local Ollama model.
//!
//! To run this example, you'll need:
//! 1. Ollama running locally: ollama serve
//! 2. A model pulled: ollama pull llama3.2
//! 3. An MCP server. For testing, you can use:
//!    npx -y @modelcontextprotocol/server-everything
//!
//! Usage:
//!   cargo run --example ollama_mcp --features ollama

use adk_agent::LlmAgentBuilder;
use adk_core::{
    Agent, Content, InvocationContext, Part, ReadonlyContext, RunConfig, Session, State,
};
use adk_model::ollama::{OllamaConfig, OllamaModel};
use async_trait::async_trait;
use futures::StreamExt;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;

// Mock session for the example
struct MockSession;
impl Session for MockSession {
    fn id(&self) -> &str {
        "ollama-mcp-session"
    }
    fn app_name(&self) -> &str {
        "ollama-mcp-example"
    }
    fn user_id(&self) -> &str {
        "user"
    }
    fn state(&self) -> &dyn State {
        &MockState
    }
    fn conversation_history(&self) -> Vec<Content> {
        Vec::new()
    }
}

struct MockState;
impl State for MockState {
    fn get(&self, _key: &str) -> Option<Value> {
        None
    }
    fn set(&mut self, _key: String, _value: Value) {}
    fn all(&self) -> HashMap<String, Value> {
        HashMap::new()
    }
}

struct MockContext {
    session: MockSession,
    user_content: Content,
}

impl MockContext {
    fn new(text: &str) -> Self {
        Self {
            session: MockSession,
            user_content: Content {
                role: "user".to_string(),
                parts: vec![Part::Text { text: text.to_string() }],
            },
        }
    }
}

#[async_trait]
impl ReadonlyContext for MockContext {
    fn invocation_id(&self) -> &str {
        "ollama-mcp-inv"
    }
    fn agent_name(&self) -> &str {
        "ollama-mcp-agent"
    }
    fn user_id(&self) -> &str {
        "user"
    }
    fn app_name(&self) -> &str {
        "ollama-mcp-example"
    }
    fn session_id(&self) -> &str {
        "ollama-mcp-session"
    }
    fn branch(&self) -> &str {
        "main"
    }
    fn user_content(&self) -> &Content {
        &self.user_content
    }
}

#[async_trait]
impl adk_core::CallbackContext for MockContext {
    fn artifacts(&self) -> Option<Arc<dyn adk_core::Artifacts>> {
        None
    }
}

#[async_trait]
impl InvocationContext for MockContext {
    fn agent(&self) -> Arc<dyn Agent> {
        unimplemented!()
    }
    fn memory(&self) -> Option<Arc<dyn adk_core::Memory>> {
        None
    }
    fn session(&self) -> &dyn Session {
        &self.session
    }
    fn run_config(&self) -> &RunConfig {
        unimplemented!()
    }
    fn end_invocation(&self) {}
    fn ended(&self) -> bool {
        false
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("Ollama MCP Integration Example");
    println!("===============================\n");

    // Get model name from env or default
    let model_name = std::env::var("OLLAMA_MODEL").unwrap_or_else(|_| "llama3.2".to_string());

    println!("Using Ollama model: {}", model_name);
    println!("Make sure Ollama is running: ollama serve");
    println!("And the model is pulled: ollama pull {}\n", model_name);

    // Try to create Ollama model
    let config = OllamaConfig::new(&model_name);
    let model = match OllamaModel::new(config) {
        Ok(m) => Arc::new(m),
        Err(e) => {
            println!("Failed to create Ollama model: {}", e);
            println!("\nShowing MCP usage pattern instead...\n");
            print_usage_pattern();
            return Ok(());
        }
    };

    // For this example, we'll show the pattern without requiring an actual MCP server
    println!("Note: No MCP server available for this demo");
    println!("\nTo test with a real MCP server:");
    println!("1. Install the MCP server:");
    println!("   npm install -g @modelcontextprotocol/server-everything");
    println!("\n2. Run it:");
    println!("   npx @modelcontextprotocol/server-everything");
    println!("\n3. Connect from your code:");
    print_usage_pattern();

    // Create agent without MCP tools for demo
    let agent = LlmAgentBuilder::new("ollama-mcp-demo-agent")
        .description("Agent demonstrating MCP integration with Ollama")
        .model(model)
        .instruction("You are a helpful assistant running locally via Ollama. When MCP tools are available, you can use them.")
        .build()?;

    println!("\nAgent created successfully (without MCP tools for this demo)");

    // Run a simple query
    let ctx = Arc::new(MockContext::new("Say hello briefly"));
    let mut stream = agent.run(ctx).await?;

    println!("\nAgent response:");
    while let Some(result) = stream.next().await {
        if let Ok(event) = result {
            if let Some(content) = event.llm_response.content {
                for part in content.parts {
                    if let Part::Text { text } = part {
                        print!("{}", text);
                    }
                }
            }
        }
    }
    println!("\n");

    Ok(())
}

fn print_usage_pattern() {
    println!(
        r#"
// Ollama + MCP Toolset Usage Pattern
// ===================================

use rmcp::{{ServiceExt, transport::TokioChildProcess}};
use tokio::process::Command;
use adk_tool::McpToolset;
use adk_agent::LlmAgentBuilder;
use adk_model::ollama::{{OllamaModel, OllamaConfig}};
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {{
    // 1. Create Ollama model
    let config = OllamaConfig::new("llama3.2");
    let model = Arc::new(OllamaModel::new(config)?);

    // 2. Create MCP client connection to a local server
    let client = ().serve(TokioChildProcess::new(
        Command::new("npx")
            .arg("-y")
            .arg("@modelcontextprotocol/server-everything")
    )?).await?;

    // 3. Create toolset from the client
    let toolset = McpToolset::new(client)
        .with_name("everything-tools")
        .with_filter(|name| {{
            // Only expose specific tools
            matches!(name, "echo" | "add" | "longRunningOperation")
        }});

    // 4. Add to agent
    let agent = LlmAgentBuilder::new("ollama-mcp-agent")
        .model(model)
        .instruction("Use MCP tools to help the user.")
        .toolset(Arc::new(toolset))
        .build()?;

    // 5. Run agent - it will automatically discover and use MCP tools
    adk_cli::console::run_console(
        Arc::new(agent),
        "ollama-mcp".to_string(),
        "user".to_string(),
    ).await?;

    Ok(())
}}
"#
    );
}
