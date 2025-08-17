import { NavLink } from "react-router-dom";
import { FaHome, FaBell, FaEnvelope, FaUser, FaUsers, FaPlus } from "react-icons/fa";

const navItems = [
  { to: "/home", label: "Inicio", icon: <FaHome size={18} /> },
  { to: "/notifications", label: "Notificaciones", icon: <FaBell size={18} /> },
  { to: "/messages", label: "Mensajes", icon: <FaEnvelope size={18} /> },
  { to: "/profile", label: "Perfil", icon: <FaUser size={18} /> },
  { to: "/groups", label: "Grupos", icon: <FaUsers size={18} /> },        // <-- listado
  { to: "/groups/new", label: "Crear grupo", icon: <FaPlus size={18} /> }, // <-- crear
];

export default function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Navegación principal">
      <ul>
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}
              end
            >
              <span className="side-ico" aria-hidden>{item.icon}</span>
              <span className="side-text">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
