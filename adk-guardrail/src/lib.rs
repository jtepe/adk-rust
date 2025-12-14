//! # adk-guardrail
//!
//! Guardrails framework for validating agent inputs and outputs.
//!
//! ## Overview
//!
//! Guardrails run in parallel with agent execution and can:
//! - Block harmful or off-topic content
//! - Enforce output schemas
//! - Redact PII (emails, phones, SSNs)
//! - Limit costs and token usage
//!
//! ## Quick Start
//!
//! ```rust,ignore
//! use adk_guardrail::{GuardrailSet, ContentFilter, PiiRedactor};
//!
//! let input_guardrails = GuardrailSet::new()
//!     .add(ContentFilter::harmful_content())
//!     .add(PiiRedactor::new());
//!
//! let agent = LlmAgentBuilder::new("assistant")
//!     .input_guardrails(input_guardrails)
//!     .build()?;
//! ```

pub mod content;
pub mod error;
pub mod executor;
pub mod pii;
#[cfg(feature = "schema")]
pub mod schema;
pub mod traits;

pub use content::{ContentFilter, ContentFilterConfig};
pub use error::{GuardrailError, Result};
pub use executor::{GuardrailExecutor, GuardrailSet};
pub use pii::{PiiRedactor, PiiType};
#[cfg(feature = "schema")]
pub use schema::SchemaValidator;
pub use traits::{Guardrail, GuardrailResult, Severity};
