import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import SirenaDashboard from './components/SirenaDashboard';
import SemanticSearch from './components/SemanticSearch';
import DocumentArchive from './components/DocumentArchive';
import IngestionUploader from './components/IngestionUploader';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SupabaseConfigGuide from './components/SupabaseConfigGuide';
import PdfViewerModal from './components/PdfViewerModal';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userRole, setUserRole] = useState('dosen');
  const [theme, setTheme] = useState(() => localStorage.getItem('sirena_theme') || 'light');
  const [toastMsg, setToastMsg] = useState(null);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');

  // PDF Viewer Modal State
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    documentId: null,
    initialPage: 1,
    query: '',
    documentTitle: '',
    initialSnippet: ''
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sirena_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  const handleOpenViewer = (documentId, pageNumber = 1, query = '', documentTitle = '', initialSnippet = '') => {
    setViewerState({
      isOpen: true,
      documentId,
      initialPage: pageNumber,
      query,
      documentTitle,
      initialSnippet
    });
  };

  const handleCloseViewer = () => {
    setViewerState(prev => ({ ...prev, isOpen: false }));
  };

  const handleDirectSearch = (query) => {
    setInitialSearchQuery(query);
    setActiveTab('search');
  };

  return (
    <div className="sirena-layout">
      {/* SIRENA Left Sidebar from Image 2 */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        userRole={userRole}
      />

      {/* Main Content Area */}
      <div className="sirena-main-container">
        {/* SIRENA Top Bar from Image 2 */}
        <Topbar 
          onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
          theme={theme}
          onToggleTheme={toggleTheme}
          userRole={userRole}
          onRoleChange={setUserRole}
          onRefresh={() => window.location.reload()}
        />

        {/* Scrollable Content Body */}
        <main className="sirena-content-scroll">
          {activeTab === 'dashboard' && (
            <SirenaDashboard 
              onNavigateTab={setActiveTab}
              onOpenViewer={handleOpenViewer}
              onDirectSearch={handleDirectSearch}
            />
          )}

          {activeTab === 'search' && (
            <SemanticSearch 
              initialQuery={initialSearchQuery}
              onOpenViewer={handleOpenViewer}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'archive' && (
            <DocumentArchive 
              onOpenViewer={handleOpenViewer}
              onShowToast={showToast}
              userRole={userRole}
            />
          )}

          {activeTab === 'upload' && (
            <IngestionUploader 
              onShowToast={showToast}
              onDocumentUploaded={() => setActiveTab('archive')}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard 
              onShowToast={showToast}
            />
          )}

          {activeTab === 'config' && (
            <SupabaseConfigGuide 
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* PDF Viewer Modal */}
      {viewerState.isOpen && (
        <PdfViewerModal 
          documentId={viewerState.documentId}
          initialPage={viewerState.initialPage}
          query={viewerState.query}
          documentTitle={viewerState.documentTitle}
          initialSnippet={viewerState.initialSnippet}
          onClose={handleCloseViewer}
          onShowToast={showToast}
        />
      )}

      {/* Global Toast Notification */}
      {toastMsg && (
        <div className="toast-notice">
          <CheckCircle2 size={16} color="var(--primary-purple)" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
