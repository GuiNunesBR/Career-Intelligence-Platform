import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (email: string, name: string, role: string, password?: string) => Promise<void>;
}

export const NewUserModal: React.FC<NewUserModalProps> = ({
  isOpen,
  onClose,
  onCreateUser,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreateUser(
        email.trim(),
        name.trim(),
        role.trim() || 'Professional',
        password.trim() || undefined
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-neutral-200 text-xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Criar Nova Conta Multi-usuário</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Inicia um Career Lake 100% isolado com sessão independente
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-medium text-neutral-700 mb-1">Nome Completo *</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Eduardo de Oliveira"
              className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-neutral-700 mb-1">E-mail Profissional *</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="carlos@empresa.com"
              className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-neutral-700 mb-1">Área / Cargo Alvo</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Head of Supply Chain & Logistics"
              className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-neutral-700 mb-1">Senha de Acesso (opcional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Padrão: CareerLake@2026 (mínimo 8 caracteres)"
              className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
            />
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Armazenada exclusivamente como hash bcrypt/argon2id seguro.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Criando...' : 'Criar Conta & Iniciar Lake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
