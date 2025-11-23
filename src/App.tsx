import { createContext, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ListPage from "./pages/ListPage";
import ItemPage from "./pages/ItemPage";
import StatsPage from "./pages/StatsPage";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? "bg-blue-600 text-white shadow-md dark:bg-blue-500"
      : "transition-colors duration-200 text-slate-700 hover:bg-blue-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-600"
  }`;

export type HotkeyIntroContextType = {
  introSeen: boolean;
  showIntro: () => void;
  hideIntro: () => void;
};

export const HotkeyIntroContext = createContext<HotkeyIntroContextType>({
  introSeen: false,
  showIntro: () => {},
  hideIntro: () => {},
});

export type Theme = "light" | "dark";
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

function AppLayout() {
  const queryClient = useQueryClient();
  const [introVisible, setIntroVisible] = useState(false);
  const [introSeen, setIntroSeen] = useState<boolean>(() => {
    return localStorage.getItem("hotkeyIntroSeen") === "1";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved as Theme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const showIntro = () => setIntroVisible(true);
  const hideIntro = () => {
    setIntroSeen(true);
    localStorage.setItem("hotkeyIntroSeen", "1");
    setIntroVisible(false);
  };

  const introContext = useMemo(
    () => ({ introSeen, showIntro, hideIntro }),
    [introSeen]
  );

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const openNewModal = () => {
    setNewCount(Math.floor(Math.random() * 4));
    setNewModalOpen(true);
  };
  const closeNewModal = () => setNewModalOpen(false);
  const refreshAds = () => {
    queryClient.invalidateQueries({ queryKey: ["ads"] });
    closeNewModal();
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <HotkeyIntroContext.Provider value={introContext}>
        <div className="min-h-screen transition-colors bg-slate-50 text-slate-900 dark:bg-[#1a1d21] dark:text-slate-50">
          <div className="max-w-6xl px-6 py-6 mx-auto">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center text-lg font-bold text-white bg-blue-600 h-11 w-11 rounded-2xl">
                  A
                </div>
                <div>
                  <p className="text-base font-semibold">
                    Система модерации Авито
                  </p>
                  <p className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                    <button
                      type="button"
                      onClick={showIntro}
                      className="px-3 py-1 text-xs font-semibold transition-colors duration-200 border rounded-full border-slate-300 text-slate-600 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      Горячие клавиши
                    </button>
                    <button
                      type="button"
                      onClick={openNewModal}
                      className="px-3 py-1 text-xs font-semibold transition-colors duration-200 border rounded-full border-slate-300 text-slate-600 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      Новые объявления
                    </button>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="px-3 py-1 text-xs font-semibold transition-colors duration-200 border rounded-full border-slate-300 text-slate-600 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      <span aria-hidden="true">
                        {theme === "dark" ? "☀️" : "🌙"}
                      </span>{" "}
                      {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                    </button>
                  </p>
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

            {introVisible && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur"
                onClick={hideIntro}
              >
                <div
                  className="w-full max-w-lg p-6 space-y-4 bg-white border shadow-2xl rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-[#1a1d21]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Горячие клавиши модератора
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Краткая инструкция по горячим клавишам:
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    <li>
                      <span className="font-semibold">A / Ф</span> — одобрить
                      объявление
                    </li>
                    <li>
                      <span className="font-semibold">D / В</span> — отклонить
                      объявление
                    </li>
                    <li>
                      <span className="font-semibold">←</span> — предыдущее
                      объявление
                    </li>
                    <li>
                      <span className="font-semibold">→</span> — следующее
                      объявление
                    </li>
                    <li>
                      <span className="font-semibold">/</span> (на списке) —
                      фокус на поиск
                    </li>
                  </ul>
                  <div className="flex justify-end">
                    <button
                      onClick={hideIntro}
                      className="px-4 py-2 text-sm font-semibold text-white transition bg-blue-600 shadow-sm rounded-xl hover:bg-blue-500 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Все понятно, готов к работе!
                    </button>
                  </div>
                </div>
              </div>
            )}
            {newModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur"
                onClick={closeNewModal}
              >
                <div
                  className="w-full max-w-md p-5 space-y-4 bg-white border shadow-2xl rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-[#1a1d21]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Новые объявления
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Имитация real-time обновления списка. Сейчас найдено{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {newCount}
                    </span>{" "}
                    новых объявлений.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Нажмите «Обновить список», чтобы перезагрузить данные. Когда появятся
                    реальные новые объявления, они будут загружены автоматически.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={closeNewModal}
                      className="px-3 py-2 text-sm font-semibold transition-colors duration-200 border rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Закрыть
                    </button>
                    <button
                      onClick={refreshAds}
                      className="px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Обновить список
                    </button>
                  </div>
                </div>
              </div>
            )}

            <main className="mt-8">
              <Outlet />
            </main>
          </div>
        </div>
      </HotkeyIntroContext.Provider>
    </ThemeContext.Provider>
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
