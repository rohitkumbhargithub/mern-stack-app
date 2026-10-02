import React from "react";
import { MessageCircle, RotateCcw, LogOut } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled rendering error:", error, errorInfo);
  }

  handleResetSession = () => {
    localStorage.removeItem("chat-user");
    window.location.href = "/login";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background text-foreground">
          <div className="relative w-full max-w-md p-8 rounded-3xl border border-border/80 bg-card/90 shadow-2xl backdrop-blur-xl text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <MessageCircle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                An unexpected rendering error occurred. You can reload the app or clear your local session to sign in again.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50 text-[11px] font-mono text-muted-foreground text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleResetSession}
                className="flex-1 h-10 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Reset & Log In
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
