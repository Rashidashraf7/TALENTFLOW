import type React from "react"
import { Link, useLocation } from "react-router-dom"
import { Briefcase, Users, ClipboardList, Menu ,LayoutDashboard} from "lucide-react"
import { Button } from "./ui/button"
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet"
import { Separator } from "./ui/separator"
import { cn } from "@/lib/utils"

 // Import globals.css at the top of the file

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Candidates", href: "/candidates", icon: Users },
  { name: "Assessments", href: "/assessments", icon: ClipboardList },
]

// Reusable NavItems component
const NavItems = () => {
  const location = useLocation()
  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {navigation.map((item) => {
        const isActive = location.pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-in-out",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-muted/40",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// Reusable Logo component
const Logo = () => (
  <Link to="/" className="flex items-center gap-2 font-semibold text-lg transition-opacity hover:opacity-80">
    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground flex-shrink-0 shadow-sm">
      T
    </div>
    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">TalentFlow</span>
  </Link>
)

// Default export for the Layout component
export  function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden w-64 flex-col border-r border-border/40 bg-background lg:flex">
        {/* Logo Section */}
        <div className="flex h-16 items-center px-6 py-4">
          <Logo />
        </div>
        <Separator className="bg-border/20" />

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavItems />
        </div>

        {/* Footer Section */}
        <div className="border-t border-border/20 px-6 py-4">
          <p className="text-xs text-muted-foreground/60 text-center">© 2025 TalentFlow Inc.</p>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border/40 bg-background/95 backdrop-blur-sm px-4 lg:hidden">
          {/* Mobile Logo */}
          <Logo />
          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-border/40 bg-transparent">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle Navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col border-r border-border/40">
              {/* Mobile Header inside Sheet */}
              <div className="flex h-16 items-center px-6 py-4 border-b border-border/20">
                <Logo />
              </div>

              {/* Mobile Nav */}
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <NavItems />
              </div>

              {/* Mobile Footer */}
              <div className="border-t border-border/20 px-6 py-4 mt-auto">
                <p className="text-xs text-muted-foreground/60 text-center">© 2025 TalentFlow Inc.</p>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  )
}
