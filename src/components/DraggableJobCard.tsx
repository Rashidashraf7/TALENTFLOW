import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // Removed CardDescription
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Archive, GripVertical } from 'lucide-react';
import { Job } from '@/lib/db';
import { cn } from '@/lib/utils'; // Import cn for conditional classes

interface DraggableJobCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onArchive: (job: Job) => void;
}

export function DraggableJobCard({ job, onEdit, onArchive }: DraggableJobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease', // Add default transition
    opacity: isDragging ? 0.75 : 1, // Make slightly more transparent when dragging
    zIndex: isDragging ? 10 : 'auto', // Ensure dragging item is on top
  };

  // Determine badge color based on status
  const statusBadgeVariant = job.status === 'active' ? 'default' : 'secondary';
  // Use primary color for active, maybe a green or success color if defined in theme?
  // Using 'default' for now as it maps to primary.

  return (
    <Card
      ref={setNodeRef}
      style={style}
      // Added group class for hover effects, more subtle shadow, border, consistent rounding
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow duration-200 ease-in-out hover:shadow-md",
        isDragging && "shadow-xl" // Add prominent shadow when dragging
      )}
    >
      <CardHeader className="p-4"> {/* Standardized padding */}
        <div className="flex items-start justify-between gap-4">
          {/* Title and Status */}
          <div className="flex-1">
            <CardTitle className="mb-1 text-base font-semibold leading-tight"> {/* Adjusted size/weight */}
              {job.title}
            </CardTitle>
            {/* Status Badge */}
            <Badge variant={statusBadgeVariant} > {/* Added size */}
              {job.status}
            </Badge>
          </div>
          {/* Drag Handle - Only visible on hover/focus within group */}
          <div
            {...attributes}
            {...listeners}
            // Make handle less intrusive, appear on hover/focus
            className="absolute right-1 top-1 cursor-grab rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Drag job"
            tabIndex={0} // Make it focusable
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>

      {/* Main Content */}
      <CardContent className="flex-1 px-4 pb-4"> {/* Consistent padding */}
        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {job.tags.map(tag => (
              // Use outline variant for less emphasis, smaller size
              <Badge key={tag} variant="outline"  className="font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {job.description || <span className="italic">No description provided.</span>}
        </p>
      </CardContent>

      {/* Footer Actions */}
      {/* Added border-t, adjusted padding */}
      <CardFooter className="mt-auto flex gap-2 border-t bg-muted/30 px-4 py-3">
        {/* Consistent button size and hover effects */}
        <Button
          variant="outline"
          size="sm" // Use small size for card actions
          className="flex-1 gap-1 text-xs hover:bg-accent hover:text-accent-foreground"
          onClick={() => onEdit(job)}
        >
          <Edit className="h-3 w-3" /> {/* Adjusted icon size */}
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1 text-xs hover:bg-accent hover:text-accent-foreground"
          onClick={() => onArchive(job)}
        >
          <Archive className="h-3 w-3" />
          {job.status === 'active' ? 'Archive' : 'Activate'}
        </Button>
      </CardFooter>
    </Card>
  );
}