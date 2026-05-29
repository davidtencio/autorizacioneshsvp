import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../utils/logger';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class RootErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('react_error_boundary', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-slate-50 px-6"
      >
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-800 mb-2">
            Ocurrió un error inesperado
          </h1>
          <p className="text-sm text-slate-600 mb-4">
            La aplicación encontró un problema. Recargá la página para continuar.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-4 py-2 rounded-md bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}
