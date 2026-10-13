import './App.css'

function App() {
  const isExtension = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)

  return (
    <main className="panel">
      <header className="panel-header">
        <div className="brand-mark" aria-hidden="true">S</div>
        <div>
          <p className="eyebrow">YOUR BROWSER, IN FOCUS</p>
          <h1>SKOPE</h1>
        </div>
        <span className="version">0.1</span>
      </header>
      <section className="welcome-card">
        <span className="welcome-icon" aria-hidden="true">◈</span>
        <h2>{isExtension ? 'Workspace foundation is ready' : 'Open SKOPE in Chrome'}</h2>
        <p>
          {isExtension
            ? 'The extension is installed. Workspace and tab group management will be available in the next release.'
            : 'This panel needs Chrome extension APIs. Build the project and load the dist folder from chrome://extensions.'}
        </p>
      </section>
      {!isExtension && <code>npm run build</code>}
      <footer>Private by design · Stored on this device</footer>
    </main>
  )
}

export default App
