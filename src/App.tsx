/**
 * Chess App
 * Main application component
 */

import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { ChessGame } from '@/pages/ChessGame'

function ErrorFallback({ error }: FallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-4">
      <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-red-600">Oops! Something went wrong</h2>
        <p className="mb-4 text-gray-700">
          The game encountered an error. Please refresh the page to try again.
        </p>
        <details className="rounded bg-gray-100 p-4">
          <summary className="cursor-pointer font-semibold text-gray-800">Error details</summary>
          <pre className="mt-2 overflow-auto text-xs text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</pre>
        </details>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 w-full rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
        >
          Reload Game
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ChessGame />
    </ErrorBoundary>
  )
}
