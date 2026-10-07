import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  FolderArchive, 
  UploadCloud, 
  BarChart3, 
  BookOpen, 
  FileText, 
  ShieldCheck, 
  User, 
  GraduationCap
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  userRole 
}) {
  const roleDisplayNames = {
    dosen: 'Dosen / Tendik',
    asesor: 'Asesor / Auditor',
    admin_mutu: 'Admin Mutu (LPM)',
    super_admin: 'Super Admin'
  };

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

      {/* Role Pill Badge from Image 2 */}
      {!isCollapsed && (
        <div className="sidebar-role-badge-wrap">
          <span className="role-pill-badge">
            <ShieldCheck size={12} />
            {roleDisplayNames[userRole] || 'Ka. Prodi'}
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

          {(userRole === 'admin_mutu' || userRole === 'super_admin' || userRole === 'asesor') && (
            <button 
              className={`sidebar-nav-item ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
              title="Upload Dokumen"
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

      {/* Sidebar Footer User Info from Image 2 */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-user-name" title="Dhany Faizal Racma, S.Kom., M.Kom.">
            Dhany Faizal Racma, S.Kom., M.Kom.
          </div>
          <div className="sidebar-user-nidn">
            NIDN: 0624038601
          </div>
        </div>
      )}
    </aside>
  );
}
