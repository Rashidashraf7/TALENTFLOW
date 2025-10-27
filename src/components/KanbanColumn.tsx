"use client"

import { useDroppable } from "@dnd-kit/core"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Eye } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Candidate } from "@/lib/db"
import { cn } from "@/lib/utils"
import React from "react"

// --- Draggable Candidate Card ---
const DraggableCandidate = React.forwardRef<
  HTMLDivElement,
  {
    candidate: Candidate
    onView: () => void
    style: React.CSSProperties
    attributes: any
    listeners: any
  }
>(({ candidate, onView, style, attributes, listeners }, ref) => {
  return (
    <Card
      ref={ref}
      style={style}
      className={cn(
        "cursor-grab overflow-hidden rounded-lg border border-border/30 bg-card shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 ease-in-out",
        "touch-none",
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{candidate.name}</p>
          <p className="text-xs text-muted-foreground/70 truncate mt-1">{candidate.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onView()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          aria-label={`View ${candidate.name}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
})
DraggableCandidate.displayName = "DraggableCandidate"

const SortableCandidate = ({
  candidate,
  onViewCandidate,
}: {
  candidate: Candidate
  onViewCandidate: (id: string) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 250ms ease, opacity 250ms ease",
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : ("auto" as const),
  }

  return (
    <DraggableCandidate
      ref={setNodeRef}
      candidate={candidate}
      onView={() => onViewCandidate(candidate.id)}
      style={style}
      attributes={attributes}
      listeners={listeners}
    />
  )
}

// --- Kanban Column ---
export function KanbanColumn({
  id,
  title,
  candidates,
  onViewCandidate,
}: {
  id: string
  title: string
  candidates: Candidate[]
  onViewCandidate: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl bg-muted/30 backdrop-blur-xs",
        "p-4 w-[340px] max-w-sm min-h-[500px] mx-3",
        "border border-border/30 shadow-xs hover:shadow-sm transition-all",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
        <span className="rounded-full bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary/80">
          {candidates.length}
        </span>
      </div>

      {/* Candidate List */}
      <div className="flex-grow space-y-2 overflow-y-auto pr-1 pb-1 custom-scrollbar">
        {candidates.map((candidate) => (
          <SortableCandidate key={candidate.id} candidate={candidate} onViewCandidate={onViewCandidate} />
        ))}

        {/* Empty State */}
        {candidates.length === 0 && (
          <div
            className={cn(
              "flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-sm",
              isOver ? "border-primary/40 bg-primary/5 text-primary/70" : "border-border/40 text-muted-foreground/60",
            )}
          >
            {isOver ? "Release to drop" : "Drop candidates here"}
          </div>
        )}
      </div>
    </div>
  )
}
