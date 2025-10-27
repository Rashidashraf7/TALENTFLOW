import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Candidate, TimelineEvent } from '@/lib/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import query tools

const stages = [
  { value: 'applied', label: 'Applied' },
  { value: 'screen', label: 'Screening' },
  { value: 'tech', label: 'Technical' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

// --- API Functions ---
async function fetchCandidate(id: string): Promise<Candidate | null> {
  const response = await fetch(`/api/candidates/${id}`); // Use the new endpoint
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Handle not found gracefully
    }
    throw new Error('Failed to fetch candidate');
  }
  return response.json(); // It now returns the candidate object directly
}

async function fetchTimeline(id: string): Promise<TimelineEvent[]> {
  const response = await fetch(`/api/candidates/${id}/timeline`);
  if (!response.ok) throw new Error('Failed to fetch timeline');
  return response.json();
}

async function updateCandidateStage(id: string, newStage: string) {
  const response = await fetch(`/api/candidates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: newStage }),
  });
  if (!response.ok) throw new Error('Failed to update candidate stage');
  return response.json();
}

// NEW: API function to add a note
async function addNote(candidateId: string, note: string) {
  const response = await fetch(`/api/candidates/${candidateId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!response.ok) throw new Error('Failed to add note');
  return response.json();
}

// NEW: Helper to render mentions
const renderWithMentions = (text: string) => {
  const mentionRegex = /@(\w+)/g;
  const parts = text.split(mentionRegex);
  
  return parts.map((part, index) => {
    if (index % 2 === 1) { // This is a mention
      return <strong key={index} className="text-primary">@{part}</strong>;
    }
    return part; // This is regular text
  });
};

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Get query client
  const [noteText, setNoteText] = useState('');

  // --- Queries ---
  const { data: candidate, isLoading: isLoadingCandidate } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => fetchCandidate(id!),
  });

  const { data: timeline, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['timeline', id],
    queryFn: () => fetchTimeline(id!),
  });

  // --- Mutations ---
  const stageMutation = useMutation({
    mutationFn: ({ newStage }: { newStage: string }) => updateCandidateStage(id!, newStage),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Candidate stage updated' });
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', id] }); // Refresh timeline
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // NEW: Mutation for adding a note
  const noteMutation = useMutation({
    mutationFn: () => addNote(id!, noteText),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Note added' });
      setNoteText(''); // Clear the textarea
      queryClient.invalidateQueries({ queryKey: ['timeline', id] }); // Refresh timeline
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleStageChange = (newStage: string) => {
    stageMutation.mutate({ newStage });
  };

  // NEW: Handler for the add note button
  const handleAddNote = () => {
    if (noteText.trim()) {
      noteMutation.mutate();
    }
  };

  if (isLoadingCandidate || isLoadingTimeline) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!candidate) {
    return <div className="text-center py-12">Candidate not found</div>;
  }

  const currentStage = stages.find((s) => s.value === candidate.stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/candidates')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{candidate.name}</h1>
          <p className="text-muted-foreground mt-1">{candidate.email}</p>
        </div>
        <Select value={candidate.stage} onValueChange={handleStageChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stages.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ... (email, phone, applied) ... */}
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{candidate.email}</p>
              </div>
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{candidate.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Applied</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(candidate.appliedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="pt-4">
              <p className="text-sm font-medium mb-2">Current Stage</p>
              <Badge className="text-sm">{currentStage?.label}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add notes... Use @mentions to tag @team members."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={6}
              className="mb-3"
            />
            <Button size="sm" onClick={handleAddNote} disabled={noteMutation.isPending}>
              {noteMutation.isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(timeline || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline events yet</p>
            ) : (
              (timeline || []).map((event) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <div className="w-px flex-1 bg-border" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {event.type === 'stage_change' && (
                          <>
                            Stage changed {event.from && `from ${event.from}`} to {event.to}
                          </>
                        )}
                        {event.type === 'note' && 'Note added'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.createdAt).toLocaleString()} • {event.createdBy}
                    </p>
                    {/* UPDATED: Render note with mentions */}
                    {event.note && (
                      <p className="text-sm mt-2 bg-muted p-2 rounded">
                        {renderWithMentions(event.note)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}