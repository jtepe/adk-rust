use crate::schema::*;
use adk_core::{Result, Tool, ToolContext};
use async_trait::async_trait;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;

/// Parameters for the render_chart tool
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RenderChartParams {
    /// Chart title
    #[serde(default)]
    pub title: Option<String>,
    /// Chart type: bar, line, area, or pie
    #[serde(rename = "type", default = "default_chart_type")]
    pub chart_type: String,
    /// Data points - array of objects with x_key and y_key values
    pub data: Vec<HashMap<String, Value>>,
    /// Key for x-axis values
    pub x_key: String,
    /// Keys for y-axis values (can be multiple for multi-series)
    pub y_keys: Vec<String>,
}

fn default_chart_type() -> String {
    "bar".to_string()
}

/// Tool for rendering charts and visualizations
pub struct RenderChartTool;

impl RenderChartTool {
    pub fn new() -> Self {
        Self
    }
}

impl Default for RenderChartTool {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Tool for RenderChartTool {
    fn name(&self) -> &str {
        "render_chart"
    }

    fn description(&self) -> &str {
        "Render a chart to visualize data. Supports bar, line, area, and pie charts. Use this for showing trends, comparisons, or distributions."
    }

    fn parameters_schema(&self) -> Option<Value> {
        Some(super::generate_gemini_schema::<RenderChartParams>())
    }

    async fn execute(&self, _ctx: Arc<dyn ToolContext>, args: Value) -> Result<Value> {
        let params: RenderChartParams = serde_json::from_value(args)
            .map_err(|e| adk_core::AdkError::Tool(format!("Invalid parameters: {}", e)))?;

        let kind = match params.chart_type.as_str() {
            "line" => ChartKind::Line,
            "area" => ChartKind::Area,
            "pie" => ChartKind::Pie,
            _ => ChartKind::Bar,
        };

        let ui = UiResponse::new(vec![Component::Chart(Chart {
            id: None,
            title: params.title,
            kind,
            data: params.data,
            x_key: params.x_key,
            y_keys: params.y_keys,
        })]);

        Ok(serde_json::to_value(ui).unwrap())
    }
}
