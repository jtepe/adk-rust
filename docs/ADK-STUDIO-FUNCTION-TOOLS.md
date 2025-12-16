# ADK Studio: Build-Only Function Tool System

## Overview

ADK Studio uses a **build-only approach** for custom function tools. Users define function schemas and write Rust code in the UI, which is then compiled into a standalone binary.

## User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Create Project                                               │
│     └─> Name: "Tax Calculator"                                   │
│                                                                  │
│  2. Add LLM Agent to Canvas                                      │
│     └─> Configure: model, instruction                            │
│                                                                  │
│  3. Add Function Tool to Agent                                   │
│     └─> Name: "calculate_tax"                                    │
│     └─> Description: "Calculate tax for given income"            │
│     └─> Parameters: [income: number, rate: number]               │
│     └─> Code: (user writes Rust)                                 │
│                                                                  │
│  4. Click "Build"                                                │
│     └─> Generates Rust project with parameter schemas            │
│     └─> Runs cargo build                                         │
│     └─> Outputs binary path                                      │
│                                                                  │
│  5. Test in Console                                              │
│     └─> Console runs compiled binary                             │
│     └─> User chats with agent                                    │
│     └─> Agent calls function → executes user's code              │
└─────────────────────────────────────────────────────────────────┘
```

## Function Tool Configuration

### UI Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Function name (valid Rust identifier) |
| `description` | string | Description for LLM to understand when to use |
| `parameters` | array | List of parameters with name, type, description, required |
| `code` | string | User's Rust code (function body) |

### Example Configuration

```json
{
  "type": "function",
  "name": "calculate_tax",
  "description": "Calculate tax amount and net income",
  "parameters": [
    { "name": "income", "param_type": "number", "description": "Gross income", "required": true },
    { "name": "rate", "param_type": "number", "description": "Tax rate percentage", "required": true }
  ],
  "code": "let tax = income * rate / 100.0;\nOk(json!({\"tax\": tax, \"net\": income - tax}))"
}
```

## Code Generation

### Generated Parameter Schema

For each function tool, a schema struct is generated:

```rust
#[derive(serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
struct CalculateTaxArgs {
    /// Gross income
    income: f64,
    /// Tax rate percentage
    rate: f64,
}
```

### Generated Function

User's code is wrapped in a proper async function:

```rust
async fn calculate_tax_fn(_ctx: Arc<dyn ToolContext>, args: Value) -> Result<Value, adk_core::AdkError> {
    // Auto-generated parameter extraction
    let income = args["income"].as_f64().unwrap_or(0.0);
    let rate = args["rate"].as_f64().unwrap_or(0.0);
    
    // User's code inserted here
    let tax = income * rate / 100.0;
    Ok(json!({"tax": tax, "net": income - tax}))
}
```

### Tool Registration with Schema

```rust
.tool(Arc::new(FunctionTool::new("calculate_tax", "...", calculate_tax_fn)
    .with_parameters_schema::<CalculateTaxArgs>()))
```

### User Code Guidelines

Users write only the function body. Available in scope:
- `args: Value` - raw JSON arguments (for advanced use)
- Parameter variables extracted by name (e.g., `income`, `rate`)
- `json!()` macro for creating return values
- `Ok(value)` for success, `Err(AdkError::Tool("message".into()))` for errors

### Example User Code Patterns

**Simple calculation:**
```rust
let result = a + b;
Ok(json!({"result": result}))
```

**With validation:**
```rust
if rate < 0.0 || rate > 100.0 {
    return Err(adk_core::AdkError::Tool("Rate must be 0-100".into()));
}
let tax = income * rate / 100.0;
Ok(json!({"tax": tax}))
```

**String manipulation:**
```rust
let greeting = format!("Hello, {}!", name);
Ok(json!({"message": greeting}))
```

## Architecture

### Build Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  UI Schema   │ ──> │   Codegen    │ ──> │ cargo build  │
│  (JSON)      │     │  (Rust src)  │     │  (binary)    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            v
                     ┌──────────────┐
                     │  main.rs     │
                     │  - schemas   │
                     │  - functions │
                     │  - agents    │
                     │  - graph     │
                     │  - main loop │
                     └──────────────┘
```

### Execution Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Console    │ ──> │   Binary     │ ──> │   Agent      │
│   (UI)       │     │   (stdin)    │     │   (LLM)      │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 v
                                          ┌──────────────┐
                                          │  Function    │
                                          │  Tool        │
                                          │  (user code) │
                                          └──────────────┘
```

## Files Modified

| File | Purpose |
|------|---------|
| `studio-ui/src/components/Canvas/Canvas.tsx` | Added code editor to function config |
| `studio-ui/src/types/project.ts` | Added `code` field to FunctionToolConfig |
| `adk-studio/src/codegen/mod.rs` | Generate real function implementations with schemas |
| `adk-studio/src/server/sse.rs` | Removed runtime fallback, require binary |
| `adk-studio/src/lib.rs` | Removed runtime and compiler modules |

## Removed Components

- `adk-studio/src/compiler/` - Runtime compilation (deleted)
- `adk-studio/src/runtime/` - Runtime execution (deleted)
- Hardcoded function patterns in runtime path

## Security Considerations

- User code runs in compiled binary on server
- No sandboxing - trust model assumes authorized users
- Future: Consider WASM compilation for isolation

## Testing

```bash
# Start studio
GOOGLE_API_KEY=your_key ./target/release/adk-studio --static ./studio-ui/dist

# Create project, add agent with function tool, build
# Then test in console or directly:
echo "Calculate tax for 50000 at 25%" | GOOGLE_API_KEY=your_key /path/to/binary
```
