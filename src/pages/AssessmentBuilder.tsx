import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Eye, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Assessment, AssessmentSection, Question } from '@/lib/db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AssessmentBuilder() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAssessment();
  }, [jobId]);

  const allQuestions = assessment?.sections.flatMap(s => s.questions) || [];

  const fetchAssessment = async () => {
    try {
      const response = await fetch(`/api/assessments/${jobId}`);
      if (response.status === 404) {
        setAssessment({
          id: '',
          jobId: jobId!,
          title: 'New Assessment',
          description: '',
          sections: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        const data = await response.json();
        setAssessment(data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch assessment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAssessment = async () => {
    if (!assessment) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/assessments/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessment),
      });
      if (!response.ok) throw new Error('Failed to save assessment');
      toast({
        title: 'Success',
        description: 'Assessment saved successfully',
      });
      const updated = await response.json();
      setAssessment(updated);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save assessment',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    if (!assessment) return;
    const newSection: AssessmentSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      description: '',
      questions: [],
    };
    setAssessment({
      ...assessment,
      sections: [...assessment.sections, newSection],
    });
  };

  const updateSection = (sectionId: string, updates: Partial<AssessmentSection>) => {
    if (!assessment) return;
    setAssessment({
      ...assessment,
      sections: assessment.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    });
  };

  const deleteSection = (sectionId: string) => {
    if (!assessment) return;
    setAssessment({
      ...assessment,
      sections: assessment.sections.filter((s) => s.id !== sectionId),
    });
  };

  const addQuestion = (sectionId: string) => {
    if (!assessment) return;
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type: 'short-text',
      question: 'New Question',
      required: false,
    };
    setAssessment({
      ...assessment,
      sections: assessment.sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: [...s.questions, newQuestion] }
          : s
      ),
    });
  };

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    updates: Partial<Question>
  ) => {
    if (!assessment) return;
    setAssessment({
      ...assessment,
      sections: assessment.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, ...updates } : q
              ),
            }
          : s
      ),
    });
  };
  
  const cleanUpConditionals = (questionId: string) => {
    if (!assessment) return;
    setAssessment(prev => ({
      ...prev!,
      sections: prev!.sections.map(s => ({
        ...s,
        questions: s.questions.map(q => 
          q.conditionalOn?.questionId === questionId 
          ? { ...q, conditionalOn: undefined } 
          : q
        )
      }))
    }));
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    if (!assessment) return;
    setAssessment({
      ...assessment,
      sections: assessment.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.filter((q) => q.id !== questionId),
            }
          : s
      ),
    });
    cleanUpConditionals(questionId);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }
  if (!assessment) {
    return <div className="text-center py-12">Assessment not found</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/assessments')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Assessment Builder</h1>
          <p className="text-muted-foreground mt-1">Design your assessment</p>
        </div>
        {/* --- BUTTON ADDED BACK --- */}
        <Button
          variant="outline"
          onClick={() => navigate(`/assessments/${jobId}/preview`)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
        <Button onClick={saveAssessment} disabled={saving}>
          {saving ? 'Saving...' : 'Save Assessment'}
        </Button>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={assessment.title}
                  onChange={(e) =>
                    setAssessment({ ...assessment, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={assessment.description || ''}
                  onChange={(e) =>
                    setAssessment({ ...assessment, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          {assessment.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex-1 space-y-3">
                  <Input
                    value={section.title}
                    onChange={(e) =>
                      updateSection(section.id, { title: e.target.value })
                    }
                    className="font-semibold text-lg"
                    placeholder="Section Title"
                  />
                  <Textarea
                    value={section.description || ''}
                    onChange={(e) =>
                      updateSection(section.id, { description: e.target.value })
                    }
                    placeholder="Section description (optional)"
                    rows={2}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteSection(section.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.questions.map((question) => (
                  <Card key={question.id} className="bg-muted/50">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                        <div className="flex-1 space-y-3">
                          <Input
                            value={question.question}
                            onChange={(e) =>
                              updateQuestion(section.id, question.id, {
                                question: e.target.value,
                              })
                            }
                            placeholder="Question text"
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Question Type</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) => {
                                  updateQuestion(section.id, question.id, {
                                    type: value as any,
                                  });
                                  if(value !== 'single-choice') {
                                    cleanUpConditionals(question.id);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="short-text">Short Text</SelectItem>
                                  <SelectItem value="long-text">Long Text</SelectItem>
                                  <SelectItem value="single-choice">
                                    Single Choice
                                  </SelectItem>
                                  <SelectItem value="multi-choice">
                                    Multiple Choice
                                  </SelectItem>
                                  <SelectItem value="numeric">Numeric</SelectItem>
                                  <SelectItem value="file">File Upload</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={question.required}
                                  onCheckedChange={(checked) =>
                                    updateQuestion(section.id, question.id, {
                                      required: checked as boolean,
                                    })
                                  }
                                />
                                <span className="text-sm">Required</span>
                              </label>
                            </div>
                          </div>

                          {(question.type === 'short-text' || question.type === 'long-text') && (
                            <div className="space-y-2">
                              <Label>Max Length</Label>
                              <Input
                                type="number"
                                value={question.maxLength || ''}
                                onChange={(e) =>
                                  updateQuestion(section.id, question.id, {
                                    maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                                  })
                                }
                              />
                            </div>
                          )}

                          {(question.type === 'single-choice' ||
                            question.type === 'multi-choice') && (
                            <div className="space-y-2">
                              <Label>Options (comma-separated)</Label>
                              <Input
                                value={question.options?.join(', ') || ''}
                                onChange={(e) =>
                                  updateQuestion(section.id, question.id, {
                                    options: e.target.value
                                      .split(',')
                                      .map((o) => o.trim()).filter(Boolean),
                                  })
                                }
                                placeholder="Option 1, Option 2, Option 3"
                              />
                            </div>
                          )}

                          {question.type === 'numeric' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Min Value</Label>
                                <Input
                                  type="number"
                                  value={question.numericRange?.min || ''}
                                  onChange={(e) =>
                                    updateQuestion(section.id, question.id, {
                                      numericRange: {
                                        min: parseInt(e.target.value) || 0,
                                        max: question.numericRange?.max || 100,
                                      },
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Max Value</Label>
                                <Input
                                  type="number"
                                  value={question.numericRange?.max || ''}
                                  onChange={(e) =>
                                    updateQuestion(section.id, question.id, {
                                      numericRange: {
                                        min: question.numericRange?.min || 0,
                                        max: parseInt(e.target.value) || 100,
                                      },
                                    })
                                  }
                                />
                              </div>
                            </div>
                          )}
                          
                          <Card className="bg-card">
                            <CardContent className="pt-4 space-y-3">
                              <Label>Conditional Logic (Optional)</Label>
                              <p className="text-xs text-muted-foreground">
                                Only show this question if...
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                {/* --- THIS IS THE FIXED BLOCK --- */}
                                <Select
                                  value={question.conditionalOn?.questionId || "none"} // Use "none" as default
                                  onValueChange={(qId) =>
                                    updateQuestion(section.id, question.id, {
                                      conditionalOn: qId === "none"
                                        ? undefined
                                        : { questionId: qId, value: '' },
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="...another question..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">- None -</SelectItem>
                                    {allQuestions
                                      .filter(q => q.id !== question.id && q.type === 'single-choice')
                                      .map(q => (
                                        <SelectItem key={q.id} value={q.id}>
                                          {q.question.length > 30 ? q.question.substring(0, 30) + '...' : q.question}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {/* --- END OF FIX --- */}

                                {question.conditionalOn?.questionId && (
                                  <Select
                                    value={question.conditionalOn?.value}
                                    onValueChange={(val) =>
                                      updateQuestion(section.id, question.id, {
                                        conditionalOn: { ...question.conditionalOn!, value: val },
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="...is equal to..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {allQuestions.find(q => q.id === question.conditionalOn?.questionId)?.options?.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                          
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuestion(section.id, question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={() => addQuestion(section.id)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addSection} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}