import { Component } from "react";
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main
        style={{
          maxWidth: 600,
          margin: "12vh auto",
          padding: 32,
          textAlign: "center",
        }}
      >
        <h1>A small detour.</h1>
        <p style={{ margin: "22px 0", color: "var(--muted)" }}>
          This page couldn't load. Your saved study records are still there.
        </p>
        <button
          onClick={() => location.reload()}
          style={{
            padding: "14px 22px",
            background: "var(--purple-600)",
            color: "white",
            borderRadius: 12,
          }}
        >
          Try again
        </button>
        <p style={{ marginTop: 20 }}>
          <a href="/">Back to base camp</a>
        </p>
      </main>
    ) : (
      this.props.children
    );
  }
}
