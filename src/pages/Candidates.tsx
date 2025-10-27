import { useState, useEffect, useMemo } from 'react';
import { Search, Eye, Filter, Plus, List, LayoutGrid, Users2, Loader2 } from 'lucide-react'; // Added icons
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card'; // Added CardHeader import
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription, // Import Description
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { Candidate, Job } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { KanbanColumn } from '@/components/KanbanColumn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';

// Constants for stages and colors (centralized)
const stages = [
  { value: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-800 border-blue-200', ringColor: 'ring-blue-500' },
  { value: 'screen', label: 'Screening', color: 'bg-purple-100 text-purple-800 border-purple-200', ringColor: 'ring-purple-500' },
  { value: 'tech', label: 'Technical', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', ringColor: 'ring-yellow-500' },
  { value: 'offer', label: 'Offer', color: 'bg-green-100 text-green-800 border-green-200', ringColor: 'ring-green-500' },
  { value: 'hired', label: 'Hired', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', ringColor: 'ring-emerald-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', ringColor: 'ring-red-500' },
];
const getStageStyle = (stageValue: string) => stages.find(s => s.value === stageValue);

// --- API Functions (remain the same) ---
async function fetchCandidates(stage: string): Promise<{ data: Candidate[], total: number }> {
  const params = new URLSearchParams({ pageSize: '1000', ...(stage !== 'all' && { stage }) });
  const response = await fetch(`/api/candidates?${params}`);
  if (!response.ok) throw new Error('Failed to fetch candidates');
  const data = await response.json();
  return { data: Array.isArray(data.data) ? data.data : [], total: data.total || 0 };
}
async function fetchActiveJobs(): Promise<Job[]> {
  const params = new URLSearchParams({ status: 'active', pageSize: '100' });
  const response = await fetch(`/api/jobs?${params}`);
  if (!response.ok) throw new Error('Failed to fetch active jobs');
  const data = await response.json();
  return data.data || [];
}
async function updateCandidateStage(candidateId: string, newStage: string) {
 const response = await fetch(`/api/candidates/${candidateId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: newStage }) });
 if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || 'Failed to update candidate stage'); }
 return response.json();
}
async function createCandidate(candidateData: { name: string; email: string; jobId: string }) {
 const response = await fetch('/api/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(candidateData) });
 if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || 'Failed to create candidate'); }
 return response.json();
}
// --- End API Functions ---


// --- UI Components ---

// Empty State Component
const EmptyState = ({ message, action }: { message: string, action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center h-[400px]">
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
      <Users2 className="h-10 w-10 text-muted-foreground" />
    </div>
    <h2 className="text-xl font-semibold tracking-tight mb-2">No Candidates Found</h2>
    <p className="text-muted-foreground mb-4">{message}</p>
    {action}
  </div>
);

// Loading State Component (List View)
const ListLoadingSkeleton = () => (
  <div className="space-y-2 p-2">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 p-4 h-[75px]">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-60" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

// Loading State Component (Kanban View)
const KanbanLoadingSkeleton = () => (
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
         <Card key={stage.value} className="flex-1 flex flex-col min-w-[280px]">
            <CardHeader className="pb-3 flex-shrink-0">
               <Skeleton className="h-5 w-2/3" />
            </CardHeader>
            <CardContent className="space-y-2 p-2 flex-grow">
               <Skeleton className="h-20 w-full" />
               <Skeleton className="h-20 w-full" />
               <Skeleton className="h-20 w-full" />
            </CardContent>
         </Card>
      ))}
   </div>
);


export default function Candidates() {
  // --- State & Hooks (remain mostly the same) ---
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const parentRef = useState<HTMLDivElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 }}));

  // --- Queries (remain the same) ---
  const { data: candidatesData, isLoading: isLoadingCandidates } = useQuery({ queryKey: ['candidates', stageFilter], queryFn: () => fetchCandidates(stageFilter) });
  const candidates = candidatesData?.data || [];
  const { data: activeJobs, isLoading: isLoadingJobs } = useQuery({ queryKey: ['activeJobs'], queryFn: fetchActiveJobs });

  // --- Mutations (remain the same) ---
  const stageMutation = useMutation({
    mutationFn: ({ candidateId, newStage }: { candidateId: string, newStage: string }) => updateCandidateStage(candidateId, newStage),
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
        toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
        queryClient.invalidateQueries({ queryKey: ['candidates', stageFilter] });
     }
   });
  const createCandidateMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: (newCandidate) => {
        toast({ title: 'Success', description: `Candidate ${newCandidate.name} created.` });
        setIsAddDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
     },
    onError: (error) => {
        toast({ title: 'Error creating candidate', description: (error as Error).message, variant: 'destructive' });
     }
   });

  // --- Handlers (remain the same) ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const candidateId = active.id as string;
    const newStage = over.id as string;
    const currentCandidate = candidates.find(c => c.id === candidateId);
    if (currentCandidate && currentCandidate.stage !== newStage) {
      stageMutation.mutate({ candidateId, newStage });
    }
  };
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

  // --- Memos ---
  // Explicitly type filteredCandidates
  const filteredCandidates: Candidate[] = useMemo(() => {
    const allCandidates = candidates || [];
    if (!search) {
      return allCandidates;
    }
    const searchLower = search.toLowerCase();
    return allCandidates.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.email.toLowerCase().includes(searchLower)
    );
  }, [candidates, search]);

  const candidatesByStage = useMemo(() => {
    return stages.reduce((acc, stage) => {
      acc[stage.value] = filteredCandidates.filter(c => c.stage === stage.value);
      return acc;
    }, {} as Record<string, Candidate[]>);
  }, [filteredCandidates]);

  // --- Virtualizer (remains the same) ---
  const rowVirtualizer = useVirtualizer({ count: filteredCandidates.length, getScrollElement: () => parentRef[0], estimateSize: () => 75, overscan: 10 });

  const isLoading = isLoadingCandidates || isLoadingJobs;

  return (
    <div className="space-y-8">
      {/* --- Header Section --- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage all candidates in the pipeline.
          </p>
        </div>
        {/* Button Group */}
        <div className="flex items-center gap-2 flex-wrap">
           {/* Add Candidate Dialog */}
           <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Candidate</DialogTitle>
                <DialogDescription>
                  Enter the candidate's details and select the job they applied for.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCandidateSubmit} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" name="name" required className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" name="email" type="email" required className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="jobId" className="text-right">Job</Label>
                  <Select name="jobId" required>
                    <SelectTrigger className="col-span-3">
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
                  <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={createCandidateMutation.isPending}>
                    {createCandidateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {createCandidateMutation.isPending ? 'Adding...' : 'Add Candidate'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center rounded-md border p-1 bg-muted">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="px-3"
              onClick={() => setViewMode('list')}
              aria-label="List View"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="px-3"
              onClick={() => setViewMode('kanban')}
              aria-label="Kanban View"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- Filters Row --- */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-[200px] flex-shrink-0">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by stage..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* --- Content Area --- */}
      <div>
        {isLoadingCandidates ? ( // Use isLoadingCandidates specifically here
           viewMode === 'list' ? <ListLoadingSkeleton /> : <KanbanLoadingSkeleton />
        ) : filteredCandidates.length === 0 ? (
          <EmptyState
            message={search ? 'Try adjusting your search or filters.' : 'Add your first candidate to get started.'}
            action={!search ? <Button size="sm" onClick={() => setIsAddDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Candidate</Button> : undefined}
          />
        ) : viewMode === 'list' ? (
          // List View Container
          <div ref={(el) => (parentRef[0] = el)} className="h-[600px] overflow-auto rounded-lg border bg-card">
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const candidate = filteredCandidates[virtualRow.index];
                if (!candidate) return null;
                const stageStyle = getStageStyle(candidate.stage);
                return (
                  // List Item Styling
                  <div
                    key={candidate.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                    className="flex items-center border-b px-4 transition-colors hover:bg-muted/50" // Added hover effect
                  >
                    <div className="flex flex-1 items-center justify-between gap-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {stageStyle && <Badge className={cn("text-xs", stageStyle.color)}>{stageStyle.label}</Badge>}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8" // Standardized size
                          onClick={() => navigate(`/candidates/${candidate.id}`)}
                          aria-label={`View ${candidate.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Kanban View Container
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] lg:grid-cols-6 gap-5 overflow-x-auto pb-4">
              {stages.map((stage) => (
                 <SortableContext key={stage.value} items={candidatesByStage[stage.value]?.map(c => c.id) || []} strategy={verticalListSortingStrategy}>
                    <KanbanColumn key={stage.value} id={stage.value} title={stage.label} candidates={candidatesByStage[stage.value] || []} onViewCandidate={(id) => navigate(`/candidates/${id}`)}/>
                 </SortableContext>
              ))}
            </div>
          </DndContext>
        )}
      </div>
    </div>
  );
}