import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Trash2, Send } from 'lucide-react';
import type { Comment } from '../../types/budget';
import { listComments, createComment, deleteComment } from '../../api/comments';

// ---------------------------------------------------------------------------
// Relative timestamp helper
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CommentThreadProps {
  costItemId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CommentThread: React.FC<CommentThreadProps> = ({ costItemId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments whenever costItemId changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setComments([]);

    listComments(costItemId)
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [costItemId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    try {
      const newComment = await createComment(costItemId, text);
      setComments((prev) => [...prev, newComment]);
      setInputText('');
      textareaRef.current?.focus();
    } catch {
      // Silently fail — user can retry
    } finally {
      setSubmitting(false);
    }
  }, [costItemId, inputText, submitting]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (deletingId) return;
      setDeletingId(commentId);
      try {
        await deleteComment(costItemId, commentId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch {
        // Silently fail
      } finally {
        setDeletingId(null);
      }
    },
    [costItemId, deletingId],
  );

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="text-xs text-gray-400 py-2">Kommentare werden geladen...</div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400 py-2">Kommentare konnten nicht geladen werden.</div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
          <MessageCircle size={28} className="opacity-40" />
          <span className="text-xs">Noch keine Kommentare</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="group relative rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 hover:bg-gray-100/70 transition-colors"
            >
              {/* Header row: author + timestamp */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-800 truncate">
                  {comment.user_name}
                </span>
                <span className="text-[10px] text-gray-400 flex-shrink-0 tabular-nums">
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>

              {/* Comment text */}
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-snug">
                {comment.text}
              </p>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(comment.id)}
                disabled={deletingId === comment.id}
                aria-label="Kommentar löschen"
                className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  deletingId === comment.id
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
        <textarea
          ref={textareaRef}
          rows={2}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:shadow-sm transition-colors resize-none"
          placeholder="Kommentar schreiben… (Ctrl+Enter zum Senden)"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || submitting}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              inputText.trim() && !submitting
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={14} />
            Senden
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentThread;
