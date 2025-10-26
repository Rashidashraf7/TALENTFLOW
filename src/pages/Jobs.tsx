import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

// --- Constants ---
const PAGE_SIZE = 9;

// --- API Helper Functions ---

// Updated fetchJobs to include 'sort'
async function fetchJobs(
  page: number,
  pageSize: number,
  search: string,
  status: string,
  sort: string // Added sort parameter
): Promise<{ data: Job[], total: number, totalPages: number }> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(search && { search }),
    ...(status && { status }),
    sort, // Pass sort parameter
  });

  const response = await fetch(`/api/jobs?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch jobs');
  }
  return response.json();
}

async function saveJob(jobData: Partial<Job>): Promise<Job> {
  const method = jobData.id ? 'PATCH' : 'POST';
  const url = jobData.id ? `/api/jobs/${jobData.id}` : '/api/jobs';

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
     const errorData = await response.json().catch(() => ({})); // Try to get error details
     throw new Error(errorData.error || 'Failed to save job');
  }
  return response.json();
}

async function reorderJob(jobId: string, fromOrder: number, toOrder: number): Promise<Job> {
  const response = await fetch(`/api/jobs/${jobId}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromOrder, toOrder }),
  });

  if (!response.ok) {
     const errorData = await response.json().catch(() => ({})); // Try to get error details
     throw new Error(errorData.error || 'Failed to reorder job. Network error.');
  }
  return response.json();
}


// --- Component ---

export default function Jobs() {
  // --- State ---
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'all', 'active', 'archived'
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('order'); // Added sort state, default 'order'
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<Job> | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));

  // State to hold the current order for drag-and-drop optimistic updates
  const [jobOrder, setJobOrder] = useState<Job[]>([]);
  // Store the previous successful order for rollback
  const [previousJobOrder, setPreviousJobOrder] = useState<Job[]>([]); 

  // --- Queries & Mutations ---

  // Updated useQuery to include 'sort'
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs', currentPage, PAGE_SIZE, search, statusFilter, sort], // Added 'sort' to key
    queryFn: () => fetchJobs(currentPage, PAGE_SIZE, search, statusFilter, sort), // Pass 'sort' to fetcher
    gcTime: 1000 * 60, // Keep data fresh for 1 minute
    staleTime: 1000 * 30, // Consider data stale after 30 seconds
  });

  // Update local job order when fetched data changes
   useEffect(() => {
    if (jobsData?.data) {
      // The API now handles sorting based on the 'sort' param,
      // but we still sort locally by 'order' for drag-and-drop consistency
      // within the current page view.
      const currentViewSorted = [...jobsData.data].sort((a, b) => a.order - b.order);
      setJobOrder(currentViewSorted);
      setPreviousJobOrder(currentViewSorted); // Update backup on successful fetch
    }
  }, [jobsData]);

  const saveJobMutation = useMutation({
    mutationFn: saveJob,
    onSuccess: (savedJob) => {
      toast({
        title: 'Success',
        description: `Job "${savedJob.title}" saved.`,
      });
      setDialogOpen(false);
      setEditingJob(null);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const reorderJobMutation = useMutation({
    mutationFn: ({ jobId, fromOrder, toOrder }: { jobId: string, fromOrder: number, toOrder: number }) =>
      reorderJob(jobId, fromOrder, toOrder),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Job order saved.',
      });
      // Invalidate queries to get the potentially updated 'order' numbers from the "server"
      queryClient.invalidateQueries({ queryKey: ['jobs'] }); 
    },
    onError: (error) => {
      toast({
        title: 'Rollback!',
        description: `Failed to save order: ${error.message}. Reverting changes.`,
        variant: 'destructive',
      });
      // --- ROLLBACK IMPLEMENTATION ---
      setJobOrder(previousJobOrder); // Revert UI to the last known good state
    },
  });

  // --- Handlers ---

  const handleSaveJob = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const jobData: Partial<Job> = {
      title: title,
      slug: slug, // Added slug generation
      description: formData.get('description') as string,
      tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
      status: editingJob?.status || 'active', // Keep status if editing
      // Order assignment handled by API/DB now
    };

    if (editingJob?.id) {
      jobData.id = editingJob.id;
    }

    // Basic Validation
    if (!jobData.title) {
      toast({ title: 'Error', description: 'Title is required.', variant: 'destructive' });
      return;
    }
    // TODO: Add unique slug validation (would require checking existing slugs)

    saveJobMutation.mutate(jobData);
  };

  const handleArchive = (job: Job) => {
    saveJobMutation.mutate({
      id: job.id,
      status: job.status === 'active' ? 'archived' : 'active',
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = jobOrder.findIndex((j) => j.id === active.id);
      const newIndex = jobOrder.findIndex((j) => j.id === over.id);

      // Optimistically update the UI
      const newOrderState = arrayMove(jobOrder, oldIndex, newIndex);
      setJobOrder(newOrderState); // Update local state immediately

      const jobToMove = jobOrder[oldIndex];
      const jobAtTarget = jobOrder[newIndex];

      // Use the actual 'order' property values from the items
      reorderJobMutation.mutate({
        jobId: jobToMove.id,
        fromOrder: jobToMove.order,
        toOrder: jobAtTarget.order, // Use the order of the item it's replacing
      });
    }
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  // --- Render ---

  const totalPages = jobsData?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and organize your job listings.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) setEditingJob(null); // Clear editing state on close
            setDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingJob(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingJob?.id ? 'Edit Job' : 'Create New Job'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveJob} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingJob?.title}
                  required
                  placeholder="Senior Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={editingJob?.tags?.join(', ') || ''}
                  placeholder="Remote, Full-time, Engineering"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingJob?.description || ''}
                  rows={4}
                  placeholder="Job description..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveJobMutation.isPending}>
                  {saveJobMutation.isPending ? 'Saving...' : 'Save Job'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={(value) => {
          setStatusFilter(value === 'all' ? '' : value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {/* Added Sort Select */}
        <Select value={sort} onValueChange={(value) => {
            setSort(value);
            setCurrentPage(1); // Reset page when sort changes
        }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">Default Order</SelectItem>
            <SelectItem value="title_asc">Title (A-Z)</SelectItem>
            <SelectItem value="title_desc">Title (Z-A)</SelectItem>
            <SelectItem value="date_desc">Newest</SelectItem>
            <SelectItem value="date_asc">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading jobs...</div>
      ) : jobOrder.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No jobs found</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={jobOrder.map(j => j.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobOrder.map((job) => (
                <DraggableJobCard
                  key={job.id}
                  job={job}
                  onEdit={() => {
                    setEditingJob(job);
                    setDialogOpen(true);
                  }}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}