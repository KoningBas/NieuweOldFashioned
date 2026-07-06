import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen">
        <header className="border-b border-white/5 px-10 py-8">
          <h1 className="font-heading text-2xl">{title}</h1>
        </header>
        <main className="p-10">{children}</main>
      </div>
    </div>
  );
}
