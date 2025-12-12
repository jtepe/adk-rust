import React, { createContext, useContext, useRef } from 'react';
import type { Component, UiEvent } from './types';
import { AlertCircle, CheckCircle, Info, XCircle, User, Mail, Calendar } from 'lucide-react';
import Markdown from 'react-markdown';
import clsx from 'clsx';

const IconMap: Record<string, React.ComponentType<any>> = {
    'alert-circle': AlertCircle,
    'check-circle': CheckCircle,
    'info': Info,
    'x-circle': XCircle,
    'user': User,
    'mail': Mail,
    'calendar': Calendar,
};

// Context for form handling
interface FormContextValue {
    onAction?: (event: UiEvent) => void;
}

const FormContext = createContext<FormContextValue>({});

interface RendererProps {
    component: Component;
    onAction?: (event: UiEvent) => void;
}

export const Renderer: React.FC<RendererProps> = ({ component, onAction }) => {
    return (
        <FormContext.Provider value={{ onAction }}>
            <ComponentRenderer component={component} />
        </FormContext.Provider>
    );
};

const ComponentRenderer: React.FC<{ component: Component }> = ({ component }) => {
    const { onAction } = useContext(FormContext);
    const formRef = useRef<HTMLFormElement>(null);

    const handleButtonClick = (actionId: string) => {
        // Check if button is inside a form (for submit)
        if (formRef.current) {
            // Collect all form data
            const formData = new FormData(formRef.current);
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });
            onAction?.({ action: 'form_submit', action_id: actionId, data });
        } else {
            onAction?.({ action: 'button_click', action_id: actionId });
        }
    };

    switch (component.type) {
        case 'text':
            // Use Markdown for body text to render formatted content
            if (component.variant === 'body' || !component.variant) {
                return (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                        <Markdown>{component.content}</Markdown>
                    </div>
                );
            }
            const Tag = component.variant === 'h1' ? 'h1' :
                component.variant === 'h2' ? 'h2' :
                    component.variant === 'h3' ? 'h3' :
                        component.variant === 'h4' ? 'h4' :
                            component.variant === 'code' ? 'code' : 'p';
            const classes = clsx({
                'text-4xl font-bold mb-4 dark:text-white': component.variant === 'h1',
                'text-3xl font-bold mb-3 dark:text-white': component.variant === 'h2',
                'text-2xl font-bold mb-2 dark:text-white': component.variant === 'h3',
                'text-xl font-bold mb-2 dark:text-white': component.variant === 'h4',
                'font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded dark:text-gray-100': component.variant === 'code',
                'text-sm text-gray-500 dark:text-gray-400': component.variant === 'caption',
            });
            return <Tag className={classes}>{component.content}</Tag>;

        case 'button':
            const btnClasses = clsx('px-4 py-2 rounded font-medium transition-colors', {
                'bg-blue-600 text-white hover:bg-blue-700': component.variant === 'primary' || !component.variant,
                'bg-gray-200 text-gray-800 hover:bg-gray-300': component.variant === 'secondary',
                'bg-red-600 text-white hover:bg-red-700': component.variant === 'danger',
                'bg-transparent hover:bg-gray-100': component.variant === 'ghost',
                'border border-gray-300 hover:bg-gray-50': component.variant === 'outline',
                'opacity-50 cursor-not-allowed': component.disabled,
            });
            return (
                <button
                    type="button"
                    className={btnClasses}
                    disabled={component.disabled}
                    onClick={() => handleButtonClick(component.action_id)}
                >
                    {component.label}
                </button>
            );

        case 'icon':
            const Icon = IconMap[component.name] || Info;
            return <Icon size={component.size || 24} />;

        case 'alert':
            const alertClasses = clsx('p-4 rounded-md border mb-4 flex items-start gap-3', {
                'bg-blue-50 border-blue-200 text-blue-800': component.variant === 'info' || !component.variant,
                'bg-green-50 border-green-200 text-green-800': component.variant === 'success',
                'bg-yellow-50 border-yellow-200 text-yellow-800': component.variant === 'warning',
                'bg-red-50 border-red-200 text-red-800': component.variant === 'error',
            });
            const AlertIcon = component.variant === 'success' ? CheckCircle :
                component.variant === 'warning' ? AlertCircle :
                    component.variant === 'error' ? XCircle : Info;
            return (
                <div className={alertClasses}>
                    <AlertIcon className="w-5 h-5 mt-0.5" />
                    <div>
                        <div className="font-semibold">{component.title}</div>
                        {component.description && <div className="text-sm mt-1 opacity-90">{component.description}</div>}
                    </div>
                </div>
            );

        case 'card':
            // Cards with inputs become forms
            const hasInputs = component.content.some(c =>
                c.type === 'text_input' || c.type === 'number_input' || c.type === 'select' || c.type === 'switch'
            );

            const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data: Record<string, unknown> = {};
                formData.forEach((value, key) => {
                    data[key] = value;
                });
                // Find submit button action_id
                const submitBtn = [...component.content, ...(component.footer || [])].find(
                    c => c.type === 'button'
                ) as { type: 'button'; action_id: string } | undefined;
                onAction?.({
                    action: 'form_submit',
                    action_id: submitBtn?.action_id || 'form_submit',
                    data
                });
            };

            const cardContent = (
                <>
                    {(component.title || component.description) && (
                        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            {component.title && <h3 className="font-semibold text-lg dark:text-white">{component.title}</h3>}
                            {component.description && <p className="text-gray-500 dark:text-gray-400 text-sm">{component.description}</p>}
                        </div>
                    )}
                    <div className="p-4">
                        {component.content.map((child, i) => <ComponentRenderer key={i} component={child} />)}
                    </div>
                    {component.footer && (
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-2 justify-end">
                            {component.footer.map((child, i) => <ComponentRenderer key={i} component={child} />)}
                        </div>
                    )}
                </>
            );

            return hasInputs ? (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-sm overflow-hidden mb-4">
                    {cardContent}
                </form>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-sm overflow-hidden mb-4">
                    {cardContent}
                </div>
            );

        case 'stack':
            const stackClasses = clsx('flex', {
                'flex-col': component.direction === 'vertical',
                'flex-row': component.direction === 'horizontal',
            });
            return (
                <div className={stackClasses} style={{ gap: (component.gap || 4) * 4 }}>
                    {component.children.map((child, i) => <ComponentRenderer key={i} component={child} />)}
                </div>
            );

        case 'text_input':
            return (
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{component.label}</label>
                    <input
                        type="text"
                        name={component.name}
                        placeholder={component.placeholder}
                        defaultValue={component.default_value}
                        required={component.required}
                        className={clsx('w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white', {
                            'border-red-500 focus:ring-red-500 focus:border-red-500': component.error,
                        })}
                    />
                    {component.error && (
                        <p className="text-red-500 dark:text-red-400 text-sm mt-1">{component.error}</p>
                    )}
                </div>
            );

        case 'number_input':
            return (
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{component.label}</label>
                    <input
                        type="number"
                        name={component.name}
                        min={component.min}
                        max={component.max}
                        step={component.step}
                        required={component.required}
                        className={clsx('w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none', {
                            'border-red-500 focus:ring-red-500 focus:border-red-500': component.error,
                        })}
                    />
                    {component.error && (
                        <p className="text-red-500 text-sm mt-1">{component.error}</p>
                    )}
                </div>
            );

        case 'select':
            return (
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{component.label}</label>
                    <select
                        name={component.name}
                        required={component.required}
                        className={clsx('w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none', {
                            'border-red-500 focus:ring-red-500 focus:border-red-500': component.error,
                        })}
                    >
                        <option value="">Select...</option>
                        {component.options.map((opt, i) => (
                            <option key={i} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    {component.error && (
                        <p className="text-red-500 text-sm mt-1">{component.error}</p>
                    )}
                </div>
            );

        case 'switch':
            return (
                <div className="mb-3 flex items-center">
                    <input
                        type="checkbox"
                        name={component.name}
                        defaultChecked={component.default_checked}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">{component.label}</label>
                </div>
            );

        case 'multi_select':
            return (
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{component.label}</label>
                    <select
                        name={component.name}
                        multiple
                        required={component.required}
                        size={Math.min(component.options.length, 5)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                        {component.options.map((opt, i) => (
                            <option key={i} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            );

        case 'date_input':
            return (
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{component.label}</label>
                    <input
                        type="date"
                        name={component.name}
                        required={component.required}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
            );

        case 'slider':
            return (
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{component.label}</label>
                    <input
                        type="range"
                        name={component.name}
                        min={component.min}
                        max={component.max}
                        step={component.step}
                        defaultValue={component.default_value}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            );

        case 'progress':
            return (
                <div className="mb-3">
                    {component.label && <div className="text-sm text-gray-600 mb-1">{component.label}</div>}
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all"
                            style={{ width: `${component.value}%` }}
                        />
                    </div>
                </div>
            );

        case 'grid':
            return (
                <div
                    className="grid gap-4 mb-4"
                    style={{ gridTemplateColumns: `repeat(${component.columns || 2}, 1fr)` }}
                >
                    {component.children.map((child, i) => <ComponentRenderer key={i} component={child} />)}
                </div>
            );

        case 'list':
            return (
                <ul className="space-y-2 mb-4 list-disc list-inside">
                    {component.items.map((item, i) => (
                        <li key={i} className="text-gray-700">{item}</li>
                    ))}
                </ul>
            );

        case 'key_value':
            return (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                    {component.pairs.map((pair, i) => (
                        <React.Fragment key={i}>
                            <dt className="font-medium text-gray-700">{pair.key}:</dt>
                            <dd className="text-gray-900">{pair.value}</dd>
                        </React.Fragment>
                    ))}
                </dl>
            );

        case 'tabs':
            const [activeTab, setActiveTab] = React.useState(0);
            return (
                <div className="mb-4">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-4">
                            {component.tabs.map((tab, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveTab(i)}
                                    className={clsx('px-4 py-2 border-b-2 font-medium text-sm transition-colors', {
                                        'border-blue-600 text-blue-600': activeTab === i,
                                        'border-transparent text-gray-500 hover:text-gray-700': activeTab !== i,
                                    })}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="p-4">
                        {component.tabs[activeTab].content.map((child, i) =>
                            <ComponentRenderer key={i} component={child} />
                        )}
                    </div>
                </div>
            );

        case 'table':
            return (
                <div className="mb-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                            <tr>
                                {component.columns.map((col, i) => (
                                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {component.data.map((row, ri) => (
                                <tr key={ri} className="hover:bg-gray-50">
                                    {component.columns.map((col, ci) => (
                                        <td key={ci} className="px-4 py-3 text-sm text-gray-700">
                                            {String(row[col.accessor_key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

        case 'chart':
            // Simple bar chart visualization
            const maxValue = Math.max(...component.data.map(d =>
                Math.max(...component.y_keys.map(k => Number(d[k]) || 0))
            ));
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
            return (
                <div className="mb-4 p-4 bg-white border rounded-lg">
                    {component.title && <h4 className="font-semibold text-lg mb-4">{component.title}</h4>}
                    <div className="space-y-2">
                        {component.data.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 w-20 truncate">{String(d[component.x_key])}</span>
                                <div className="flex-1 flex gap-1">
                                    {component.y_keys.map((key, ki) => {
                                        const value = Number(d[key]) || 0;
                                        const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
                                        return (
                                            <div
                                                key={ki}
                                                className="h-6 rounded transition-all"
                                                style={{
                                                    width: `${width}%`,
                                                    backgroundColor: colors[ki % colors.length],
                                                    minWidth: width > 0 ? '2px' : 0
                                                }}
                                                title={`${key}: ${value}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    {component.y_keys.length > 1 && (
                        <div className="flex gap-4 mt-4 text-sm">
                            {component.y_keys.map((key, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[i % colors.length] }} />
                                    <span className="text-gray-600">{key}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );

        case 'code_block':
            return (
                <div className="mb-4">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{component.code}</code>
                    </pre>
                </div>
            );

        case 'image':
            return (
                <div className="mb-4">
                    <img
                        src={component.src}
                        alt={component.alt || ''}
                        className="max-w-full h-auto rounded-lg"
                    />
                </div>
            );

        case 'badge':
            const badgeClasses = clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', {
                'bg-gray-100 text-gray-800': component.variant === 'default' || !component.variant,
                'bg-blue-100 text-blue-800': component.variant === 'info',
                'bg-green-100 text-green-800': component.variant === 'success',
                'bg-yellow-100 text-yellow-800': component.variant === 'warning',
                'bg-red-100 text-red-800': component.variant === 'error',
                'bg-gray-200 text-gray-700': component.variant === 'secondary',
                'bg-transparent border border-gray-300 text-gray-700': component.variant === 'outline',
            });
            return <span className={badgeClasses}>{component.label}</span>;

        case 'divider':
            return <hr className="my-4 border-gray-200" />;

        case 'container':
            return (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {component.children.map((child, i) => <ComponentRenderer key={i} component={child} />)}
                </div>
            );

        default:
            return <div className="text-red-500 text-sm p-2 border border-red-200 rounded">Unknown component: {(component as any).type}</div>;
    }
};
