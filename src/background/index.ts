function configureSidePanel(): void {
  void chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error('SKOPE could not configure the side panel.', error))
}

chrome.runtime.onInstalled.addListener(configureSidePanel)
chrome.runtime.onStartup.addListener(configureSidePanel)
