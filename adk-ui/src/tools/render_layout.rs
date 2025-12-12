use crate::schema::*;
use adk_core::{Result, Tool, ToolContext};
use async_trait::async_trait;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;

/// A section in a dashboard layout - simplified
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct DashboardSection {
    /// Section title
    pub title: String,
    /// Type of content: "stats", "table", "chart", "alert", "text"
    #[serde(rename = "type")]
    pub section_type: String,
    /// For stats sections: list of label/value pairs
    #[serde(default)]
    pub stats: Option<Vec<StatItem>>,
    /// For text sections: the text content
    #[serde(default)]
    pub text: Option<String>,
    /// For alert sections: the message and severity (info, success, warning, error)
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub severity: Option<String>,
    /// For table sections: columns and rows
    #[serde(default)]
    pub columns: Option<Vec<ColumnSpec>>,
    #[serde(default)]
    pub rows: Option<Vec<HashMap<String, Value>>>,
    /// For chart sections
    #[serde(default)]
    pub chart_type: Option<String>,
    #[serde(default)]
    pub data: Option<Vec<HashMap<String, Value>>>,
    #[serde(default)]
    pub x_key: Option<String>,
    #[serde(default)]
    pub y_keys: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct StatItem {
    pub label: String,
    pub value: String,
    /// Optional status: "operational", "degraded", "down"
    #[serde(default)]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ColumnSpec {
    pub header: String,
    pub key: String,
}

/// Parameters for the render_layout tool
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RenderLayoutParams {
    /// Dashboard/layout title
    pub title: String,
    /// Optional description
    #[serde(default)]
    pub description: Option<String>,
    /// Sections to display
    pub sections: Vec<DashboardSection>,
}

/// Tool for rendering complex multi-component layouts
pub struct RenderLayoutTool;

impl RenderLayoutTool {
    pub fn new() -> Self {
        Self
    }
}

impl Default for RenderLayoutTool {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Tool for RenderLayoutTool {
    fn name(&self) -> &str {
        "render_layout"
    }

    fn description(&self) -> &str {
        "Render a dashboard layout with multiple sections. Use for status pages, dashboards, or multi-part displays. Each section has a type: 'stats' (with label/value/status items), 'table' (with columns/rows), 'chart' (with data/x_key/y_keys), 'alert' (with message/severity), or 'text' (with text content)."
    }

    fn parameters_schema(&self) -> Option<Value> {
        Some(super::generate_gemini_schema::<RenderLayoutParams>())
    }

    async fn execute(&self, _ctx: Arc<dyn ToolContext>, args: Value) -> Result<Value> {
        let params: RenderLayoutParams = serde_json::from_value(args.clone()).map_err(|e| {
            adk_core::AdkError::Tool(format!("Invalid parameters: {}. Got: {}", e, args))
        })?;

        let mut components = Vec::new();

        // Title
        components.push(Component::Text(Text {
            id: None,
            content: params.title,
            variant: TextVariant::H2,
        }));

        // Description
        if let Some(desc) = params.description {
            components.push(Component::Text(Text {
                id: None,
                content: desc,
                variant: TextVariant::Caption,
            }));
        }

        // Build sections
        for section in params.sections {
            let section_component = build_section_component(section);
            components.push(section_component);
        }

        let ui = UiResponse::new(components);
        Ok(serde_json::to_value(ui).unwrap())
    }
}

fn build_section_component(section: DashboardSection) -> Component {
    let mut card_content: Vec<Component> = Vec::new();

    match section.section_type.as_str() {
        "stats" => {
            if let Some(stats) = section.stats {
                // Create a nice stats display
                for stat in stats {
                    let status_indicator = match stat.status.as_deref() {
                        Some("operational") | Some("ok") | Some("success") => "🟢 ",
                        Some("degraded") | Some("warning") => "🟡 ",
                        Some("down") | Some("error") | Some("outage") => "🔴 ",
                        _ => "",
                    };
                    card_content.push(Component::Text(Text {
                        id: None,
                        content: format!("{}{}: {}", status_indicator, stat.label, stat.value),
                        variant: TextVariant::Body,
                    }));
                }
            }
        }
        "text" => {
            if let Some(text) = section.text {
                card_content.push(Component::Text(Text {
                    id: None,
                    content: text,
                    variant: TextVariant::Body,
                }));
            }
        }
        "alert" => {
            let variant = match section.severity.as_deref() {
                Some("success") => AlertVariant::Success,
                Some("warning") => AlertVariant::Warning,
                Some("error") => AlertVariant::Error,
                _ => AlertVariant::Info,
            };
            return Component::Alert(Alert {
                id: None,
                title: section.title,
                description: section.message,
                variant,
            });
        }
        "table" => {
            if let (Some(cols), Some(rows)) = (section.columns, section.rows) {
                let table_columns: Vec<TableColumn> = cols
                    .into_iter()
                    .map(|c| TableColumn { header: c.header, accessor_key: c.key })
                    .collect();
                card_content.push(Component::Table(Table {
                    id: None,
                    columns: table_columns,
                    data: rows,
                }));
            }
        }
        "chart" => {
            if let (Some(data), Some(x), Some(y)) = (section.data, section.x_key, section.y_keys) {
                let kind = match section.chart_type.as_deref() {
                    Some("line") => ChartKind::Line,
                    Some("area") => ChartKind::Area,
                    Some("pie") => ChartKind::Pie,
                    _ => ChartKind::Bar,
                };
                card_content.push(Component::Chart(Chart {
                    id: None,
                    title: None,
                    kind,
                    data,
                    x_key: x,
                    y_keys: y,
                }));
            }
        }
        _ => {
            // Fallback: show raw text
            card_content.push(Component::Text(Text {
                id: None,
                content: format!("Unknown section type: {}", section.section_type),
                variant: TextVariant::Caption,
            }));
        }
    }

    // If no content was added, add a placeholder
    if card_content.is_empty() {
        card_content.push(Component::Text(Text {
            id: None,
            content: "(No content)".to_string(),
            variant: TextVariant::Caption,
        }));
    }

    Component::Card(Card {
        id: None,
        title: Some(section.title),
        description: None,
        content: card_content,
        footer: None,
    })
}
