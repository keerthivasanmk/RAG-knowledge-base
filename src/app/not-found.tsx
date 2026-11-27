export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">404 - Page Not Found</h2>
        <p className="text-xs text-slate-500">The requested page does not exist.</p>
        <a href="/" className="inline-block mt-2 text-xs text-blue-600 hover:underline">
          Return Home
        </a>
      </div>
    </div>
  );
}
