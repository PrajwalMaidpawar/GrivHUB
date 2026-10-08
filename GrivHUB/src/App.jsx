import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { GrievanceProvider } from './context/GrievanceContext.jsx';
import { I18nProvider } from './i18n/i18nContext.jsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';
import { Navbar } from './components/common/Navbar.jsx';
import { Sidebar } from './components/common/Sidebar.jsx';
import { ArchitectureGuideModal } from './components/common/ArchitectureGuideModal.jsx';
import { DatasetInfoModal } from './components/common/DatasetInfoModal.jsx';

// Citizen Views
import { CitizenOverview } from './components/citizen/CitizenOverview.jsx';
import { SubmitGrievanceWizard } from './components/citizen/SubmitGrievanceWizard.jsx';
import { CitizenGrievanceDetail } from './components/citizen/CitizenGrievanceDetail.jsx';
import { MyGrievancesList } from './components/citizen/MyGrievancesList.jsx';
import { CitizenNotifications } from './components/citizen/CitizenNotifications.jsx';
import { CitizenProfile } from './components/citizen/CitizenProfile.jsx';

// Officer Views
import { OfficerOverview } from './components/officer/OfficerOverview.jsx';
import { OfficerWorkQueue } from './components/officer/OfficerWorkQueue.jsx';
import { OfficerGrievanceDetail } from './components/officer/OfficerGrievanceDetail.jsx';
import { OfficerWorkload } from './components/officer/OfficerWorkload.jsx';
import { OfficerProfile } from './components/officer/OfficerProfile.jsx';

// Admin Views
import { AdminOverview } from './components/admin/AdminOverview.jsx';
import { AdminGrievanceManagement } from './components/admin/AdminGrievanceManagement.jsx';
import { AdminClassificationReview } from './components/admin/AdminClassificationReview.jsx';
import { AdminOfficerManagement } from './components/admin/AdminOfficerManagement.jsx';
import { AdminUserManagement } from './components/admin/AdminUserManagement.jsx';
import { AdminDepartmentManagement } from './components/admin/AdminDepartmentManagement.jsx';
import { AdminJurisdictionManagement } from './components/admin/AdminJurisdictionManagement.jsx';
import { AdminRoutingManagement } from './components/admin/AdminRoutingManagement.jsx';
import { AdminAuditLogs } from './components/admin/AdminAuditLogs.jsx';
import { AdminSystemSettings } from './components/admin/AdminSystemSettings.jsx';
import { AdminMLPerformance } from './components/admin/AdminMLPerformance.jsx';
import { AdminDepartmentLoad } from './components/admin/AdminDepartmentLoad.jsx';
import { AdminAnalyticsDashboard } from './components/admin/AdminAnalyticsDashboard.jsx';
import { AdminReports } from './components/admin/AdminReports.jsx';
import { Zap } from 'lucide-react';
import { LoginPage } from './components/auth/LoginPage.jsx';
import { SignupPage } from './components/auth/SignupPage.jsx';
import { StaffLoginPage } from './components/auth/StaffLoginPage.jsx';
import { OfficerRegistrationPage } from './components/auth/OfficerRegistrationPage.jsx';
import { PendingApprovalPage } from './components/auth/PendingApprovalPage.jsx';
import { AcceptInvitationPage } from './components/auth/AcceptInvitationPage.jsx';
import { AdminStaffManagement } from './components/admin/AdminStaffManagement.jsx';

const MainAppContent = () => {
  const { currentUser, isAuthenticated, isLoading, logout } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup' | 'staff-login' | 'staff-register' | 'pending-approval' | 'accept-invitation'
  const [pendingOfficerData, setPendingOfficerData] = useState(null);
  const [invitationToken, setInvitationToken] = useState('');

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGrievanceId, setSelectedGrievanceId] = useState(null);

  // Global Modals
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);

  // Check URL params on initial load
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invitation') || params.get('token');
    if (token) {
      setInvitationToken(token);
      setAuthView('accept-invitation');
    }
  }, []);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSelectedGrievanceId(null);
  };

  const handleViewGrievance = (grievanceId) => {
    setSelectedGrievanceId(grievanceId);
  };

  const handleBackToList = () => {
    setSelectedGrievanceId(null);
  };

  // 1. Session Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-indigo-700 flex items-center justify-center text-white mb-4 animate-pulse shadow-xl">
          <Zap className="w-7 h-7 fill-amber-300 stroke-white" />
        </div>
        <p className="text-sm font-bold text-slate-200 tracking-wide">Connecting to GrievanceHUB Gateway...</p>
        <p className="text-xs text-slate-400 mt-1">Verifying authenticated session</p>
      </div>
    );
  }

  // 2. Unauthenticated Gate: Consumer Login / Signup or Staff Gateway
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return (
        <SignupPage
          onSwitchToLogin={() => setAuthView('login')}
          onSwitchToStaffRegister={() => setAuthView('staff-register')}
        />
      );
    }
    if (authView === 'staff-login') {
      return (
        <StaffLoginPage
          onSwitchToConsumerLogin={() => setAuthView('login')}
          onSwitchToStaffRegister={() => setAuthView('staff-register')}
          onShowPendingApproval={(data) => {
            setPendingOfficerData(data);
            setAuthView('pending-approval');
          }}
        />
      );
    }
    if (authView === 'staff-register') {
      return (
        <OfficerRegistrationPage
          onSwitchToStaffLogin={() => setAuthView('staff-login')}
          onRegistrationComplete={(data) => {
            setPendingOfficerData(data);
            setAuthView('pending-approval');
          }}
        />
      );
    }
    if (authView === 'pending-approval') {
      return (
        <PendingApprovalPage
          employeeId={pendingOfficerData?.employeeId}
          email={pendingOfficerData?.email}
          onBackToLogin={() => setAuthView('staff-login')}
        />
      );
    }
    if (authView === 'accept-invitation') {
      return (
        <AcceptInvitationPage
          initialToken={invitationToken}
          onBackToLogin={() => setAuthView('staff-login')}
        />
      );
    }
    return (
      <LoginPage
        onSwitchToSignup={() => setAuthView('signup')}
        onSwitchToStaffLogin={() => setAuthView('staff-login')}
      />
    );
  }

  // 3. Unapproved Officer Guard: Cannot access workspace until approved
  if (currentUser?.role === 'OFFICER' && currentUser?.approval_status === 'PENDING_APPROVAL') {
    return (
      <PendingApprovalPage
        employeeId={currentUser?.employee_id}
        email={currentUser?.email}
        onBackToLogin={logout}
      />
    );
  }

  // 3. Authenticated Workspace Content
  const renderContent = () => {
    // If a grievance is specifically selected, render its detail workspace
    if (selectedGrievanceId) {
      if (currentUser?.role === 'OFFICER') {
        return (
          <OfficerGrievanceDetail
            grievanceId={selectedGrievanceId}
            onBack={handleBackToList}
          />
        );
      } else if (currentUser?.role === 'ADMIN') {
        return (
          <OfficerGrievanceDetail
            grievanceId={selectedGrievanceId}
            onBack={handleBackToList}
          />
        );
      } else {
        return (
          <CitizenGrievanceDetail
            grievanceId={selectedGrievanceId}
            onBack={handleBackToList}
          />
        );
      }
    }

    // Role-specific screens
    if (currentUser?.role === 'CITIZEN' || currentUser?.role === 'CONSUMER') {
      switch (activeTab) {
        case 'overview':
          return (
            <CitizenOverview
              onNewGrievance={() => setActiveTab('new-grievance')}
              onViewGrievance={handleViewGrievance}
              onViewAllGrievances={() => setActiveTab('my-grievances')}
            />
          );
        case 'new-grievance':
          return (
            <SubmitGrievanceWizard
              onSuccess={(id) => {
                setSelectedGrievanceId(id);
                setActiveTab('overview');
              }}
              onCancel={() => setActiveTab('overview')}
              onViewExisting={(id) => {
                setSelectedGrievanceId(id);
              }}
            />
          );
        case 'my-grievances':
          return (
            <MyGrievancesList
              onNewGrievance={() => setActiveTab('new-grievance')}
              onViewGrievance={handleViewGrievance}
            />
          );
        case 'notifications':
          return (
            <CitizenNotifications
              onViewGrievance={handleViewGrievance}
            />
          );
        case 'profile':
          return <CitizenProfile />;
        default:
          return (
            <CitizenOverview
              onNewGrievance={() => setActiveTab('new-grievance')}
              onViewGrievance={handleViewGrievance}
              onViewAllGrievances={() => setActiveTab('my-grievances')}
            />
          );
      }
    }

    if (currentUser?.role === 'OFFICER') {
      switch (activeTab) {
        case 'overview':
          return (
            <OfficerOverview
              onViewGrievance={handleViewGrievance}
              onViewAllTasks={() => setActiveTab('work-queue')}
            />
          );
        case 'work-queue':
          return <OfficerWorkQueue onViewGrievance={handleViewGrievance} />;
        case 'workload':
          return <OfficerWorkload onViewGrievance={handleViewGrievance} />;
        case 'notifications':
          return <CitizenNotifications onViewGrievance={handleViewGrievance} />;
        case 'profile':
          return <OfficerProfile />;
        default:
          return (
            <OfficerOverview
              onViewGrievance={handleViewGrievance}
              onViewAllTasks={() => setActiveTab('work-queue')}
            />
          );
      }
    }

    if (currentUser?.role === 'ADMIN') {
      switch (activeTab) {
        case 'overview':
          return (
            <AdminOverview
              onViewGrievance={handleViewGrievance}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                setSelectedGrievanceId(null);
              }}
            />
          );
        case 'staff':
          return <AdminStaffManagement />;
        case 'analytics':
          return (
            <AdminAnalyticsDashboard
              onNavigateReports={() => {
                setActiveTab('reports');
                setSelectedGrievanceId(null);
              }}
            />
          );
        case 'reports':
          return <AdminReports />;
        case 'all-grievances':
          return <AdminGrievanceManagement onViewGrievance={handleViewGrievance} />;
        case 'classification-review':
          return <AdminClassificationReview onViewGrievance={handleViewGrievance} />;
        case 'officers':
          return <AdminOfficerManagement />;
        case 'users':
          return <AdminUserManagement />;
        case 'departments':
          return <AdminDepartmentManagement />;
        case 'jurisdictions':
          return <AdminJurisdictionManagement />;
        case 'routing':
          return <AdminRoutingManagement />;
        case 'audit-logs':
          return <AdminAuditLogs />;
        case 'settings':
          return <AdminSystemSettings />;
        case 'ml-performance':
          return (
            <AdminMLPerformance
              onOpenDatasetInfo={() => setIsDatasetModalOpen(true)}
            />
          );
        case 'department-load':
          return <AdminDepartmentLoad />;
        case 'notifications':
          return <CitizenNotifications onViewGrievance={handleViewGrievance} />;
        default:
          return (
            <AdminOverview
              onViewGrievance={handleViewGrievance}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                setSelectedGrievanceId(null);
              }}
            />
          );
      }
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* Top electricity utility navigation */}
      <Navbar
        onOpenArchGuide={() => setIsArchModalOpen(true)}
        onSelectGrievance={(id) => {
          setSelectedGrievanceId(id);
        }}
      />

      {/* Main Content Layout with Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenArchGuide={() => setIsArchModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Global Modals */}
      <ArchitectureGuideModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      <DatasetInfoModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <GrievanceProvider>
            <MainAppContent />
          </GrievanceProvider>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
