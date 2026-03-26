import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mealsApi } from '@/api/meals'

export function useDeleteMeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mealsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
