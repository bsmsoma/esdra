import React from "react";
import PropTypes from "prop-types";
import styles from "./ErrorBoundary.module.scss";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console for debugging
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo,
        });
    }

    handleReset = function() {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            return (
                <div className={styles.errorBoundary}>
                    <div className={styles.errorContent}>
                        <h2 className={styles.errorTitle}>Oops! Something went wrong</h2>
                        <p className={styles.errorMessage}>
                            We're sorry, but something unexpected happened. Please try refreshing the page.
                        </p>
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <details className={styles.errorDetails}>
                                <summary>Error Details (Development Only)</summary>
                                <pre className={styles.errorStack}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo && (
                                        <div>{this.state.errorInfo.componentStack}</div>
                                    )}
                                </pre>
                            </details>
                        )}
                        <div className={styles.errorActions}>
                            <button
                                className={styles.resetButton}
                                onClick={this.handleReset}
                            >
                                Try Again
                            </button>
                            <button
                                className={styles.reloadButton}
                                onClick={function() {
                                    window.location.reload();
                                }}
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node,
};

export default ErrorBoundary;
