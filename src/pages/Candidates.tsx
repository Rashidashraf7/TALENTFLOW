import { useState, useEffect, useMemo } from 'react';
import { Search, Eye, Filter, Plus } from 'lucide-react'; // Import Plus
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Import Label
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog, // Import Dialog components
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { Candidate, Job } from '@/lib/db'; // Import Job type
import { useToast } from '@/hooks/use-toast';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { KanbanColumn } from '@/components/KanbanColumn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

const stages = [
  { value: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'screen', label: 'Screening', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'tech', label: 'Technical', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'offer', label: 'Offer', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'hired', label: 'Hired', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' },
];

// --- API Functions ---
async function fetchCandidates(stage: string): Promise<{ data: Candidate[], total: number }> {
  const params = new URLSearchParams({
    pageSize: '1000',
    ...(stage !== 'all' && { stage }),
  });
  const response = await fetch(`/api/candidates?${params}`);
  if (!response.ok) throw new Error('Failed to fetch candidates');
  const data = await response.json();
  return { data: Array.isArray(data.data) ? data.data : [], total: data.total || 0 };
}

// Fetch only active jobs for the dropdown
async function fetchActiveJobs(): Promise<Job[]> {
  const params = new URLSearchParams({ status: 'active', pageSize: '100' });
  const response = await fetch(`/api/jobs?${params}`);
  if (!response.ok) throw new Error('Failed to fetch active jobs');
  const data = await response.json();
  return data.data || [];
}

async function updateCandidateStage(candidateId: string, newStage: string) {
  const response = await fetch(`/api/candidates/${candidateId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: newStage }),
  });
  if (!response.ok) {
     const errorData = await response.json().catch(() => ({}));
     throw new Error(errorData.error || 'Failed to update candidate stage');
  }
  return response.json();
}

// NEW: API function to create a candidate
async function createCandidate(candidateData: { name: string; email: string; jobId: string }) {
  const response = await fetch('/api/candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(candidateData),
  });
  if (!response.ok) {
     const errorData = await response.json().catch(() => ({}));
     throw new Error(errorData.error || 'Failed to create candidate');
  }
  return response.json();
}

export default function Candidates() {
  // --- State ---
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false); // State for dialog
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const parentRef = useState<HTMLDivElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  // --- Queries ---
  const { data: candidatesData, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['candidates', stageFilter],
    queryFn: () => fetchCandidates(stageFilter),
  });
  const candidates = candidatesData?.data || [];

  // Fetch active jobs for the dropdown in the dialog
  const { data: activeJobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: fetchActiveJobs,
  });

  // --- Mutations ---
  const stageMutation = useMutation({
    mutationFn: ({ candidateId, newStage }: { candidateId: string, newStage: string }) =>
      updateCandidateStage(candidateId, newStage),
    onSuccess: (_, variables) => {
      toast({ title: 'Success', description: 'Candidate stage updated' });
      queryClient.setQueryData(['candidates', stageFilter], (oldData: { data: Candidate[], total: number } | undefined) => {
         if (!oldData) return oldData;
         return { ...oldData, data: oldData.data.map(c => c.id === variables.candidateId ? { ...c, stage: variables.newStage as any } : c)};
      });
      if (stageFilter !== 'all') { queryClient.invalidateQueries({ queryKey: ['candidates', 'all'] }); }
      queryClient.invalidateQueries({ queryKey: ['timeline', variables.candidateId] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey: ['candidates', stageFilter] });
    },
  });

  // NEW: Mutation for creating a candidate
  const createCandidateMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: (newCandidate) => {
      toast({ title: 'Success', description: `Candidate ${newCandidate.name} created.` });
      setIsAddDialogOpen(false); // Close dialog on success
      queryClient.invalidateQueries({ queryKey: ['candidates'] }); // Refresh candidate list
    },
    onError: (error) => {
      toast({ title: 'Error creating candidate', description: error.message, variant: 'destructive' });
    },
  });

  // --- Handlers ---
  const handleDragEnd = (event: DragEndEvent) => {
    // ... (drag logic remains the same)
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const candidateId = active.id as string;
    const newStage = over.id as string;
    const currentCandidate = candidates.find(c => c.id === candidateId);
    if (currentCandidate && currentCandidate.stage !== newStage) {
      stageMutation.mutate({ candidateId, newStage });
    }
  };

  // NEW: Handler for submitting the add candidate form
  const handleAddCandidateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const jobId = formData.get('jobId') as string;

    if (!name || !email || !jobId) {
      toast({ title: 'Missing fields', description: 'Please fill out all required fields.', variant: 'destructive' });
      return;
    }

    createCandidateMutation.mutate({ name, email, jobId });
  };

  // --- Client-side filtering ---
  const filteredCandidates = useMemo(() => {
    // ... (filtering logic remains the same)
    if (!search) return candidates;
    const searchLower = search.toLowerCase();
    return candidates.filter(c => c.name.toLowerCase().includes(searchLower) || c.email.toLowerCase().includes(searchLower));
  }, [candidates, search]);

  // --- Virtualizer ---
  const rowVirtualizer = useVirtualizer({
    // ... (virtualizer setup remains the same)
    count: filteredCandidates.length,
    getScrollElement: () => parentRef[0],
    estimateSize: () => 75,
    overscan: 10,
  });

  // --- Kanban Data ---
  const candidatesByStage = useMemo(() => {
    // ... (kanban data logic remains the same)
    return stages.reduce((acc, stage) => {
      acc[stage.value] = filteredCandidates.filter(c => c.stage === stage.value);
      return acc;
    }, {} as Record<string, Candidate[]>);
  }, [filteredCandidates]);

  const isLoading = isLoadingCandidates || isLoadingJobs; // Consider both loading states

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground mt-1">
            {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex gap-2">
          {/* --- NEW: Add Candidate Button --- */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Candidate</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCandidateSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="jobId">Apply To Job</Label>
                  <Select name="jobId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a job..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingJobs ? (
                        <SelectItem value="loading" disabled>Loading jobs...</SelectItem>
                      ) : (activeJobs || []).length === 0 ? (
                         <SelectItem value="no-jobs" disabled>No active jobs found</SelectItem>
                      ) : (
                        (activeJobs || []).map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createCandidateMutation.isPending}>
                    {createCandidateMutation.isPending ? 'Adding...' : 'Add Candidate'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          {/* --- End Add Candidate Button --- */}

          <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>List View</Button>
          <Button variant={viewMode === 'kanban' ? 'default' : 'outline'} onClick={() => setViewMode('kanban')}>Kanban View</Button>
        </div>
      </div>

      {/* --- Filters Row --- */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* ... (Search Input remains the same) ... */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email (client-side)..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"/>
        </div>
        {/* ... (Stage Select remains the same) ... */}
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((stage) => (<SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* --- List/Kanban View --- */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading candidates...</div>
      ) : viewMode === 'list' ? (
        // ... (List View rendering remains the same) ...
        <div ref={(el) => (parentRef[0] = el)} className="h-[600px] overflow-auto rounded-lg border bg-card">
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const candidate = filteredCandidates[virtualRow.index];
              if (!candidate) return null;
              const stage = stages.find((s) => s.value === candidate.stage);
              return (
                <div key={candidate.id} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }} className="px-4 border-b flex items-center">
                  <div className="flex items-center justify-between w-full py-3">
                    <div className="flex-1 min-w-0 pr-4"><h3 className="font-medium truncate">{candidate.name}</h3><p className="text-sm text-muted-foreground truncate">{candidate.email}</p></div>
                    <div className="flex items-center gap-3 flex-shrink-0">{stage && <Badge className={stage.color}>{stage.label}</Badge>}<Button variant="ghost" size="icon" onClick={() => navigate(`/candidates/${candidate.id}`)}><Eye className="h-4 w-4" /></Button></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // ... (Kanban View rendering remains the same) ...
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
               <SortableContext key={stage.value} items={candidatesByStage[stage.value]?.map(c => c.id) || []} strategy={verticalListSortingStrategy}>
                  <KanbanColumn key={stage.value} id={stage.value} title={stage.label} candidates={candidatesByStage[stage.value] || []} onViewCandidate={(id) => navigate(`/candidates/${id}`)}/>
               </SortableContext>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}