use crate::schema::*;
use adk_core::{Result, Tool, ToolContext};
use async_trait::async_trait;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;

/// Parameters for the render_table tool
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RenderTableParams {
    /// Table title
    #[serde(default)]
    pub title: Option<String>,
    /// Column definitions
    pub columns: Vec<ColumnDef>,
    /// Row data - array of objects with keys matching accessor_key
    pub data: Vec<HashMap<String, Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ColumnDef {
    /// Column header text
    pub header: String,
    /// Key to access data from row objects
    pub accessor_key: String,
}

/// Tool for rendering data tables
pub struct RenderTableTool;

impl RenderTableTool {
    pub fn new() -> Self {
        Self
    }
}

impl Default for RenderTableTool {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Tool for RenderTableTool {
    fn name(&self) -> &str {
        "render_table"
    }

    fn description(&self) -> &str {
        "Render a data table to display tabular information. Use this for showing lists of items, search results, or any structured data with multiple rows and columns."
    }

    fn parameters_schema(&self) -> Option<Value> {
        Some(super::generate_gemini_schema::<RenderTableParams>())
    }

    async fn execute(&self, _ctx: Arc<dyn ToolContext>, args: Value) -> Result<Value> {
        let params: RenderTableParams = serde_json::from_value(args)
            .map_err(|e| adk_core::AdkError::Tool(format!("Invalid parameters: {}", e)))?;

        let columns: Vec<TableColumn> = params
            .columns
            .into_iter()
            .map(|c| TableColumn { header: c.header, accessor_key: c.accessor_key })
            .collect();

        let mut components = Vec::new();

        // Add title if provided
        if let Some(title) = params.title {
            components.push(Component::Text(Text {
                id: None,
                content: title,
                variant: TextVariant::H3,
            }));
        }

        components.push(Component::Table(Table { id: None, columns, data: params.data }));

        let ui = UiResponse::new(components);
        Ok(serde_json::to_value(ui).unwrap())
    }
}
