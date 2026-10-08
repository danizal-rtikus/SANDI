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
import AdminLoginModal from './components/AdminLoginModal';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // 2 Peran: 'user' (User Biasa) dan 'admin' (Administrator terautentikasi Supabase)
  const [userRole, setUserRole] = useState('user');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

  // Sinkronisasi Sesi Supabase Auth saat inisialisasi
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          setUserRole('admin');
        } else {
          setCurrentUser(null);
          setUserRole('user');
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      }
    };

    initAuth();

    // Listener perubahan status auth (login / logout / token refreshed)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        setUserRole('admin');
      } else {
        setCurrentUser(null);
        setUserRole('user');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

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

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setUserRole('admin');
    showToast(`Berhasil masuk sebagai Administrator (${user.email || 'Admin'})`);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setCurrentUser(null);
    setUserRole('user');
    if (activeTab === 'upload') {
      setActiveTab('archive');
    }
    showToast('Berhasil keluar. Anda kini berada di mode User Biasa.');
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
      {/* SIRENA Left Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        userRole={userRole}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <div className="sirena-main-container">
        {/* SIRENA Top Bar dengan 2 Role & Tombol Masuk Admin */}
        <Topbar 
          onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
          theme={theme}
          onToggleTheme={toggleTheme}
          userRole={userRole}
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
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
            userRole === 'admin' ? (
              <IngestionUploader 
                onShowToast={showToast}
                onDocumentUploaded={() => setActiveTab('archive')}
              />
            ) : (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <div 
                  style={{
                    maxWidth: '480px',
                    margin: '0 auto',
                    background: 'var(--surface-color)',
                    padding: '2.5rem 2rem',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--card-shadow)'
                  }}
                >
                  <ShieldAlert size={48} color="var(--primary-purple)" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                    Akses Khusus Administrator
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-subtle)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                    Halaman unggah dokumen SPMI hanya dapat diakses oleh peran Administrator dengan akun Supabase yang sah.
                  </p>
                  <button 
                    className="btn-purple-primary"
                    onClick={() => setIsLoginModalOpen(true)}
                    style={{ margin: '0 auto' }}
                  >
                    Masuk sebagai Admin
                  </button>
                </div>
              </div>
            )
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

      {/* Admin Login Modal (Supabase Auth) */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

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
