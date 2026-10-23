import { Component, type ReactNode } from "react";

interface Props {
  onReset(): void;
  children: ReactNode;
}

export class InstrumentErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="error-panel" role="alert">
        <h2>Something went wrong</h2>
        <p>Your saved rules are safe. Resetting clears only the rule you were working on.</p>
        <button
          type="button"
          onClick={() => {
            this.props.onReset();
            this.setState({ failed: false });
          }}
        >
          Reset to default rule
        </button>
      </div>
    );
  }
}
