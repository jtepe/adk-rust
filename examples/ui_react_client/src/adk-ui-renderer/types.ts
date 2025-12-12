export type Component =
    // Atoms
    | { type: 'text'; id?: string; content: string; variant?: TextVariant }
    | { type: 'button'; id?: string; label: string; action_id: string; variant?: ButtonVariant; disabled?: boolean }
    | { type: 'icon'; id?: string; name: string; size?: number }
    | { type: 'image'; id?: string; src: string; alt?: string }
    | { type: 'badge'; id?: string; label: string; variant?: BadgeVariant }
    // Inputs
    | { type: 'text_input'; id?: string; name: string; label: string; placeholder?: string; required?: boolean; default_value?: string; error?: string }
    | { type: 'number_input'; id?: string; name: string; label: string; min?: number; max?: number; step?: number; required?: boolean; error?: string }
    | { type: 'select'; id?: string; name: string; label: string; options: SelectOption[]; required?: boolean; error?: string }
    | { type: 'multi_select'; id?: string; name: string; label: string; options: SelectOption[]; required?: boolean }
    | { type: 'switch'; id?: string; name: string; label: string; default_checked?: boolean }
    | { type: 'date_input'; id?: string; name: string; label: string; required?: boolean }
    | { type: 'slider'; id?: string; name: string; label: string; min?: number; max?: number; step?: number; default_value?: number }
    // Layouts
    | { type: 'stack'; id?: string; direction: 'horizontal' | 'vertical'; children: Component[]; gap?: number }
    | { type: 'grid'; id?: string; columns: number; children: Component[]; gap?: number }
    | { type: 'card'; id?: string; title?: string; description?: string; content: Component[]; footer?: Component[] }
    | { type: 'container'; id?: string; children: Component[]; padding?: number }
    | { type: 'divider' }
    | { type: 'tabs'; id?: string; tabs: Tab[] }
    // Data Display
    | { type: 'table'; id?: string; columns: TableColumn[]; data: Record<string, unknown>[] }
    | { type: 'list'; id?: string; items: string[]; ordered?: boolean }
    | { type: 'key_value'; id?: string; pairs: KeyValuePair[] }
    | { type: 'code_block'; id?: string; code: string; language?: string }
    // Visualizations
    | { type: 'chart'; id?: string; title?: string; kind: ChartKind; data: Record<string, unknown>[]; x_key: string; y_keys: string[] }
    // Feedback
    | { type: 'alert'; id?: string; title: string; description?: string; variant?: AlertVariant }
    | { type: 'progress'; id?: string; value: number; label?: string };

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'code';
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'error' | 'secondary' | 'outline';
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';
export type ChartKind = 'bar' | 'line' | 'area' | 'pie';

export interface SelectOption {
    label: string;
    value: string;
}

export interface TableColumn {
    header: string;
    accessor_key: string;
}

export interface Tab {
    label: string;
    content: Component[];
}

export interface KeyValuePair {
    key: string;
    value: string;
}

export interface UiResponse {
    id?: string;
    theme?: 'light' | 'dark' | 'system';
    components: Component[];
}

// --- User Events (UI → Agent) ---

export type UiEvent =
    | { action: 'form_submit'; action_id: string; data: Record<string, unknown> }
    | { action: 'button_click'; action_id: string }
    | { action: 'input_change'; name: string; value: unknown }
    | { action: 'tab_change'; index: number };

export function uiEventToMessage(event: UiEvent): string {
    switch (event.action) {
        case 'form_submit':
            return `[UI Event: Form submitted]\nAction: ${event.action_id}\nData:\n${JSON.stringify(event.data, null, 2)}`;
        case 'button_click':
            return `[UI Event: Button clicked]\nAction: ${event.action_id}`;
        case 'input_change':
            return `[UI Event: Input changed]\nField: ${event.name}\nValue: ${event.value}`;
        case 'tab_change':
            return `[UI Event: Tab changed]\nIndex: ${event.index}`;
    }
}

// --- Streaming Updates (Agent → UI) ---

export type UiOperation = 'replace' | 'patch' | 'append' | 'remove';

export interface UiUpdate {
    target_id: string;
    operation: UiOperation;
    payload?: Component;
}
