import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="card" data-testid="not-found-page">
      <h1>Page not found</h1>
      <p>
        <Link to="/" data-testid="not-found-home-link">
          Back to home
        </Link>
      </p>
    </section>
  );
}
