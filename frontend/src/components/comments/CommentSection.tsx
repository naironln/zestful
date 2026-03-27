import { useState } from 'react'
import { Pencil, Trash2, Check, X, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import type { Comment } from '@/types/comment'

interface CommentSectionProps {
  comments: Comment[]
  onAdd?: (content: string) => Promise<unknown> | void
  onEdit?: (id: string, content: string) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
}

export default function CommentSection({
  comments,
  onAdd,
  onEdit,
  onDelete,
  isLoading,
}: CommentSectionProps) {
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const isEditable = !!onAdd

  async function handleAdd() {
    const trimmed = newText.trim()
    if (!trimmed) return
    try {
      await onAdd!(trimmed)
      setNewText('')
    } catch {
      // Keep text so the user can retry
    }
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id)
    setEditText(comment.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  function confirmEdit(id: string) {
    const trimmed = editText.trim()
    if (!trimmed) return
    onEdit!(id, trimmed)
    setEditingId(null)
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 && !isEditable && (
        <p className="text-sm italic text-warm-gray-400 dark:text-warm-gray-500">
          Sem comentários da nutricionista.
        </p>
      )}

      {comments.map((c, i) => (
        <div
          key={c.id}
          className="animate-fade-in-up space-y-1 rounded-lg border border-sage-200 bg-sage-50 p-3 dark:border-sage-800/40 dark:bg-sage-900/20"
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-warm-gray-500 dark:text-warm-gray-400">
              <MessageSquare className="h-3.5 w-3.5 text-sage-500 dark:text-sage-400" />
              <span className="font-medium text-sage-700 dark:text-sage-300">
                {c.nutritionist_name}
              </span>
              <span>·</span>
              <span>
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            {isEditable && (
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => startEdit(c)}
                  className="text-warm-gray-400 transition-colors hover:text-brand-500 dark:text-warm-gray-500 dark:hover:text-brand-400"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete!(c.id)}
                  className="text-warm-gray-400 transition-colors hover:text-red-500 dark:text-warm-gray-500 dark:hover:text-red-400"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {editingId === c.id ? (
            <div className="space-y-1.5">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full resize-none rounded border border-warm-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-warm-gray-600 dark:bg-warm-gray-800 dark:text-warm-gray-100"
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={() => confirmEdit(c.id)}
                  className="h-7 gap-1 text-xs"
                >
                  <Check className="h-3 w-3" /> Salvar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  className="h-7 gap-1 text-xs"
                >
                  <X className="h-3 w-3" /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-warm-gray-700 dark:text-warm-gray-300">
              {c.content}
            </p>
          )}
        </div>
      ))}

      {isEditable && (
        <div className="space-y-2 pt-1">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Escrever comentário..."
            rows={3}
            className="w-full resize-none rounded-lg border border-warm-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-warm-gray-600 dark:bg-warm-gray-800 dark:text-warm-gray-100"
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newText.trim() || isLoading}
            className="gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Comentar
          </Button>
        </div>
      )}
    </div>
  )
}
