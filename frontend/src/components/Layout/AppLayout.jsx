import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout({ children, title, subtitle }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title={title} subtitle={subtitle} />
        <main className="page-container animate-fade">
          {children}
        </main>
      </div>
    </div>
  );
}
