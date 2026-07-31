import UserNotificationCenter from './components/UserNotificationCenter';
import FirstTimeOnboarding from './components/FirstTimeOnboarding';

export default function DashboardLayout({children}) {
  return (
    <>
      <UserNotificationCenter />
      {children}
      <FirstTimeOnboarding />
    </>
  );
}
