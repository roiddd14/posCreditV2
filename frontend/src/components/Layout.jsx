import Sidebar from "./Sidebar";

function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-orange-50/30 dark:bg-neutral-800 flex-col lg:flex-row">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        {children}
      </div>

    </div>
  );
}

export default Layout;
