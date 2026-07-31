import DashboardUtilities from './components/DashboardUtilities';

export default function DashboardLayout({children}) {
  return (
    <>
      <DashboardUtilities />
      {children}
    </>
  );
}
