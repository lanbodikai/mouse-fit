"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./MouseFitSimulator.module.css";

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class SimulatorErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Mouse Fit Simulator failed to render", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={styles.errorFallback} role="alert">
          <p>3D preview unavailable.</p>
          <span>Select another mouse or retry the preview.</span>
          <button type="button" onClick={() => this.setState({ failed: false })}>Retry preview</button>
        </div>
      );
    }
    return this.props.children;
  }
}
