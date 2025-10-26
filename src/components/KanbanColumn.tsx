import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Eye, GripVertical } from 'lucide-react'; // Import GripVertical
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Candidate } from '@/lib/db';

function DraggableCandidate({ candidate, onView }: { candidate: Candidate; onView: () => void }) {
  const {
    attributes, // Keep attributes for accessibility
    listeners,  // These are the drag listeners
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    // REMOVED listeners and attributes from the main Card
    <Card
      ref={setNodeRef}
      style={style}
      className="hover:shadow-md transition-shadow touch-none bg-card" // Ensure background color
    >
      {/* Moved content into a flex container */}
      <CardContent className="p-3 flex items-start gap-2">
        {/* Column 1: Main Content */}
        <div className="flex-grow space-y-1">
          <h4 className="font-medium text-sm">{candidate.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-7" // Adjusted size/padding
            onClick={onView} // Keep simple onClick, separation should fix it
          >
            <Eye className="h-3 w-3 mr-1" />
            View Profile
          </Button>
        </div>
        {/* Column 2: Drag Handle */}
        {/* Apply listeners ONLY to this handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab p-1 flex-shrink-0" // Make handle easy to grab
          aria-label="Drag handle"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export function KanbanColumn({
  id,
  title,
  candidates,
  onViewCandidate,
}: {
  id: string;
  title: string;
  candidates: Candidate[];
  onViewCandidate: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex flex-col h-full min-w-[280px]">
      <Card className={`flex-1 flex flex-col ${isOver ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>{title}</span>
            <span className="text-muted-foreground">({candidates.length})</span>
          </CardTitle>
        </CardHeader>
        {/* Still keep padding and flex-grow here */}
        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto p-2 flex-grow">
          {candidates.map((candidate) => (
            <DraggableCandidate
              key={candidate.id}
              candidate={candidate}
              onView={() => onViewCandidate(candidate.id)}
            />
          ))}
          {candidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No candidates</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}