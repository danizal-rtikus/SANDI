import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  FolderArchive, 
  UploadCloud, 
  BarChart3, 
  ShieldCheck, 
  User
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  userRole,
  currentUser 
}) {
  const isAdmin = userRole === 'admin';

  return (
    <aside className={`sirena-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header Brand */}
      <div className="sidebar-header">
        <img 
          src="/logo-sys.png" 
          alt="STIKOM Yos Sudarso" 
          style={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0 }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {!isCollapsed && (
          <div className="brand-text-block">
            <span className="brand-title-sirena">
              SANDI
            </span>
            <span className="brand-sub-sirena">
              STIKOM Yos Sudarso
            </span>
          </div>
        )}
      </div>

      {/* Role Pill Badge */}
      {!isCollapsed && (
        <div className="sidebar-role-badge-wrap">
          <span 
            className="role-pill-badge"
            style={{
              backgroundColor: isAdmin ? 'rgba(124, 58, 237, 0.12)' : 'var(--bg-tag)',
              color: isAdmin ? 'var(--primary-purple)' : 'var(--text-subtle)',
              borderColor: isAdmin ? 'rgba(124, 58, 237, 0.25)' : 'var(--border-color)'
            }}
          >
            {isAdmin ? <ShieldCheck size={12} /> : <User size={12} />}
            {isAdmin ? 'Administrator' : 'User Biasa'}
          </span>
        </div>
      )}

      {/* Navigation Groups */}
      <div className="sidebar-nav-scroll">
        {/* BERANDA */}
        <div className="nav-group-section">
          {!isCollapsed && <span className="nav-group-heading">BERANDA</span>}
          <button 
            className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            title="Dashboard Dokumen"
          >
            <LayoutDashboard size={18} />
            {!isCollapsed && <span>Dashboard</span>}
          </button>
        </div>

        {/* PENCARIAN & RAG */}
        <div className="nav-group-section">
          {!isCollapsed && <span className="nav-group-heading">PENCARIAN & RAG</span>}
          <button 
            className={`sidebar-nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
            title="Pencarian Semantik"
          >
            <Search size={18} />
            {!isCollapsed && <span>Pencarian Semantik</span>}
          </button>
        </div>

        {/* KURIKULUM & DOKUMEN SPMI */}
        <div className="nav-group-section">
          {!isCollapsed && <span className="nav-group-heading">KURIKULUM & SPMI</span>}
          <button 
            className={`sidebar-nav-item ${activeTab === 'archive' ? 'active' : ''}`}
            onClick={() => setActiveTab('archive')}
            title="Repositori Dokumen"
          >
            <FolderArchive size={18} />
            {!isCollapsed && <span>Repositori Dokumen</span>}
          </button>

          {/* Menu Upload Dokumen HANYA untuk Admin */}
          {isAdmin && (
            <button 
              className={`sidebar-nav-item ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
              title="Upload Dokumen Baru"
            >
              <UploadCloud size={18} />
              {!isCollapsed && <span>Upload Dokumen</span>}
            </button>
          )}
        </div>

        {/* AUDIT & ANALITIK */}
        <div className="nav-group-section">
          {!isCollapsed && <span className="nav-group-heading">AUDIT & ANALITIK</span>}
          <button 
            className={`sidebar-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
            title="Audit & Analitik"
          >
            <BarChart3 size={18} />
            {!isCollapsed && <span>Audit & Analitik</span>}
          </button>
        </div>
      </div>

      {/* Sidebar Footer User Info */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div 
            className="sidebar-user-name" 
            title={isAdmin ? (currentUser?.email || 'Administrator SPMI') : 'Pengguna Publik'}
            style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {isAdmin ? (currentUser?.email ? currentUser.email.split('@')[0] : 'Administrator') : 'Civitas Akademika'}
          </div>
          <div className="sidebar-user-nidn">
            {isAdmin ? 'Lembaga Penjaminan Mutu' : 'STIKOM Yos Sudarso'}
          </div>
        </div>
      )}
    </aside>
  );
}
