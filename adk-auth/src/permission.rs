//! Permission types for access control.

use serde::{Deserialize, Serialize};

/// Permission for accessing tools or agents.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Permission {
    /// Access to a specific tool by name.
    Tool(String),
    /// Access to all tools (wildcard).
    AllTools,
    /// Access to a specific agent by name.
    Agent(String),
    /// Access to all agents (wildcard).
    AllAgents,
}

impl Permission {
    /// Create a tool permission.
    pub fn tool(name: impl Into<String>) -> Self {
        Permission::Tool(name.into())
    }

    /// Create an agent permission.
    pub fn agent(name: impl Into<String>) -> Self {
        Permission::Agent(name.into())
    }

    /// Check if this permission matches a specific resource.
    pub fn matches(&self, resource_type: &str, resource_name: &str) -> bool {
        match self {
            Permission::Tool(name) => resource_type == "tool" && name == resource_name,
            Permission::AllTools => resource_type == "tool",
            Permission::Agent(name) => resource_type == "agent" && name == resource_name,
            Permission::AllAgents => resource_type == "agent",
        }
    }

    /// Check if this permission covers another permission.
    pub fn covers(&self, other: &Permission) -> bool {
        match (self, other) {
            // AllTools covers all tool permissions
            (Permission::AllTools, Permission::Tool(_)) => true,
            (Permission::AllTools, Permission::AllTools) => true,
            // AllAgents covers all agent permissions
            (Permission::AllAgents, Permission::Agent(_)) => true,
            (Permission::AllAgents, Permission::AllAgents) => true,
            // Exact match
            (a, b) => a == b,
        }
    }
}

impl std::fmt::Display for Permission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Permission::Tool(name) => write!(f, "tool:{}", name),
            Permission::AllTools => write!(f, "tool:*"),
            Permission::Agent(name) => write!(f, "agent:{}", name),
            Permission::AllAgents => write!(f, "agent:*"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_matches() {
        let tool_perm = Permission::Tool("search".into());
        assert!(tool_perm.matches("tool", "search"));
        assert!(!tool_perm.matches("tool", "other"));
        assert!(!tool_perm.matches("agent", "search"));

        let all_tools = Permission::AllTools;
        assert!(all_tools.matches("tool", "anything"));
        assert!(!all_tools.matches("agent", "anything"));
    }

    #[test]
    fn test_permission_covers() {
        let all_tools = Permission::AllTools;
        let specific_tool = Permission::Tool("search".into());

        assert!(all_tools.covers(&specific_tool));
        assert!(all_tools.covers(&Permission::AllTools));
        assert!(!specific_tool.covers(&Permission::AllTools));
        assert!(specific_tool.covers(&Permission::Tool("search".into())));
    }

    #[test]
    fn test_permission_display() {
        assert_eq!(Permission::Tool("search".into()).to_string(), "tool:search");
        assert_eq!(Permission::AllTools.to_string(), "tool:*");
        assert_eq!(Permission::Agent("assistant".into()).to_string(), "agent:assistant");
        assert_eq!(Permission::AllAgents.to_string(), "agent:*");
    }
}
