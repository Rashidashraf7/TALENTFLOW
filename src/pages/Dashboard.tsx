"use client"

import React, { useMemo } from "react" // --- IMPORT REACT ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Briefcase, Users, CalendarClock, CheckCheck, TrendingUp, TrendingDown } from "lucide-react" // Added Loader2, ClipboardCheck, CalendarClock etc.
import { useQuery } from "@tanstack/react-query"
import type { Job, Candidate } from "@/lib/db"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

// --- Mock Data ---
const mockStats = {
  interviewsScheduled: 12,
  interviewsChange: 23,
  placements: 8,
  placementsChange: 15,
}

const mockRecentActivity = [
  { id: 1, text: "New application for Senior Frontend Engineer", time: "2h ago" },
  { id: 2, text: "Interview scheduled with Sarah Johnson", time: "4h ago" },
  { id: 3, text: "UI/UX Designer position filled", time: "1d ago" },
  { id: 4, text: "Candidate John Smith moved to Offer stage", time: "2d ago" },
]

const mockUpcomingInterviews = [
  { id: 1, name: "John Smith", role: "Full Stack Engineer", time: "Today, 2:00 PM" },
  { id: 2, name: "Emily Davis", role: "Product Manager", time: "Tomorrow, 10:00 AM" },
  { id: 3, name: "Michael Brown", role: "DevOps Engineer", time: "Friday, 3:30 PM" },
]
// --- End Mock Data ---

// --- API Functions ---
async function fetchAllJobs(): Promise<Job[]> {
  const response = await fetch(`/api/jobs?pageSize=1000`)
  if (!response.ok) throw new Error("Failed to fetch jobs")
  const data = await response.json()
  return data.data || []
}

async function fetchAllCandidates(): Promise<Candidate[]> {
  const response = await fetch(`/api/candidates?pageSize=1000`)
  if (!response.ok) throw new Error("Failed to fetch candidates")
  const data = await response.json()
  return data.data || []
}
// --- End API Functions ---

// --- Stat Card Component ---
interface StatCardProps {
  title: string
  value: number | string
  change?: number
  icon: React.ElementType
  isLoading: boolean
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, isLoading }) => {
  const ChangeIcon = change && change > 0 ? TrendingUp : change && change < 0 ? TrendingDown : null
  const changeColor =
    change && change > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : change && change < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground"

  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground/80">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground/60 transition-colors duration-200" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-1/2 mt-1 mb-2" />
        ) : (
          <div className="text-2xl font-bold text-foreground">{value}</div>
        )}
        {change !== undefined && !isLoading && (
          <p className={cn("text-xs flex items-center transition-colors duration-200", changeColor)}>
            {ChangeIcon && <ChangeIcon className="h-3 w-3 mr-1" />}
            {change >= 0 ? "+" : ""}
            {change}% from last month
          </p>
        )}
        {change === undefined && !isLoading && <p className="text-xs text-muted-foreground invisible h-4"> </p>}
        {isLoading && <Skeleton className="h-4 w-3/4 mt-1" />}
      </CardContent>
    </Card>
  )
}
// --- End Stat Card ---

// --- Dashboard Component ---
export default function Dashboard() {
  const {
    data: jobs,
    isLoading: isLoadingJobs,
    error: errorJobs,
  } = useQuery({
    queryKey: ["allJobs"],
    queryFn: fetchAllJobs,
  })

  const {
    data: candidates,
    isLoading: isLoadingCandidates,
    error: errorCandidates,
  } = useQuery({
    queryKey: ["allCandidates"],
    queryFn: fetchAllCandidates,
  })

  const isLoading = isLoadingJobs || isLoadingCandidates

  // Calculate real stats where possible
  const realStats = useMemo(() => {
    if (!jobs || !candidates) {
      return { totalJobs: 0, activeCandidates: 0, totalJobsChange: 12, activeCandidatesChange: 8 } // Default mock changes
    }
    const totalJobs = jobs.length
    const activeCandidates = candidates.filter((c) => c.stage !== "hired" && c.stage !== "rejected").length
    const totalJobsChange = 12 // Mock
    const activeCandidatesChange = 8 // Mock

    return { totalJobs, activeCandidates, totalJobsChange, activeCandidatesChange }
  }, [jobs, candidates])

  if (errorJobs || errorCandidates) {
    return <div className="text-destructive p-4">Error loading dashboard data. Please try again later.</div>
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground/70 mt-2">
          Welcome back! Here's an overview of your recruitment activities.
        </p>
      </div>

      {/* Stat Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Jobs"
          value={realStats.totalJobs}
          change={realStats.totalJobsChange}
          icon={Briefcase}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Candidates"
          value={realStats.activeCandidates}
          change={realStats.activeCandidatesChange}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Interviews Scheduled"
          value={mockStats.interviewsScheduled}
          change={mockStats.interviewsChange}
          icon={CalendarClock}
          isLoading={isLoading}
        />
        <StatCard
          title="Placements"
          value={mockStats.placements}
          change={mockStats.placementsChange}
          icon={CheckCheck}
          isLoading={isLoading}
        />
      </div>

      {/* Recent Activity & Upcoming Interviews Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity Card */}
        <Card className="transition-all duration-200 hover:shadow-md hover:border-border/60">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : mockRecentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">No recent activity.</p>
            ) : (
              <ul className="space-y-3">
                {mockRecentActivity.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-start gap-3 transition-colors duration-200 hover:bg-muted/30 px-2 py-1 rounded-md"
                  >
                    <span className="mt-1 flex h-2 w-2 translate-y-1 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <p className="leading-snug text-foreground/90">{activity.text}</p>
                      <p className="text-xs text-muted-foreground/60">{activity.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews Card */}
        <Card className="transition-all duration-200 hover:shadow-md hover:border-border/60">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Upcoming Interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : mockUpcomingInterviews.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">No upcoming interviews scheduled.</p>
            ) : (
              <ul className="space-y-1">
                {mockUpcomingInterviews.map((interview, index) => (
                  <React.Fragment key={interview.id}>
                    <li className="flex items-center justify-between gap-4 py-3 transition-colors duration-200 hover:bg-muted/30 px-2 rounded-md">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{interview.name}</p>
                        <p className="text-xs text-muted-foreground/70 truncate">{interview.role}</p>
                      </div>
                      <p className="text-xs text-muted-foreground/60 flex-shrink-0">{interview.time}</p>
                    </li>
                    {index < mockUpcomingInterviews.length - 1 && <Separator className="bg-border/30" />}
                  </React.Fragment>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
