"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./KeyboardVisualizer.module.css";

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class VisualizerErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Keyboard visualizer failed to render", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={styles.errorFallback} role="alert">
          <p>3D preview unavailable.</p>
          <span>The switch presets and layer controls are still available.</span>
        </div>
      );
    }
    return this.props.children;
  }
}
