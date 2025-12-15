use serde::{Deserialize, Serialize};

/// Agent definition schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSchema {
    #[serde(rename = "type")]
    pub agent_type: AgentType,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub instruction: String,
    #[serde(default)]
    pub tools: Vec<String>,
    #[serde(default)]
    pub sub_agents: Vec<String>,
    #[serde(default)]
    pub position: Position,
    #[serde(default)]
    pub max_iterations: Option<u32>,
    /// For router agents: condition -> target agent mapping
    #[serde(default)]
    pub routes: Vec<Route>,
}

/// A conditional route
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Route {
    pub condition: String,
    pub target: String,
}

impl AgentSchema {
    pub fn llm(model: impl Into<String>) -> Self {
        Self {
            agent_type: AgentType::Llm,
            model: Some(model.into()),
            instruction: String::new(),
            tools: Vec::new(),
            sub_agents: Vec::new(),
            position: Position::default(),
            max_iterations: None,
            routes: Vec::new(),
        }
    }

    pub fn with_instruction(mut self, instruction: impl Into<String>) -> Self {
        self.instruction = instruction.into();
        self
    }

    pub fn with_tools(mut self, tools: Vec<String>) -> Self {
        self.tools = tools;
        self
    }

    pub fn with_position(mut self, x: f64, y: f64) -> Self {
        self.position = Position { x, y };
        self
    }
}

/// Agent type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentType {
    Llm,
    Tool,
    Sequential,
    Parallel,
    Loop,
    Router,
    Graph,
    Custom,
}

/// Canvas position
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}
