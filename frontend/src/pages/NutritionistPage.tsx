import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus } from 'lucide-react'
import { nutritionistApi } from '@/api/stats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { User } from '@/types/user'

export default function NutritionistPage() {
  const queryClient = useQueryClient()
  const [patientId, setPatientId] = useState('')

  const { data: patients = [], isLoading } = useQuery<User[]>({
    queryKey: ['nutritionist', 'patients'],
    queryFn: nutritionistApi.patients,
  })

  const linkMutation = useMutation({
    mutationFn: () => nutritionistApi.linkPatient(patientId.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionist', 'patients'] })
      setPatientId('')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-brand-500" />
        <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
      </div>

      {/* Link patient */}
      <Card>
        <CardHeader>
          <CardTitle>Vincular paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-500">
            Insira o ID do paciente para ter acesso aos dados alimentares dele.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="ID do paciente"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
            <Button
              onClick={() => linkMutation.mutate()}
              disabled={!patientId.trim() || linkMutation.isPending}
              className="gap-2 shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              Vincular
            </Button>
          </div>
          {linkMutation.isError && (
            <p className="mt-2 text-sm text-red-600">Paciente não encontrado.</p>
          )}
          {linkMutation.isSuccess && (
            <p className="mt-2 text-sm text-green-600">Paciente vinculado!</p>
          )}
        </CardContent>
      </Card>

      {/* Patient list */}
      <Card>
        <CardHeader>
          <CardTitle>Meus pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-gray-400">Carregando...</p>}
          {!isLoading && patients.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">Nenhum paciente vinculado ainda.</p>
          )}
          <ul className="divide-y">
            {patients.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.email}</p>
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
