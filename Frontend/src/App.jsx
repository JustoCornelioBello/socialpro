import { Routes, Route, Navigate } from "react-router-dom";
import TopNav from "./components/TopNav.jsx";
import Sidebar from "./components/Sidebar.jsx";
import RightPanel from "./components/RightPanel.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Home from "./pages/Home.jsx";
import Notifications from "./pages/Notifications.jsx";
import Messages from "./pages/Messages.jsx";
import Profile from "./pages/Profile.jsx";
import NotFound from "./pages/NotFound.jsx";
import CreateGroup from "./pages/CreateGroup.jsx";
import GroupDetail from "./pages/GroupDetail.jsx";
import Games from "./pages/Games.jsx";
import Groups from "./pages/Groups.jsx";
import Settings from "./pages/Settings.jsx";
// imports de siempre...
import Saved from "./pages/Saved.jsx";
import Ranking from "./pages/Ranking.jsx";
import Store from "./pages/Store.jsx";
import Stories from "./pages/Stories.jsx";
import StoriesView from "./pages/StoriesView.jsx";
import StoriesTrash from "./pages/StoriesTrash.jsx";

export default function App() {
  return (
    <>
      {/* Navbar fijo */}
      <TopNav />

      {/* Contenedor principal (debajo del navbar) */}
      <div className="app-shell">
        {/* Sidebar izquierda */}
        <aside className="app-sidebar">
          <Sidebar />
        </aside>

        {/* Contenido central (solo esta columna scrollea) */}
        <main className="app-main">
          <Routes>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
           <Route path="/groups/new" element={<CreateGroup />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/stories/trash" element={<StoriesTrash />} />
            <Route path="/store" element={<Store />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/games" element={<Games />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/stories/view/:id" element={<StoriesView />} />
            
            <Route path="/settings" element={<Settings />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:slug" element={<GroupDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Panel derecho */}
        <aside className="app-right">
          <RightPanel />
        </aside>
      </div>
    </>
  );
}
