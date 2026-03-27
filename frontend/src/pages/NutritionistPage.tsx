import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus } from 'lucide-react'
import { nutritionistApi } from '@/api/stats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState'
import type { User } from '@/types/user'

function PatientAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100 text-sm font-semibold text-sage-700 dark:bg-sage-900/40 dark:text-sage-300">
      {initials}
    </div>
  )
}

export default function NutritionistPage() {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')

  const { data: patients = [], isLoading } = useQuery<User[]>({
    queryKey: ['nutritionist', 'patients'],
    queryFn: nutritionistApi.patients,
  })

  const linkMutation = useMutation({
    mutationFn: () => nutritionistApi.linkPatientByEmail(email.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionist', 'patients'] })
      setEmail('')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-brand-500" />
        <h1 className="font-heading text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
          Pacientes
        </h1>
      </div>

      {/* Link patient */}
      <Card>
        <CardHeader>
          <CardTitle>Vincular paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-warm-gray-500 dark:text-warm-gray-400">
            Insira o e-mail do paciente para ter acesso aos dados alimentares dele.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@paciente.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email.trim() && linkMutation.mutate()}
            />
            <Button
              onClick={() => linkMutation.mutate()}
              disabled={!email.trim() || linkMutation.isPending}
              className="shrink-0 gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Vincular
            </Button>
          </div>
          {linkMutation.isError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Paciente não encontrado com esse e-mail.
            </p>
          )}
          {linkMutation.isSuccess && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Paciente vinculado!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Patient list */}
      <Card>
        <CardHeader>
          <CardTitle>Meus pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-warm-gray-400 dark:text-warm-gray-500">Carregando...</p>
          )}
          {!isLoading && patients.length === 0 && (
            <EmptyState
              icon={Users}
              title="Nenhum paciente vinculado"
              description="Vincule um paciente usando o e-mail acima para começar."
            />
          )}
          <ul className="divide-y divide-warm-gray-100 dark:divide-warm-gray-800">
            {patients.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-3 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center gap-3">
                  <PatientAvatar name={p.name} />
                  <div>
                    <p className="font-medium text-warm-gray-900 dark:text-warm-gray-100">
                      {p.name}
                    </p>
                    <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400">{p.email}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/nutritionist/patients/${p.id}`}>Ver refeições</Link>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
