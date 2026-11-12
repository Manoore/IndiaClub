import React from "react";

/**
 * If a page throws while rendering, show a short message instead of a blank screen.
 * `resetKey` (the current path) clears the error when the visitor moves to another page.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Visible in the browser console for troubleshooting
    console.error("[ICGD] Page error:", error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-24 bg-[#fdf8f1]" data-testid="error-boundary">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl text-[#8B1A1A] mb-3">Something went wrong</h1>
          <p className="text-stone-600 mb-6">
            Sorry, this page ran into a problem. Nothing you entered was charged. Please reload and try again.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium">
              Reload page
            </button>
            <a href="/" className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] rounded-md text-sm font-medium">Home</a>
          </div>
        </div>
      </div>
    );
  }
}
