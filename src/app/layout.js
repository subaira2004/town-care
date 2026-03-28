import './globals.css';

export const metadata = {
  title: 'Town Care - Pharmacy Appointment System',
  description: 'A modern token-based appointment queue system for small town pharmacies.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
