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
          <span>Your fit controls are still available. Try reloading the page.</span>
        </div>
      );
    }
    return this.props.children;
  }
}
