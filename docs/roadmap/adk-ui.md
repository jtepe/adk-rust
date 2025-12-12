# ADK-UI: Dynamic UI Generation

## Overview

`adk-ui` enables agents to dynamically generate rich user interfaces via tool calls. Agents can render forms, cards, alerts, tables, charts, and more - all through a type-safe Rust API that serializes to JSON for frontend consumption.

## Current State (v0.1.5)

### What Works

- **23 Component Types**: Full schema with optional IDs for streaming updates
- **8 Render Tools**: `render_form`, `render_card`, `render_alert`, `render_confirm`, `render_table`, `render_chart`, `render_layout`, `render_progress`
- **Bidirectional Data Flow**: Forms submit data back to agent via `UiEvent`
- **Streaming Protocol**: `UiUpdate` type for incremental component updates by ID
- **TypeScript Client**: React renderer in `examples/ui_react_client`
- **Unit Tests**: 13 tests covering schema serialization, variants, updates, and toolset

### Architecture

```
Agent ──[render_* tool]──> UiResponse ──[SSE]──> React Client
               ↑                                      │
               └────────── UiEvent ◄──────────────────┘

Streaming Updates:
Agent ──[UiUpdate]──> Client ──[patch by ID]──> DOM
```

### Components

**Atoms**: Text, Button, Icon, Image, Badge
**Inputs**: TextInput, NumberInput, Select, MultiSelect, Switch, DateInput, Slider
**Layouts**: Stack, Grid, Card, Container, Divider, Tabs
**Data**: Table, List, KeyValue, CodeBlock
**Visualization**: Chart (bar, line, area, pie)
**Feedback**: Alert, Progress

### Usage

```rust
use adk_rust::prelude::*;
use adk_rust::ui::UiToolset;

let agent = LlmAgentBuilder::new("ui_agent")
    .model(model)
    .tools(UiToolset::all_tools())
    .build()?;
```

## Known Limitations

1. **React-only client** - No Vue/Svelte/vanilla JS renderers
2. **Manual integration** - React client must be copied from examples
3. **No accessibility** - Missing ARIA attributes
4. **No server-side rendering** - Client-side only
5. **No component validation** - Schema validation is client-side only

## Future Work

- [ ] Publish React client as npm package (`@adk/ui-react`)
- [ ] ARIA accessibility attributes
- [ ] Server-side rendering support
- [ ] Multi-framework clients (Vue, Svelte)
- [ ] Component validation in Rust
- [ ] Theming API expansion

## Files

- `adk-ui/src/schema.rs` - Component types and UiUpdate
- `adk-ui/src/toolset.rs` - UiToolset configuration
- `adk-ui/src/tools/` - Individual render tools

## Examples

### `examples/ui_agent/`
Console-based demo agent with UI tools. Runs in terminal via `adk_cli::console`.

```bash
GOOGLE_API_KEY=... cargo run --example ui_agent
```

### `examples/ui_server/`
HTTP server exposing UI agent via SSE. Uses `adk_cli::serve` for REST API.

```bash
GOOGLE_API_KEY=... cargo run --example ui_server
# Server runs on http://localhost:8080
```

### `examples/ui_react_client/`
React frontend that connects to ui_server and renders UI components.

```bash
cd examples/ui_react_client
npm install && npm run dev
# Client runs on http://localhost:5173
```

**Full stack demo**: Run ui_server in one terminal, ui_react_client in another, then interact via browser.

## Changelog

### v0.1.5 (2025-12-12)
- Added component IDs (`id: Option<String>`) to all 23 components
- Added `UiUpdate` type for streaming incremental updates
- Added `UiOperation` enum: Replace, Patch, Append, Remove
- Fixed `BadgeVariant` to include: default, info, success, warning, error, secondary, outline
- Fixed `KeyValue` to use `pairs` field (renamed from `items`)
- Renamed `KeyValueItem` to `KeyValuePair` for consistency
- Added 13 unit tests (8 schema, 5 toolset)
- Integrated into umbrella crate with `ui` feature flag
- Added to prelude: `UiToolset`
- TypeScript types updated to match Rust schema

### v0.1.0 (2025-12-11)
- Initial implementation with 8 tools and 23 component types
