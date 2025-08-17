import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiBell, FiMessageSquare, FiUser, FiSearch } from "react-icons/fi";

export default function TopNav() {
  const [query, setQuery] = useState("");
  const location = useLocation();

  return (
    <header className="topnav">
      <div className="topnav-inner">
        {/* Branding / Logo */}
        <Link to="/home" className="brand">
          <span className="brand-dot" />
          <span>SocialPro</span>
        </Link>

        {/* Búsqueda centrada */}
        <div className="search-wrap" role="search">
          <span className="search-icon" aria-hidden><FiSearch /></span>
          <input
            className="search-input"
            type="search"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar"
          />
        </div>

        {/* Acciones rápidas */}
        <nav className="quick-actions" aria-label="Acciones rápidas">
          <Link
            to="/notifications"
            className={`qa-link ${location.pathname === "/notifications" ? "active" : ""}`}
            title="Notificaciones"
          >
            <FiBell size={20} />
          </Link>
          <Link
            to="/messages"
            className={`qa-link ${location.pathname === "/messages" ? "active" : ""}`}
            title="Mensajes"
          >
            <FiMessageSquare size={20} />
          </Link>
          <Link
            to="/profile"
            className={`qa-link ${location.pathname === "/profile" ? "active" : ""}`}
            title="Perfil"
          >
            <FiUser size={20} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
