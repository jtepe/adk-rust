//! Role type with allow/deny permissions.

use crate::Permission;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// A role with a set of allowed and denied permissions.
///
/// Deny rules take precedence over allow rules.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    /// Role name (e.g., "admin", "user", "analyst").
    pub name: String,
    /// Permissions explicitly allowed for this role.
    allowed: HashSet<Permission>,
    /// Permissions explicitly denied for this role.
    denied: HashSet<Permission>,
}

impl Role {
    /// Create a new role with the given name.
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            allowed: HashSet::new(),
            denied: HashSet::new(),
        }
    }

    /// Allow a permission for this role.
    pub fn allow(mut self, permission: Permission) -> Self {
        self.allowed.insert(permission);
        self
    }

    /// Deny a permission for this role.
    ///
    /// Deny rules take precedence over allow rules.
    pub fn deny(mut self, permission: Permission) -> Self {
        self.denied.insert(permission);
        self
    }

    /// Check if this role can access the given permission.
    ///
    /// Returns `true` if the permission is allowed and not denied.
    /// Deny rules take precedence over allow rules.
    pub fn can_access(&self, permission: &Permission) -> bool {
        // Check if explicitly denied (or covered by a deny rule)
        for denied in &self.denied {
            if denied.covers(permission) {
                return false;
            }
        }

        // Check if explicitly allowed (or covered by an allow rule)
        for allowed in &self.allowed {
            if allowed.covers(permission) {
                return true;
            }
        }

        // Default: deny
        false
    }

    /// Get all allowed permissions.
    pub fn allowed_permissions(&self) -> &HashSet<Permission> {
        &self.allowed
    }

    /// Get all denied permissions.
    pub fn denied_permissions(&self) -> &HashSet<Permission> {
        &self.denied
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_allow() {
        let role = Role::new("user")
            .allow(Permission::Tool("search".into()))
            .allow(Permission::Tool("summarize".into()));

        assert!(role.can_access(&Permission::Tool("search".into())));
        assert!(role.can_access(&Permission::Tool("summarize".into())));
        assert!(!role.can_access(&Permission::Tool("other".into())));
    }

    #[test]
    fn test_role_deny_precedence() {
        let role = Role::new("restricted")
            .allow(Permission::AllTools)
            .deny(Permission::Tool("code_exec".into()));

        // AllTools allows everything...
        assert!(role.can_access(&Permission::Tool("search".into())));
        // ...except explicitly denied
        assert!(!role.can_access(&Permission::Tool("code_exec".into())));
    }

    #[test]
    fn test_admin_role() {
        let admin = Role::new("admin")
            .allow(Permission::AllTools)
            .allow(Permission::AllAgents);

        assert!(admin.can_access(&Permission::Tool("anything".into())));
        assert!(admin.can_access(&Permission::Agent("any_agent".into())));
        assert!(admin.can_access(&Permission::AllTools));
        assert!(admin.can_access(&Permission::AllAgents));
    }

    #[test]
    fn test_empty_role_denies_all() {
        let empty = Role::new("empty");

        assert!(!empty.can_access(&Permission::Tool("search".into())));
        assert!(!empty.can_access(&Permission::AllTools));
    }
}
