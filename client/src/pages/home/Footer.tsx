import { Link } from "react-router-dom";

export const Footer = () => (
  <footer className="mx-auto max-w-5xl px-4 pb-12 pt-6">
    <div className="flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
      <p>© {new Date().getFullYear()} Hilom — built in the Philippines.</p>
      <nav className="flex flex-wrap items-center gap-4">
        <a
          href="/api/docs"
          className="hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          API docs
        </a>
        <a
          href="https://github.com/tatineeeeeee/hilom"
          className="hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <Link to="/login" className="hover:text-foreground">
          Log in
        </Link>
      </nav>
    </div>
  </footer>
);
