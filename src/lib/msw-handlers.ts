import { http, HttpResponse, delay } from 'msw';
import { db, Candidate, TimelineEvent } from './db'; // Make sure Candidate & TimelineEvent are imported

// Simulate network latency
const randomDelay = () => delay(200 + Math.random() * 1000);

// Simulate occasional errors
const shouldFail = () => Math.random() < 0.1;

export const handlers = [
  // Jobs endpoints
  http.get('/api/jobs', async ({ request }) => {
    await randomDelay();
    
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const sort = url.searchParams.get('sort') || 'order'; // NEW: Get sort param

    let jobs = await db.jobs.toArray();
    
    if (search) {
      jobs = jobs.filter(job => 
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.slug.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }
    
    // NEW: Sorting logic
    jobs.sort((a, b) => {
      if (sort === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (sort === 'title_desc') {
        return b.title.localeCompare(a.title);
      }
      if (sort === 'date_asc') {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      if (sort === 'date_desc') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      // Default sort by 'order'
      return a.order - b.order;
    });
    
    const total = jobs.length;
    const start = (page - 1) * pageSize;
    const paginatedJobs = jobs.slice(start, start + pageSize);
    
    return HttpResponse.json({
      data: paginatedJobs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }),

  http.post('/api/jobs', async ({ request }) => {
    await randomDelay();
    
    if (shouldFail()) {
      return HttpResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }
    
    const body = await request.json() as any;
    const job = {
      ...body,
      id: `job-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.jobs.add(job);
    return HttpResponse.json(job, { status: 201 });
  }),

  http.patch('/api/jobs/:id', async ({ params, request }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    
    if (shouldFail()) {
      return HttpResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }
    
    const { id } = params;
    const updates = await request.json() as any;
    
    await db.jobs.update(id as string, {
      ...updates,
      updatedAt: new Date(),
    });
    
    const job = await db.jobs.get(id as string);
    return HttpResponse.json(job);
  }),

  http.patch('/api/jobs/:id/reorder', async ({ params, request }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    
    if (shouldFail()) {
      return HttpResponse.json({ error: 'Failed to reorder job' }, { status: 500 });
    }
    
    const { id } = params;
    const { fromOrder, toOrder } = await request.json() as any;
    
    const jobs = await db.jobs.toArray();
    const job = jobs.find(j => j.id === id);
    
    if (!job) {
      return HttpResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Update orders
    if (fromOrder < toOrder) {
      const jobsToUpdate = await db.jobs
        .where('order')
        .between(fromOrder + 1, toOrder, true, true)
        .toArray();
      for (const j of jobsToUpdate) {
        await db.jobs.update(j.id, { order: j.order - 1 });
      }
    } else {
      const jobsToUpdate = await db.jobs
        .where('order')
        .between(toOrder, fromOrder - 1, true, true)
        .toArray();
      for (const j of jobsToUpdate) {
        await db.jobs.update(j.id, { order: j.order + 1 });
      }
    }
    
    await db.jobs.update(id as string, { order: toOrder, updatedAt: new Date() });
    
    const updated = await db.jobs.get(id as string);
    return HttpResponse.json(updated);
  }),

  // Candidates endpoints
  http.get('/api/candidates', async ({ request }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const stage = url.searchParams.get('stage') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    
    let candidates = await db.candidates.toArray();
    
    if (search) {
      const searchLower = search.toLowerCase();
      candidates = candidates.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower)
      );
    }
    
    if (stage) {
      candidates = candidates.filter(c => c.stage === stage);
    }
    
    candidates.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
    
    const total = candidates.length;
    const start = (page - 1) * pageSize;
    const paginatedCandidates = candidates.slice(start, start + pageSize);
    
    return HttpResponse.json({
      data: paginatedCandidates,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }),

  // NEW: Handler for POST /api/candidates
  http.post('/api/candidates', async ({ request }) => {
    await randomDelay();

    if (shouldFail()) {
      return HttpResponse.json({ error: 'Failed to create candidate' }, { status: 500 });
    }

    const body = await request.json() as any;
    const appliedAt = new Date();

    const candidate: Candidate = {
      id: `candidate-${Date.now()}`,
      name: body.name,
      email: body.email,
      phone: body.phone || undefined,
      jobId: body.jobId,
      stage: 'applied', // New candidates always start at 'applied'
      appliedAt,
      updatedAt: appliedAt,
    };

    await db.candidates.add(candidate);

    // Also create the initial timeline event
    const timelineEvent: TimelineEvent = {
      id: `timeline-${Date.now()}`,
      candidateId: candidate.id,
      type: 'stage_change',
      to: 'applied',
      createdAt: appliedAt,
      createdBy: 'System', // Or body.name
    };
    await db.timeline.add(timelineEvent);

    return HttpResponse.json(candidate, { status: 201 });
  }),

  http.patch('/api/candidates/:id', async ({ params, request }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    
    if (shouldFail()) {
      return HttpResponse.json({ error: 'Failed to update candidate' }, { status: 500 });
    }
    
    const { id } = params;
    const updates = await request.json() as any;
    
    const candidate = await db.candidates.get(id as string);
    if (!candidate) {
      return HttpResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }
    
    if (updates.stage && updates.stage !== candidate.stage) {
      await db.timeline.add({
        id: `timeline-${Date.now()}`,
        candidateId: id as string,
        type: 'stage_change',
        from: candidate.stage,
        to: updates.stage,
        createdAt: new Date(),
        createdBy: 'HR Team',
      });
    }
    
    await db.candidates.update(id as string, {
      ...updates,
      updatedAt: new Date(),
    });
    
    const updated = await db.candidates.get(id as string);
    return HttpResponse.json(updated);
  }),

  http.get('/api/candidates/:id', async ({ params }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    const { id } = params;
    
    const candidate = await db.candidates.get(id as string);

    if (!candidate) {
      return HttpResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return HttpResponse.json(candidate);
  }),

  http.get('/api/candidates/:id/timeline', async ({ params }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    
    const { id } = params;
    const timeline = await db.timeline
      .where('candidateId')
      .equals(id as string)
      .reverse()
      .sortBy('createdAt');
    
    return HttpResponse.json(timeline);
  }),

  http.post('/api/candidates/:id/notes', async ({ params, request }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    
    const { id } = params;
    const { note } = await request.json() as { note: string };
    
    if (!note) {
      return HttpResponse.json({ error: 'Note cannot be empty' }, { status: 400 });
    }

    const timelineEvent: TimelineEvent = {
      id: `timeline-${Date.now()}`,
      candidateId: id as string,
      type: 'note',
      note: note,
      createdAt: new Date(),
      createdBy: 'HR Team',
    };
    
    await db.timeline.add(timelineEvent);
    return HttpResponse.json(timelineEvent, { status: 201 });
  }),

  // Assessments endpoints
  http.get('/api/assessments/:jobId', async ({ params }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    
    const { jobId } = params;
    const assessment = await db.assessments
      .where('jobId')
      .equals(jobId as string)
      .first();
    
    if (!assessment) {
      return HttpResponse.json(null, { status: 404 });
    }
    
    return HttpResponse.json(assessment);
  }),

  http.put('/api/assessments/:jobId', async ({ params, request }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    
    if (shouldFail()) {
      return HttpResponse.json({ error: 'Failed to save assessment' }, { status: 500 });
    }
    
    const { jobId } = params;
    const body = await request.json() as any;
    
    const existing = await db.assessments
      .where('jobId')
      .equals(jobId as string)
      .first();
    
    if (existing) {
      await db.assessments.update(existing.id, {
        ...body,
        updatedAt: new Date(),
      });
      const updated = await db.assessments.get(existing.id);
      return HttpResponse.json(updated);
    } else {
      const assessment = {
        ...body,
        id: `assessment-${Date.now()}`,
        jobId: jobId as string,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.assessments.add(assessment);
      return HttpResponse.json(assessment, { status: 201 });
    }
  }),

  http.post('/api/assessments/:jobId/submit', async ({ params, request }) => {
    // ... (This handler is correct, no changes needed)
    await randomDelay();
    
    if (shouldFail()) {
      return HttpResponse.json({ error: 'Failed to submit assessment' }, { status: 500 });
    }
    
    const { jobId } = params;
    const body = await request.json() as any;
    
    const assessment = await db.assessments
      .where('jobId')
      .equals(jobId as string)
      .first();
    
    if (!assessment) {
      return HttpResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    const response = {
      id: `response-${Date.now()}`,
      assessmentId: assessment.id,
      candidateId: body.candidateId,
      responses: body.responses,
      submittedAt: new Date(),
    };
    
    await db.responses.add(response);
    return HttpResponse.json(response, { status: 201 });
  }),
];