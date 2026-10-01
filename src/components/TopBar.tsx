import React, { useState } from 'react';
import { User } from '../shared/types.js';
import { ChevronDown, Plus, RefreshCw } from 'lucide-react';

interface TopBarProps {
  currentUser: User | null;
  allUsers: User[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onSwitchUser: (userId: string) => void;
  onOpenNewUserModal: () => void;
  onLogout?: () => void;
  isSyncing?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  allUsers,
  activeTab,
  onSelectTab,
  onSwitchUser,
  onOpenNewUserModal,
  onLogout,
  isSyncing,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'lake', label: 'Career Lake' },
    { id: 'analyzer', label: 'Analisar Vaga' },
    { id: 'applications', label: 'Candidaturas' },
    { id: 'job_search', label: 'Busca por Vagas' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectTab('dashboard')}
            className="text-lg font-bold tracking-tight text-neutral-900 hover:text-neutral-700 transition-colors text-left"
          >
            Career Lake
          </button>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`transition-colors whitespace-nowrap py-1 ${
                  isActive
                    ? 'text-neutral-900 border-b-2 border-neutral-900 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & User Switcher */}
        <div className="flex items-center gap-3">
          {isSyncing && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Syncing</span>
            </div>
          )}

          {/* User Session Switcher (Demonstrating Multi-User PC Isolation) */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-100 transition-colors border border-neutral-200 text-left"
              title="Trocar usuário autenticado (Sessão isolada)"
            >
              <div className="w-6 h-6 rounded bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold">
                {currentUser?.avatar || 'CL'}
              </div>
              <div className="hidden sm:block text-xs">
                <p className="font-semibold text-neutral-900 leading-tight truncate max-w-[130px]">
                  {currentUser?.name || 'Sessão Ativa'}
                </p>
                <p className="text-[10px] text-neutral-500 leading-tight truncate max-w-[130px]">
                  {currentUser?.currentRole}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-40 text-xs text-neutral-700">
                  <div className="px-3 py-2 border-b border-neutral-100">
                    <p className="font-semibold text-neutral-900">Isolamento Multi-usuário</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Dois usuários no mesmo PC possuem Career Lakes, vagas e jobs 100% independentes.
                    </p>
                  </div>

                  <div className="py-1">
                    <p className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Contas Locais Disponíveis
                    </p>
                    {allUsers.map((u) => {
                      const isCurrent = u.id === currentUser?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSwitchUser(u.id);
                            setUserMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-neutral-50 transition-colors ${
                            isCurrent ? 'bg-neutral-50 font-semibold text-neutral-900' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-5 h-5 rounded bg-neutral-200 text-neutral-800 text-[10px] flex items-center justify-center font-bold">
                              {u.avatar}
                            </span>
                            <div className="truncate">
                              <p className="truncate text-xs">{u.name}</p>
                              <p className="text-[10px] text-neutral-400 truncate">{u.currentRole}</p>
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] text-neutral-900 font-medium">Ativo</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-neutral-100 pt-1 mt-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenNewUserModal();
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-neutral-900 hover:bg-neutral-50 font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Criar Novo Usuário</span>
                    </button>
                    {onLogout && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                      >
                        <span>Sair da Sessão (Logout)</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden border-t border-neutral-100 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`whitespace-nowrap py-1 ${
              activeTab === item.id ? 'text-neutral-900 font-semibold border-b border-neutral-900' : 'text-neutral-500'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
