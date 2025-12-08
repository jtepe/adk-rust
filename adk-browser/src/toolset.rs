//! Browser toolset that provides all browser tools as a collection.

use crate::session::BrowserSession;
use crate::tools::*;
use adk_core::{ReadonlyContext, Result, Tool, Toolset};
use async_trait::async_trait;
use std::sync::Arc;

/// A toolset that provides all browser automation tools.
///
/// Use this to add all browser tools to an agent at once, or use
/// individual tools for more control.
pub struct BrowserToolset {
    browser: Arc<BrowserSession>,
    /// Include navigation tools (navigate, back, forward, refresh)
    include_navigation: bool,
    /// Include interaction tools (click, type, select)
    include_interaction: bool,
    /// Include extraction tools (extract text, attributes, links, page info)
    include_extraction: bool,
    /// Include wait tools
    include_wait: bool,
    /// Include screenshot tool
    include_screenshot: bool,
    /// Include JavaScript evaluation tools
    include_js: bool,
    /// Include cookie management tools
    include_cookies: bool,
    /// Include window/tab management tools
    include_windows: bool,
    /// Include frame/iframe management tools
    include_frames: bool,
    /// Include advanced action tools (drag-drop, focus, file upload, etc.)
    include_actions: bool,
}

impl BrowserToolset {
    /// Create a new toolset with all tools enabled.
    pub fn new(browser: Arc<BrowserSession>) -> Self {
        Self {
            browser,
            include_navigation: true,
            include_interaction: true,
            include_extraction: true,
            include_wait: true,
            include_screenshot: true,
            include_js: true,
            include_cookies: true,
            include_windows: true,
            include_frames: true,
            include_actions: true,
        }
    }

    /// Enable or disable navigation tools.
    pub fn with_navigation(mut self, enabled: bool) -> Self {
        self.include_navigation = enabled;
        self
    }

    /// Enable or disable interaction tools.
    pub fn with_interaction(mut self, enabled: bool) -> Self {
        self.include_interaction = enabled;
        self
    }

    /// Enable or disable extraction tools.
    pub fn with_extraction(mut self, enabled: bool) -> Self {
        self.include_extraction = enabled;
        self
    }

    /// Enable or disable wait tools.
    pub fn with_wait(mut self, enabled: bool) -> Self {
        self.include_wait = enabled;
        self
    }

    /// Enable or disable screenshot tool.
    pub fn with_screenshot(mut self, enabled: bool) -> Self {
        self.include_screenshot = enabled;
        self
    }

    /// Enable or disable JavaScript tools.
    pub fn with_js(mut self, enabled: bool) -> Self {
        self.include_js = enabled;
        self
    }

    /// Enable or disable cookie management tools.
    pub fn with_cookies(mut self, enabled: bool) -> Self {
        self.include_cookies = enabled;
        self
    }

    /// Enable or disable window/tab management tools.
    pub fn with_windows(mut self, enabled: bool) -> Self {
        self.include_windows = enabled;
        self
    }

    /// Enable or disable frame/iframe management tools.
    pub fn with_frames(mut self, enabled: bool) -> Self {
        self.include_frames = enabled;
        self
    }

    /// Enable or disable advanced action tools.
    pub fn with_actions(mut self, enabled: bool) -> Self {
        self.include_actions = enabled;
        self
    }

    /// Get all tools as a vector (synchronous version).
    pub fn all_tools(&self) -> Vec<Arc<dyn Tool>> {
        let mut tools: Vec<Arc<dyn Tool>> = Vec::new();

        if self.include_navigation {
            tools.push(Arc::new(NavigateTool::new(self.browser.clone())));
            tools.push(Arc::new(BackTool::new(self.browser.clone())));
            tools.push(Arc::new(ForwardTool::new(self.browser.clone())));
            tools.push(Arc::new(RefreshTool::new(self.browser.clone())));
        }

        if self.include_interaction {
            tools.push(Arc::new(ClickTool::new(self.browser.clone())));
            tools.push(Arc::new(DoubleClickTool::new(self.browser.clone())));
            tools.push(Arc::new(TypeTool::new(self.browser.clone())));
            tools.push(Arc::new(ClearTool::new(self.browser.clone())));
            tools.push(Arc::new(SelectTool::new(self.browser.clone())));
        }

        if self.include_extraction {
            tools.push(Arc::new(ExtractTextTool::new(self.browser.clone())));
            tools.push(Arc::new(ExtractAttributeTool::new(self.browser.clone())));
            tools.push(Arc::new(ExtractLinksTool::new(self.browser.clone())));
            tools.push(Arc::new(PageInfoTool::new(self.browser.clone())));
            tools.push(Arc::new(PageSourceTool::new(self.browser.clone())));
        }

        if self.include_wait {
            tools.push(Arc::new(WaitForElementTool::new(self.browser.clone())));
            tools.push(Arc::new(WaitTool::new()));
            tools.push(Arc::new(WaitForPageLoadTool::new(self.browser.clone())));
            tools.push(Arc::new(WaitForTextTool::new(self.browser.clone())));
        }

        if self.include_screenshot {
            tools.push(Arc::new(ScreenshotTool::new(self.browser.clone())));
        }

        if self.include_js {
            tools.push(Arc::new(EvaluateJsTool::new(self.browser.clone())));
            tools.push(Arc::new(ScrollTool::new(self.browser.clone())));
            tools.push(Arc::new(HoverTool::new(self.browser.clone())));
            tools.push(Arc::new(AlertTool::new(self.browser.clone())));
        }

        if self.include_cookies {
            tools.push(Arc::new(GetCookiesTool::new(self.browser.clone())));
            tools.push(Arc::new(GetCookieTool::new(self.browser.clone())));
            tools.push(Arc::new(AddCookieTool::new(self.browser.clone())));
            tools.push(Arc::new(DeleteCookieTool::new(self.browser.clone())));
            tools.push(Arc::new(DeleteAllCookiesTool::new(self.browser.clone())));
        }

        if self.include_windows {
            tools.push(Arc::new(ListWindowsTool::new(self.browser.clone())));
            tools.push(Arc::new(NewTabTool::new(self.browser.clone())));
            tools.push(Arc::new(NewWindowTool::new(self.browser.clone())));
            tools.push(Arc::new(SwitchWindowTool::new(self.browser.clone())));
            tools.push(Arc::new(CloseWindowTool::new(self.browser.clone())));
            tools.push(Arc::new(MaximizeWindowTool::new(self.browser.clone())));
            tools.push(Arc::new(MinimizeWindowTool::new(self.browser.clone())));
            tools.push(Arc::new(SetWindowSizeTool::new(self.browser.clone())));
        }

        if self.include_frames {
            tools.push(Arc::new(SwitchToFrameTool::new(self.browser.clone())));
            tools.push(Arc::new(SwitchToParentFrameTool::new(self.browser.clone())));
            tools.push(Arc::new(SwitchToDefaultContentTool::new(self.browser.clone())));
        }

        if self.include_actions {
            tools.push(Arc::new(DragAndDropTool::new(self.browser.clone())));
            tools.push(Arc::new(RightClickTool::new(self.browser.clone())));
            tools.push(Arc::new(FocusTool::new(self.browser.clone())));
            tools.push(Arc::new(ElementStateTool::new(self.browser.clone())));
            tools.push(Arc::new(PressKeyTool::new(self.browser.clone())));
            tools.push(Arc::new(FileUploadTool::new(self.browser.clone())));
            tools.push(Arc::new(PrintToPdfTool::new(self.browser.clone())));
        }

        tools
    }
}

#[async_trait]
impl Toolset for BrowserToolset {
    fn name(&self) -> &str {
        "browser"
    }

    async fn tools(&self, _ctx: Arc<dyn ReadonlyContext>) -> Result<Vec<Arc<dyn Tool>>> {
        Ok(self.all_tools())
    }
}

/// Helper function to create a minimal browser toolset with only essential tools.
pub fn minimal_browser_tools(browser: Arc<BrowserSession>) -> Vec<Arc<dyn Tool>> {
    vec![
        Arc::new(NavigateTool::new(browser.clone())),
        Arc::new(ClickTool::new(browser.clone())),
        Arc::new(TypeTool::new(browser.clone())),
        Arc::new(ExtractTextTool::new(browser.clone())),
        Arc::new(WaitForElementTool::new(browser.clone())),
        Arc::new(ScreenshotTool::new(browser)),
    ]
}

/// Helper function to create a read-only browser toolset (no interaction).
pub fn readonly_browser_tools(browser: Arc<BrowserSession>) -> Vec<Arc<dyn Tool>> {
    vec![
        Arc::new(NavigateTool::new(browser.clone())),
        Arc::new(ExtractTextTool::new(browser.clone())),
        Arc::new(ExtractAttributeTool::new(browser.clone())),
        Arc::new(ExtractLinksTool::new(browser.clone())),
        Arc::new(PageInfoTool::new(browser.clone())),
        Arc::new(ScreenshotTool::new(browser.clone())),
        Arc::new(ScrollTool::new(browser)),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::BrowserConfig;

    #[test]
    fn test_toolset_all_tools() {
        let browser = Arc::new(BrowserSession::new(BrowserConfig::default()));
        let toolset = BrowserToolset::new(browser);
        let tools = toolset.all_tools();

        // Should have 46 tools total
        assert!(tools.len() > 40);

        // Check some tool names exist
        let tool_names: Vec<&str> = tools.iter().map(|t| t.name()).collect();
        assert!(tool_names.contains(&"browser_navigate"));
        assert!(tool_names.contains(&"browser_click"));
        assert!(tool_names.contains(&"browser_type"));
        assert!(tool_names.contains(&"browser_screenshot"));
        // New tools
        assert!(tool_names.contains(&"browser_get_cookies"));
        assert!(tool_names.contains(&"browser_new_tab"));
        assert!(tool_names.contains(&"browser_switch_to_frame"));
        assert!(tool_names.contains(&"browser_drag_and_drop"));
    }

    #[test]
    fn test_toolset_selective() {
        let browser = Arc::new(BrowserSession::new(BrowserConfig::default()));
        let toolset = BrowserToolset::new(browser)
            .with_navigation(true)
            .with_interaction(false)
            .with_extraction(false)
            .with_wait(false)
            .with_screenshot(false)
            .with_js(false)
            .with_cookies(false)
            .with_windows(false)
            .with_frames(false)
            .with_actions(false);

        let tools = toolset.all_tools();

        // Should only have navigation tools
        assert_eq!(tools.len(), 4);
    }

    #[test]
    fn test_minimal_tools() {
        let browser = Arc::new(BrowserSession::new(BrowserConfig::default()));
        let tools = minimal_browser_tools(browser);

        assert_eq!(tools.len(), 6);
    }
}
