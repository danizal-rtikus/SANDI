import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SemanticSearch from './components/SemanticSearch';
import DocumentArchive from './components/DocumentArchive';
import IngestionUploader from './components/IngestionUploader';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SupabaseConfigGuide from './components/SupabaseConfigGuide';
import PdfViewerModal from './components/PdfViewerModal';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [userRole, setUserRole] = useState('dosen');
  const [theme, setTheme] = useState(() => localStorage.getItem('sandi_theme') || 'light');
  const [toastMsg, setToastMsg] = useState(null);
  
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
    localStorage.setItem('sandi_theme', theme);
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

  return (
    <div className="app-container">
      {/* Header & Navigation */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Content View */}
      <main className="main-content">
        {activeTab === 'search' && (
          <SemanticSearch 
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
          <CheckCircle2 size={16} color="var(--brand-primary)" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Institutional Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} color="var(--brand-primary)" />
            <span>
              <strong>SANDI (Sistem Arsip & Navigasi Dokumen Internal)</strong> • Lembaga Penjaminan Mutu (LPM)
            </span>
          </div>

          <div>
            STIKOM Yos Sudarso Purwokerto • Terintegrasi dengan Supabase & Google Gemini AI
          </div>
        </div>
      </footer>
    </div>
  );
}
