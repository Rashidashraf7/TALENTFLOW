import { useState, useEffect } from 'react'; // Import useEffect
import { Plus, Search, Edit, Archive, Loader2 } from 'lucide-react'; // Import Loader2
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription, // Import Description
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Job } from '@/lib/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableJobCard } from '@/components/DraggableJobCard';
import { PaginationControls } from '@/components/PaginationControls';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// --- Constants ---
const PAGE_SIZE = 9;
const DEBOUNCE_DELAY = 500; // milliseconds

// --- API Helper Functions (remain the same) ---
async function fetchJobs(
  page: number,
  pageSize: number,
  search: string,
  status: string,
  sort: string
): Promise<{ data: Job[], total: number, totalPages: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), ...(search && { search }), ...(status && { status }), sort });
  const response = await fetch(`/api/jobs?${params}`);
  if (!response.ok) throw new Error('Failed to fetch jobs');
  return response.json();
}
async function saveJob(jobData: Partial<Job>): Promise<Job> {
  const method = jobData.id ? 'PATCH' : 'POST';
  const url = jobData.id ? `/api/jobs/${jobData.id}` : '/api/jobs';
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jobData) });
  if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || 'Failed to save job'); }
  return response.json();
}
async function reorderJob(jobId: string, fromOrder: number, toOrder: number): Promise<Job> {
  const response = await fetch(`/api/jobs/${jobId}/reorder`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromOrder, toOrder }) });
  if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || 'Failed to reorder job. Network error.'); }
  return response.json();
}
// --- End API Helpers ---

// --- Job Loading Skeleton ---
const JobCardSkeleton = () => (
    <Card className="flex flex-col h-full">
        <CardHeader className="p-4">
             <Skeleton className="h-5 w-3/4 mb-1" />
             <Skeleton className="h-4 w-1/4" />
        </CardHeader>
        <CardContent className="flex-1 px-4 pb-4 space-y-2">
            <div className="flex flex-wrap gap-1">
                 <Skeleton className="h-5 w-16 rounded-full" />
                 <Skeleton className="h-5 w-20 rounded-full" />
            </div>
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-2/3" />
        </CardContent>
        <CardFooter className="mt-auto flex gap-2 border-t bg-muted/30 px-4 py-3">
             <Skeleton className="h-9 flex-1" />
             <Skeleton className="h-9 flex-1" />
        </CardFooter>
    </Card>
);
// --- End Skeleton ---


export default function Jobs() {
  // --- State ---
  const [inputValue, setInputValue] = useState(''); // Actual input value
  const [debouncedSearch, setDebouncedSearch] = useState(''); // Value used for query
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('order');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<Job> | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } })); // Added constraint

  const [jobOrder, setJobOrder] = useState<Job[]>([]);
  const [previousJobOrder, setPreviousJobOrder] = useState<Job[]>([]);

  // --- Debounce Effect ---
  useEffect(() => {
    // Set a timer to update the debounced search term
    const timerId = setTimeout(() => {
      setDebouncedSearch(inputValue);
      setCurrentPage(1); // Reset page when search term changes
    }, DEBOUNCE_DELAY);

    // Clear the timer if the input value changes before the delay is over
    return () => {
      clearTimeout(timerId);
    };
  }, [inputValue]); // Only re-run the effect if inputValue changes

  // --- Queries & Mutations ---
  const { data: jobsData, isLoading, isFetching } = useQuery({ // Use isFetching for loading indicator
    // Use debouncedSearch in the query key
    queryKey: ['jobs', currentPage, PAGE_SIZE, debouncedSearch, statusFilter, sort],
    // Pass debouncedSearch to the fetcher
    queryFn: () => fetchJobs(currentPage, PAGE_SIZE, debouncedSearch, statusFilter, sort),
    gcTime: 1000 * 60,
    staleTime: 1000 * 30,
    placeholderData: (prevData) => prevData, // Keep previous data visible while loading
  });

  useEffect(() => {
    if (jobsData?.data) {
      const currentViewSorted = [...jobsData.data].sort((a, b) => a.order - b.order);
      setJobOrder(currentViewSorted);
      setPreviousJobOrder(currentViewSorted);
    } else {
        setJobOrder([]); // Clear order if data is undefined
        setPreviousJobOrder([]);
    }
  }, [jobsData]);

  const saveJobMutation = useMutation({ mutationFn: saveJob, onSuccess: (savedJob) => { /* ... */ }, onError: (error) => { /* ... */ } });
  const reorderJobMutation = useMutation({ mutationFn: ({ jobId, fromOrder, toOrder }: { jobId: string, fromOrder: number, toOrder: number }) => reorderJob(jobId, fromOrder, toOrder), onSuccess: () => { /* ... */ }, onError: (error) => { /* ... ROLLBACK ... */ } });

  // --- Handlers ---
  const handleSaveJob = (e: React.FormEvent<HTMLFormElement>) => { /* ... (remains the same) ... */ };
  const handleArchive = (job: Job) => { /* ... (remains the same) ... */ };
  const handleDragEnd = (event: DragEndEvent) => { /* ... (remains the same) ... */ };
  const handlePageChange = (page: number) => { /* ... (remains the same) ... */ };

  // --- Render ---
  const totalPages = jobsData?.totalPages ?? 1;
  const showLoading = isLoading || isFetching; // Show loading if initial load or refetching

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* ... (Header and Add Job Dialog Trigger) ... */}
      </div>

      {/* --- Add Job Dialog (ensure DialogDescription is present) --- */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { /* ... */ }}>
        {/* ... (Dialog Trigger is above) ... */}
        <DialogContent className="sm:max-w-[625px]"> {/* Slightly wider dialog */}
           <DialogHeader>
             <DialogTitle>{editingJob?.id ? 'Edit Job' : 'Create New Job'}</DialogTitle>
             {/* Added DialogDescription */}
             <DialogDescription>
                {editingJob?.id ? 'Update the details for this job listing.' : 'Fill in the details for the new job listing.'}
             </DialogDescription>
           </DialogHeader>
           <form onSubmit={handleSaveJob} className="grid gap-4 py-4">
             {/* ... (Form fields: Title, Tags, Description) ... */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input id="title" name="title" defaultValue={editingJob?.title} required className="col-span-3"/>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="tags" className="text-right">Tags</Label>
                 <Input id="tags" name="tags" defaultValue={editingJob?.tags?.join(', ') || ''} placeholder="Comma-separated" className="col-span-3"/>
               </div>
               <div className="grid grid-cols-4 items-start gap-4">
                 <Label htmlFor="description" className="text-right pt-2">Description</Label>
                 <Textarea id="description" name="description" defaultValue={editingJob?.description || ''} rows={5} className="col-span-3"/>
               </div>
             <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
               <Button type="submit" disabled={saveJobMutation.isPending}>
                 {saveJobMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                 {saveJobMutation.isPending ? 'Saving...' : 'Save Job'}
               </Button>
             </DialogFooter>
           </form>
         </DialogContent>
      </Dialog>


      {/* --- Filters Row --- */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search jobs by title..."
              // Use inputValue for the input's value
              value={inputValue}
              // Update inputValue directly on change
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          {/* ... (Status Select and Sort Select remain the same) ... */}
           <Select value={statusFilter || 'all'} onValueChange={(value) => { setStatusFilter(value === 'all' ? '' : value); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] flex-shrink-0"> <SelectValue placeholder="Status" /> </SelectTrigger>
              <SelectContent> <SelectItem value="all">All Statuses</SelectItem> <SelectItem value="active">Active</SelectItem> <SelectItem value="archived">Archived</SelectItem> </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => { setSort(value); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] flex-shrink-0"> <SelectValue placeholder="Sort by" /> </SelectTrigger>
              <SelectContent> <SelectItem value="order">Default Order</SelectItem> <SelectItem value="title_asc">Title (A-Z)</SelectItem> <SelectItem value="title_desc">Title (Z-A)</SelectItem> <SelectItem value="date_desc">Newest</SelectItem> <SelectItem value="date_asc">Oldest</SelectItem> </SelectContent>
            </Select>
        </CardContent>
      </Card>

      {/* --- Jobs Grid --- */}
      {/* Show Skeleton Grid when loading */}
      {showLoading && !jobOrder.length ? ( // Show skeleton only on initial load or if refetching clears data
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {[...Array(PAGE_SIZE)].map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
      ) : jobOrder.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
             
             <h3 className="font-semibold mb-1">No Jobs Found</h3>
             <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
      ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={jobOrder.map(j => j.id)} strategy={rectSortingStrategy}>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {jobOrder.map((job) => (
                          <DraggableJobCard key={job.id} job={job} onEdit={() => { setEditingJob(job); setDialogOpen(true); }} onArchive={handleArchive}/>
                      ))}
                      {/* Show skeleton placeholders if refetching but still have old data */}
                      {isFetching && jobOrder.length > 0 && [...Array(PAGE_SIZE - jobOrder.length)].map((_, i) => <JobCardSkeleton key={`fetch_skel_${i}`} />) }
                  </div>
              </SortableContext>
          </DndContext>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && ( <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange}/> )}
    </div>
  );
}
