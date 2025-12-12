use crate::schema::*;
use adk_core::{Result, Tool, ToolContext};
use async_trait::async_trait;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;

/// Parameters for the render_form tool
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RenderFormParams {
    /// Title of the form
    pub title: String,
    /// Optional description
    #[serde(default)]
    pub description: Option<String>,
    /// Form fields to render
    pub fields: Vec<FormField>,
    /// Action ID for form submission
    #[serde(default = "default_submit_action")]
    pub submit_action: String,
    /// Submit button label
    #[serde(default = "default_submit_label")]
    pub submit_label: String,
}

fn default_submit_action() -> String {
    "form_submit".to_string()
}

fn default_submit_label() -> String {
    "Submit".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct FormField {
    /// Field name (used as key in submission)
    pub name: String,
    /// Label displayed to user
    pub label: String,
    /// Field type: text, email, password, number, date, select
    #[serde(rename = "type", default = "default_field_type")]
    pub field_type: String,
    /// Placeholder text
    #[serde(default)]
    pub placeholder: Option<String>,
    /// Whether the field is required
    #[serde(default)]
    pub required: bool,
    /// Options for select fields
    #[serde(default)]
    pub options: Vec<SelectOption>,
}

fn default_field_type() -> String {
    "text".to_string()
}

/// Tool for rendering forms to collect user input
pub struct RenderFormTool;

impl RenderFormTool {
    pub fn new() -> Self {
        Self
    }
}

impl Default for RenderFormTool {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Tool for RenderFormTool {
    fn name(&self) -> &str {
        "render_form"
    }

    fn description(&self) -> &str {
        "Render a form to collect structured input from the user. Use this when you need the user to provide multiple pieces of information like registration, settings, or surveys."
    }

    fn parameters_schema(&self) -> Option<Value> {
        Some(super::generate_gemini_schema::<RenderFormParams>())
    }

    async fn execute(&self, _ctx: Arc<dyn ToolContext>, args: Value) -> Result<Value> {
        let params: RenderFormParams = serde_json::from_value(args)
            .map_err(|e| adk_core::AdkError::Tool(format!("Invalid parameters: {}", e)))?;

        // Build the form UI
        let mut form_content: Vec<Component> = Vec::new();

        for field in params.fields {
            let component = match field.field_type.as_str() {
                "number" => Component::NumberInput(NumberInput {
                    id: None,
                    name: field.name,
                    label: field.label,
                    min: None,
                    max: None,
                    step: None,
                    required: field.required,
                    error: None,
                }),
                "select" => Component::Select(Select {
                    id: None,
                    name: field.name,
                    label: field.label,
                    options: field.options,
                    required: field.required,
                    error: None,
                }),
                _ => Component::TextInput(TextInput {
                    id: None,
                    name: field.name,
                    label: field.label,
                    placeholder: field.placeholder,
                    required: field.required,
                    default_value: None,
                    error: None,
                }),
            };
            form_content.push(component);
        }

        // Add submit button
        form_content.push(Component::Button(Button {
            id: None,
            label: params.submit_label,
            action_id: params.submit_action,
            variant: ButtonVariant::Primary,
            disabled: false,
        }));

        // Wrap in a card
        let ui = UiResponse::new(vec![Component::Card(Card {
            id: None,
            title: Some(params.title),
            description: params.description,
            content: form_content,
            footer: None,
        })]);

        // Return as JSON - the framework will convert to Part::InlineData
        Ok(serde_json::to_value(ui).unwrap())
    }
}
