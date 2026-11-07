import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="panel narrow">
      <h1>Page not found</h1>
      <p>This address does not match any G-Link page.</p>
      <Link className="btn" to="/">Go to the start page</Link>
    </div>
  );
}
