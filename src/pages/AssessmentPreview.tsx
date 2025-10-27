import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Assessment, Question } from '@/lib/db';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

// --- Form Validation & Submission ---

// Helper function to build Zod schema from assessment questions
function buildSchema(questions: Question[]) {
  let schema = z.object({});
  for (const q of questions) {
    let validator: z.ZodTypeAny; // Declare validator inside the loop

    switch (q.type) {
      case 'short-text':
      case 'long-text':
        let stringValidator = z.string(); // Start with string
        if (q.maxLength) {
          stringValidator = stringValidator.max(q.maxLength, `Must be ${q.maxLength} characters or less`);
        }
        if (q.required && !q.conditionalOn) {
          stringValidator = stringValidator.nonempty('This field is required');
        }
        validator = stringValidator; // Assign to main validator
        break;

      case 'numeric':
        let numValidator = z.preprocess(
          (val) => (val === '' ? undefined : Number(val)), // Handle empty string
          z.number({ invalid_type_error: 'Must be a number' })
            .min(q.numericRange?.min ?? -Infinity, `Min value is ${q.numericRange?.min}`)
            .max(q.numericRange?.max ?? Infinity, `Max value is ${q.numericRange?.max}`)
        );
        
        if (q.required && !q.conditionalOn) {
          validator = numValidator.refine(val => val !== undefined && val !== null, 'This field is required');
        } else {
          validator = numValidator.optional();
        }
        break;

      case 'single-choice':
        let singleChoiceValidator = z.string();
        if (q.required && !q.conditionalOn) {
          singleChoiceValidator = singleChoiceValidator.nonempty('This field is required');
        }
        validator = singleChoiceValidator;
        break;

      case 'multi-choice':
        // --- THIS IS THE FIXED BLOCK ---
        if (q.required && !q.conditionalOn) {
          validator = z.array(z.string()).nonempty('This field is required');
        } else {
          validator = z.array(z.string());
        }
        break;
        // --- END OF FIX ---

      case 'file':
        validator = z.any(); // File validation is complex, stub for now
        if (q.required && !q.conditionalOn) {
           validator = validator.refine(val => val, 'This field is required');
        }
        break;
        
      default:
         validator = z.any();
    }
    
    if (!q.required && q.type !== 'numeric') {
      validator = validator.optional().or(z.literal(''));
    }

    schema = schema.extend({ [q.id]: validator });
  }
  
  // Handle conditional required
  return schema.superRefine((data, ctx) => {
    for (const q of questions) {
      if (q.required && q.conditionalOn) {
        const parentValue = data[q.conditionalOn.questionId];
        if (parentValue === q.conditionalOn.value) {
          const fieldValue = data[q.id];
          if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0) || String(fieldValue).trim() === '') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [q.id],
              message: 'This field is required',
            });
          }
        }
      }
    }
  });
}

// API function for submission
async function submitAssessment(jobId: string, responses: Record<string, any>) {
  const payload = {
    candidateId: 'temp-candidate-123', // Stub
    responses,
  };
  
  const response = await fetch(`/api/assessments/${jobId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit assessment');
  }
  return response.json();
}

// --- Dynamic Question Renderer ---

interface QuestionRendererProps {
  question: Question;
  form: any;
  currentValues: Record<string, any>;
}

function QuestionRenderer({ question, form, currentValues }: QuestionRendererProps) {
  if (question.conditionalOn) {
    const parentValue = currentValues[question.conditionalOn.questionId];
    if (parentValue !== question.conditionalOn.value) {
      return null;
    }
  }

  return (
    <FormField
      control={form.control}
      name={question.id}
      render={({ field }) => (
        <FormItem className="space-y-2 p-4 border rounded-lg bg-card">
          <FormLabel className="text-base">
            {question.question}
            {question.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <>
              {question.type === 'short-text' && <Input {...field} placeholder="Your answer" />}
              {question.type === 'long-text' && <Textarea {...field} placeholder="Your answer" rows={4} />}
              {question.type === 'numeric' && (
                <Input type="number" {...field} placeholder={`e.g. ${question.numericRange?.min || 1}`} />
              )}
              {question.type === 'file' && <Input type="file" {...field} />}
              
              {question.type === 'single-choice' && (
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-1">
                  {question.options?.map((option) => (
                    <FormItem key={option} className="flex items-center space-x-2">
                      <FormControl>
                        <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                      </FormControl>
                      <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                    </FormItem>
                  ))}
                </RadioGroup>
              )}
              
              {question.type === 'multi-choice' && (
                <div className="space-y-2">
                  {question.options?.map((option) => (
                    <FormField
                      key={option}
                      control={form.control}
                      name={question.id}
                      render={({ field }) => (
                        <FormItem key={option} className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(option)}
                              onCheckedChange={(checked) => {
                                const currentVal = field.value || [];
                                return checked
                                  ? field.onChange([...currentVal, option])
                                  : field.onChange(currentVal.filter((val: string) => val !== option));
                              }}
                            />
                          </FormControl>
                          <Label>{option}</Label>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}


// --- Main Preview Component ---

export default function AssessmentPreview() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  
  const form = useForm({
    resolver: assessment ? zodResolver(buildSchema(assessment.sections.flatMap(s => s.questions))) : undefined,
  });

  const currentValues = useWatch({ control: form.control });

  useEffect(() => {
    fetch(`/api/assessments/${jobId}`)
      .then((res) => res.json())
      .then((data) => {
        setAssessment(data);
        form.reset();
        form.trigger();
      })
      .catch(console.error);
  }, [jobId, form]);
  
  useEffect(() => {
    if (assessment) {
      form.reset(undefined, {
        keepValues: false,
        keepDirty: false,
        keepDefaultValues: false,
      });
      (form as any).resolver = zodResolver(buildSchema(assessment.sections.flatMap(s => s.questions)));
    }
  }, [assessment, form]);

  const submitMutation = useMutation({
    mutationFn: (data: Record<string, any>) => submitAssessment(jobId!, data),
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Your assessment has been submitted.',
      });
      navigate('/jobs');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: Record<string, any>) => {
    console.log('Form Submitted', data);
    submitMutation.mutate(data);
  };

  if (!assessment) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/assessments/${jobId}/builder`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{assessment.title}</h1>
          {assessment.description && <p className="text-muted-foreground mt-1">{assessment.description}</p>}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {assessment.sections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader className="bg-muted">
                <CardTitle>{section.title}</CardTitle>
                {section.description && <CardDescription>{section.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {section.questions.map((question) => (
                  <QuestionRenderer
                    key={question.id}
                    question={question}
                    form={form}
                    currentValues={currentValues}
                  />
                ))}
              </CardContent>
            </Card>
          ))}

          <Button type="submit" size="lg" className="w-full" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
          </Button>
        </form>
      </Form>
    </div>
  );
}