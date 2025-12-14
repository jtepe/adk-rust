use crate::Severity;

#[derive(Debug, thiserror::Error)]
pub enum GuardrailError {
    #[error("Guardrail '{name}' failed: {reason}")]
    ValidationFailed { name: String, reason: String, severity: Severity },

    #[error("Multiple guardrails failed: {0:?}")]
    MultipleFailures(Vec<GuardrailError>),

    #[error("Schema validation error: {0}")]
    Schema(String),

    #[error("Regex error: {0}")]
    Regex(#[from] regex::Error),

    #[error("Internal error: {0}")]
    Internal(String),
}

pub type Result<T> = std::result::Result<T, GuardrailError>;
