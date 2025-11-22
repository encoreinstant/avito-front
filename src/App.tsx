import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import ListPage from "./pages/ListPage";
import ItemPage from "./pages/ItemPage";
import StatsPage from "./pages/StatsPage";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? "bg-blue-600 text-white shadow-md"
      : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
  }`;

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl px-6 py-6 mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center text-lg font-bold text-white bg-blue-600 h-11 w-11 rounded-2xl">
              A
            </div>
            <div>
              <p className="text-base font-semibold">Система модерации</p>
              <p className="text-sm text-slate-500">Авито</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/list" className={navLinkClass}>
              Список
            </NavLink>
            <NavLink to="/stats" className={navLinkClass}>
              Статистика
            </NavLink>
          </nav>
        </header>

        <main className="mt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/list" replace />} />
        <Route path="list" element={<ListPage />} />
        <Route path="item/:id" element={<ItemPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="*" element={<Navigate to="/list" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
