import { db, Job, Candidate, Assessment, TimelineEvent } from './db';
import Dexie from 'dexie'; // Import Dexie

const jobTitles = [
  'Senior Frontend Engineer',
  'Backend Developer',
  'Full Stack Engineer',
  'DevOps Engineer',
  'Product Manager',
  'UI/UX Designer',
  'Data Scientist',
  'Machine Learning Engineer',
  'QA Engineer',
  'Technical Writer',
  'Engineering Manager',
  'Solutions Architect',
  'Security Engineer',
  'Mobile Developer',
  'Site Reliability Engineer',
];

const tags = ['Remote', 'Full-time', 'Part-time', 'Contract', 'Senior', 'Mid-level', 'Junior', 'Urgent'];
const stages: Array<'applied' | 'screen' | 'tech' | 'offer' | 'hired' | 'rejected'> = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];

const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function seedDatabase() {
  const jobCount = await db.jobs.count();
  if (jobCount > 0) {
    console.log('Database already seeded');
    return;
  }

  console.log('Seeding database...');

  // Use a transaction for seeding
  await db.transaction('rw', db.jobs, db.candidates, db.timeline, db.assessments, async () => {
    // Seed jobs
    const jobs: Job[] = [];
    for (let i = 0; i < 25; i++) {
      const title = i < jobTitles.length ? jobTitles[i] : `${randomItem(jobTitles)} ${i}`;
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      jobs.push({
        id: `job-${i + 1}`,
        title,
        slug: `${slug}-${i + 1}`,
        status: Math.random() > 0.3 ? 'active' : 'archived',
        tags: randomItems(tags, Math.floor(Math.random() * 3) + 1),
        order: i,
        description: `We are looking for an experienced ${title} to join our dynamic team. Responsibilities include designing, developing, and maintaining high-quality software solutions. Must be proficient in relevant technologies and possess strong problem-solving skills.`,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      });
    }
    await db.jobs.bulkAdd(jobs);

    // Seed candidates
    const candidates: Candidate[] = [];
    const timeline: TimelineEvent[] = [];

    for (let i = 0; i < 1000; i++) {
      const firstName = randomItem(firstNames);
      const lastName = randomItem(lastNames);
      const jobId = randomItem(jobs).id;
      const stage = randomItem(stages);
      const appliedAt = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);

      const candidate: Candidate = {
        id: `candidate-${i + 1}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        jobId,
        stage,
        appliedAt,
        updatedAt: new Date(appliedAt.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000), // Random update time after apply
      };
      candidates.push(candidate);

      // Add initial 'applied' timeline event
      timeline.push({
        id: `timeline-${candidate.id}-applied`,
        candidateId: candidate.id,
        type: 'stage_change',
        to: 'applied',
        createdAt: appliedAt,
        createdBy: 'System',
      });

      // Add subsequent stage change events if not 'applied'
      let lastEventTime = appliedAt;
      const stagesReached = stages.slice(0, stages.indexOf(stage) + 1); // Get stages up to the current one
      if (stagesReached.length > 1) {
        for (let j = 1; j < stagesReached.length; j++) {
           lastEventTime = new Date(lastEventTime.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // Add up to 7 days
           timeline.push({
             id: `timeline-${candidate.id}-${stagesReached[j]}`,
             candidateId: candidate.id,
             type: 'stage_change',
             from: stagesReached[j-1],
             to: stagesReached[j],
             createdAt: lastEventTime,
             createdBy: 'HR Team',
           });
        }
      }
    }
    await db.candidates.bulkAdd(candidates);
    await db.timeline.bulkAdd(timeline);

    // Seed assessments (now with 10+ questions)
    const assessments: Assessment[] = [];
    const assessmentCount = 3; // Ensure at least 3
    for (let i = 0; i < assessmentCount; i++) {
      const jobId = jobs[i].id; // Assign to the first 3 jobs
      assessments.push({
        id: `assessment-${i + 1}`,
        jobId,
        title: `${jobs[i].title} Skills Assessment`,
        description: 'Please complete this assessment carefully to help us understand your qualifications for the role.',
        sections: [
          {
            id: `section-${i + 1}-1`,
            title: 'Technical Proficiency',
            description: 'Assess your technical skills relevant to the job.',
            questions: [
              {
                id: `q-${i + 1}-1`,
                type: 'single-choice',
                question: `How many years of professional experience do you have with ${i % 2 === 0 ? 'React' : 'Node.js'}?`,
                required: true,
                options: ['0-1 year', '1-3 years', '3-5 years', '5+ years'],
              },
              {
                id: `q-${i + 1}-2`,
                type: 'multi-choice',
                question: 'Which of the following state management libraries have you used?',
                required: true,
                options: ['Redux', 'Zustand', 'Jotai', 'Recoil', 'Context API', 'None of the above'],
              },
              {
                id: `q-${i + 1}-3`,
                type: 'numeric',
                question: 'On a scale of 1-10, how would you rate your CSS skills?',
                required: true,
                numericRange: { min: 1, max: 10 },
              },
              {
                 id: `q-${i + 1}-4`,
                 type: 'short-text',
                 question: 'What is your preferred version control system?',
                 required: true,
                 maxLength: 50,
              },
              {
                id: `q-${i + 1}-5`,
                type: 'long-text',
                question: 'Describe a challenging technical problem you solved recently and your approach.',
                required: true,
                maxLength: 1000,
              },
            ],
          },
          {
            id: `section-${i + 1}-2`,
            title: 'Work Style & Experience',
            questions: [
              {
                id: `q-${i + 1}-6`,
                type: 'single-choice',
                question: 'What is your preferred work environment?',
                required: true,
                options: ['Remote', 'Hybrid', 'In-Office'],
              },
              {
                id: `q-${i + 1}-7`,
                type: 'short-text',
                question: 'If Hybrid or In-Office, which city are you located in or willing to relocate to?',
                required: false,
                maxLength: 100,
                conditionalOn: { questionId: `q-${i + 1}-6`, value: 'Hybrid' }, // Example: Show if Hybrid (adjust value as needed)
              },
              {
                id: `q-${i + 1}-8`,
                type: 'multi-choice',
                question: 'Which agile methodologies are you familiar with?',
                required: false,
                options: ['Scrum', 'Kanban', 'XP', 'Lean', 'None'],
              },
              {
                 id: `q-${i + 1}-9`,
                 type: 'long-text',
                 question: 'What are your salary expectations for this role?',
                 required: true,
                 maxLength: 200,
              },
              {
                 id: `q-${i + 1}-10`,
                 type: 'single-choice',
                 question: 'Are you authorized to work in the specified location for this job?',
                 required: true,
                 options: ['Yes', 'No', 'Require Sponsorship'],
              },
               { // Adding an 11th question
                 id: `q-${i + 1}-11`,
                 type: 'file',
                 question: 'Optional: Please upload your portfolio link or relevant work samples (PDF/Link).',
                 required: false,
              },
            ],
          },
        ],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      });
    }
    await db.assessments.bulkAdd(assessments);

    console.log('Database seeded successfully!');
  }); // End transaction
}