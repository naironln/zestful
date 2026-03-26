import { useState } from 'react'
import { Pencil, Trash2, Check, X, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import type { Comment } from '@/types/comment'

interface CommentSectionProps {
  comments: Comment[]
  onAdd?: (content: string) => void
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

  function handleAdd() {
    const trimmed = newText.trim()
    if (!trimmed) return
    onAdd!(trimmed)
    setNewText('')
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
        <p className="text-sm text-gray-400 italic">Sem comentários da nutricionista.</p>
      )}

      {comments.map((c) => (
        <div key={c.id} className="rounded-lg border border-brand-100 bg-brand-50 p-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MessageSquare className="h-3.5 w-3.5 text-brand-400" />
              <span className="font-medium text-brand-700">{c.nutritionist_name}</span>
              <span>·</span>
              <span>
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            {isEditable && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => startEdit(c)}
                  className="text-gray-400 hover:text-brand-500 transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete!(c.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
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
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
              <div className="flex gap-1.5">
                <Button size="sm" onClick={() => confirmEdit(c.id)} className="gap-1 h-7 text-xs">
                  <Check className="h-3 w-3" /> Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1 h-7 text-xs">
                  <X className="h-3 w-3" /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
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
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
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
