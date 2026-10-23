import { Link } from "react-router";
import { INSTRUMENTS } from "./registry";

export function Home() {
  return (
    <main className="home">
      <p className="home-intro">Choose an instrument.</p>
      <ul className="instrument-list">
        {INSTRUMENTS.map((entry) => (
          <li key={entry.id}>
            <Link to={`/${entry.id}`} className="instrument-card">
              <img src={`${import.meta.env.BASE_URL}${entry.icon}`} alt="" width={48} height={48} />
              <span>
                <strong>{entry.name}</strong>
                <span>{entry.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
