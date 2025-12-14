//! Guardrail integration for LlmAgent
//!
//! This module provides guardrail support when the `guardrails` feature is enabled.

#[cfg(feature = "guardrails")]
pub use adk_guardrail::{
    ContentFilter, ContentFilterConfig, Guardrail, GuardrailExecutor, GuardrailResult,
    GuardrailSet, PiiRedactor, PiiType, Severity,
};

#[cfg(feature = "guardrails")]
pub use adk_guardrail::SchemaValidator;

/// Placeholder type when guardrails feature is disabled
#[cfg(not(feature = "guardrails"))]
pub struct GuardrailSet;

#[cfg(not(feature = "guardrails"))]
impl GuardrailSet {
    pub fn new() -> Self {
        Self
    }
    pub fn is_empty(&self) -> bool {
        true
    }
}

#[cfg(not(feature = "guardrails"))]
impl Default for GuardrailSet {
    fn default() -> Self {
        Self::new()
    }
}
