import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="content-stack">
      <h2>Página no encontrada</h2>
      <p>La ruta que buscas no existe.</p>
      <Link to="/home" className="btn btn-primary">Volver al inicio</Link>
    </section>
  );
}
