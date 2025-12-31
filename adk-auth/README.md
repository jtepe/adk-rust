# adk-auth

Access control and authentication for Rust Agent Development Kit (ADK-Rust).

[![Crates.io](https://img.shields.io/crates/v/adk-auth.svg)](https://crates.io/crates/adk-auth)
[![Documentation](https://docs.rs/adk-auth/badge.svg)](https://docs.rs/adk-auth)
[![License](https://img.shields.io/crates/l/adk-auth.svg)](LICENSE)

## Overview

`adk-auth` provides enterprise-grade access control for AI agents:

- **Role-Based Access** - Define roles with tool/agent permissions
- **Permission Scopes** - Fine-grained allow/deny rules
- **Audit Logging** - Log all tool calls with user context
- **Callback Integration** - Works with existing `Runner.with_callbacks()`

## Quick Start

```rust
use adk_auth::{Permission, Role, AccessControl, auth_callbacks};
use adk_runner::Runner;

// Define roles
let admin = Role::new("admin")
    .allow(Permission::AllTools)
    .allow(Permission::AllAgents);

let user = Role::new("user")
    .allow(Permission::Tool("google_search".into()))
    .deny(Permission::Tool("code_execution".into()));

// Build access control
let ac = AccessControl::builder()
    .role(admin)
    .role(user)
    .assign("alice@example.com", "admin")
    .assign("bob@example.com", "user")
    .build()?;

// Use with runner
let callbacks = auth_callbacks(ac);
let runner = Runner::new(config)
    .with_callbacks(callbacks)
    .build()?;
```

## Features

| Feature | Description |
|---------|-------------|
| Role-Based Access | Define roles with tool/agent permissions |
| Permission Scopes | Fine-grained allow/deny rules |
| Deny Rules | Deny takes precedence over allow |
| Audit Logging | Log all access attempts |

## License

Apache-2.0

## Part of ADK-Rust

This crate is part of the [ADK-Rust](https://adk-rust.com) framework for building AI agents in Rust.
