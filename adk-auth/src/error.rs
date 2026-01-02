//! Error types for adk-auth.

use thiserror::Error;

/// Error returned when access is denied.
#[derive(Debug, Clone, Error)]
#[error("Access denied: user '{user}' cannot access {permission}")]
pub struct AccessDenied {
    /// The user who was denied.
    pub user: String,
    /// The permission that was denied.
    pub permission: String,
}

impl AccessDenied {
    /// Create a new access denied error.
    pub fn new(user: impl Into<String>, permission: impl Into<String>) -> Self {
        Self { user: user.into(), permission: permission.into() }
    }
}

/// General auth error.
#[derive(Debug, Error)]
pub enum AuthError {
    /// Access was denied.
    #[error(transparent)]
    AccessDenied(#[from] AccessDenied),

    /// Role not found.
    #[error("Role not found: {0}")]
    RoleNotFound(String),

    /// User not found.
    #[error("User not found: {0}")]
    UserNotFound(String),

    /// Audit error.
    #[error("Audit error: {0}")]
    AuditError(String),

    /// IO error (for file-based audit).
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}
