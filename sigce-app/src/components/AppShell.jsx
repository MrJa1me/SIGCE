import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import Navbar from './Navbar';
import ConnectionStatus from './ConnectionStatus';

const STAFF_PREFIXES = ['/portal', '/login', '/oficial', '/admin'];

function isStaffRoute(pathname) {
  return STAFF_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function AppShell({ children, syncStatus }) {
  const { pathname } = useLocation();
  const { user, online } = useAuth();

  const staffShell = isStaffRoute(pathname)
    || (user && (user.role === 'official' || user.role === 'admin'));

  return (
    <div className={`app ${staffShell ? 'app-shell-staff' : 'app-shell-traveler'}`}>
      <Navbar variant={staffShell ? 'staff' : 'traveler'} />
      <ConnectionStatus online={online} syncStatus={syncStatus} />
      <main className={`main-content ${staffShell ? 'main-content-staff' : 'main-content-traveler'}`}>
        {children}
      </main>
    </div>
  );
}

export default AppShell;
