import './globals.css';

export const metadata = {
  title: 'BacaPop',
  description: 'Perpustakaan online gamified',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
