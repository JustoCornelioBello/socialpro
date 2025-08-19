import { NavLink } from "react-router-dom";
import { FaHome, FaBell, FaEnvelope, FaTrash, FaRobot,FaBook , FaUser, FaUsers, FaPlus, FaBookmark,FaCog, FaGamepad, FaTrophy, FaShoppingCart } from "react-icons/fa";

const navItems = [
  { to: "/home", label: "Inicio", icon: <FaHome size={18} /> },
  { to: "/notifications", label: "Notificaciones", icon: <FaBell size={18} /> },
  { to: "/messages", label: "Mensajes", icon: <FaEnvelope size={18} /> },
  { to: "/profile", label: "Perfil", icon: <FaUser size={18} /> },
  { to: "/chatbot", label: "Chatbot", icon: <FaRobot size={18} /> }, // <-- chatbot
  { to: "/groups", label: "Grupos", icon: <FaUsers size={18} /> },        // <-- listado
  { to: "/groups/new", label: "Crear grupo", icon: <FaPlus size={18} /> }, // <-- crear
  { to: "/stories", label: "Historias", icon: <FaBook size={18} /> }, // <-- historias
  { to: "/saved", label: "Guardados", icon: <FaBookmark size={18} /> }, // <-- guardados
  { to: "/settings", label: "Configuración", icon: <FaCog size={18} /> },
  { to: "/games", label: "Juegos", icon: <FaGamepad size={18} /> }, // <-- juegos
   { to: "/ranking", label: "Ranking", icon: <FaTrophy size={18} /> },
  { to: "/store", label: "Tienda", icon: <FaShoppingCart size={18} /> }, // <-- tienda
  { to: "/stories/trash", label: "Papelera de historias", icon: <FaTrash size={18} /> }, // <-- papelera de historias
  { to: "/stories/analytics", label: "Analíticas de historias", icon: <FaBook size={18} /> }, // <-- analíticas de historias
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
