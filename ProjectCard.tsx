import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'FieldOps — Research Manager',
  description: 'Small-plot herbicide research project dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="ml-[220px] min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
