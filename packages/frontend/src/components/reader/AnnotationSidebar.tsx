import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Annotation } from '@gutenberg-reader/shared';

interface AnnotationSidebarProps {
  annotations: Annotation[];
  isOpen: boolean;
  onClose: () => void;
  onJumpTo: (annotation: Annotation) => void;
  onUpdate: (id: string, note: string, color: string) => void;
  onDelete: (id: string) => void;
}

export const AnnotationSidebar = ({
  annotations,
  isOpen,
  onClose,
  onJumpTo,
  onUpdate,
  onDelete,
}: AnnotationSidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');

  const handleEdit = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditNote(annotation.note || '');
  };

  const handleSaveEdit = (annotation: Annotation) => {
    onUpdate(annotation.id, editNote, annotation.color);
    setEditingId(null);
    setEditNote('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNote('');
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-card border-l shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Annotations ({annotations.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Annotations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {annotations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-2">📝</div>
              <p>No annotations yet</p>
              <p className="text-sm mt-1">Select text to create one</p>
            </div>
          ) : (
            annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="border rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                {/* Highlighted Text */}
                <div
                  className="text-sm italic mb-2 p-2 rounded"
                  style={{
                    backgroundColor: annotation.color + '40', // Add transparency
                  }}
                >
                  "{annotation.selectedText}"
                </div>

                {/* Note */}
                {editingId === annotation.id ? (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Add a note..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(annotation)}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {annotation.note && (
                      <p className="text-sm mb-2">{annotation.note}</p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>{formatDate(annotation.createdAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onJumpTo(annotation)}
                        className="flex-1 text-xs"
                      >
                        Jump to
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(annotation)}
                        className="flex-1 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(annotation.id)}
                        className="flex-1 text-xs text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
