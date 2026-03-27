import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { User, Stethoscope } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AuthLayout from '@/components/layout/AuthLayout'

const ROLES = [
  {
    value: 'patient',
    label: 'Paciente',
    description: 'Registre suas refeições e acompanhe sua alimentação',
    icon: User,
  },
  {
    value: 'nutritionist',
    label: 'Nutricionista',
    description: 'Acompanhe e oriente seus pacientes',
    icon: Stethoscope,
  },
] as const

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.access_token, data.user)
      navigate('/dashboard')
    },
    onError: (err: any) => setError(err.response?.data?.detail ?? 'Erro ao criar conta'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  return (
    <AuthLayout title="Criar conta">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300">
            Nome
          </label>
          <Input
            placeholder="Seu nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300">
            Email
          </label>
          <Input
            type="email"
            placeholder="seu@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300">
            Senha
          </label>
          <Input
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300">
            Tipo de conta
          </label>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((role) => {
              const Icon = role.icon
              const isActive = form.role === role.value
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: role.value })}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all duration-200 ${
                    isActive
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                      : 'border-warm-gray-200 hover:border-warm-gray-300 hover:bg-warm-gray-50 dark:border-warm-gray-700 dark:hover:border-warm-gray-600 dark:hover:bg-warm-gray-800'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isActive
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-warm-gray-400 dark:text-warm-gray-500'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-brand-700 dark:text-brand-300'
                        : 'text-warm-gray-600 dark:text-warm-gray-400'
                    }`}
                  >
                    {role.label}
                  </span>
                  <span className="text-[11px] leading-tight text-warm-gray-500 dark:text-warm-gray-400">
                    {role.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-warm-gray-500 dark:text-warm-gray-400">
        Já tem conta?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
        >
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
