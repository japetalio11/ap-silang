import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react"
import silangLogo from "@/assets/silang.svg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SuperAdminLoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const continueToPortal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate("/superadmin/rhu-management", { replace: true })
  }

  return <main className="h-dvh w-full overflow-hidden bg-background p-1 text-xs text-foreground sm:p-2" style={{ fontFamily: "'Inter Variable', Inter, sans-serif" }}>
    <div className="grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-2">
      <section className="flex h-full min-h-0 flex-col justify-between overflow-hidden px-4 py-3 sm:px-8 sm:py-4 lg:px-10 xl:px-14">
        <div className="mx-auto flex min-h-0 w-full max-w-[330px] flex-1 flex-col justify-center py-2">
          <header className="mb-7 text-center">
            <div className="mx-auto mb-3 flex size-9 items-center justify-center">
              <img src={silangLogo} alt="Silang" className="size-8 object-contain dark:hidden" />
              <img src="/silang.svg" alt="" className="hidden size-8 object-contain dark:block" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Superadmin access</h1>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Sign in to manage Silang facilities and staff.</p>
          </header>

          <form onSubmit={continueToPortal} noValidate className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="superadmin-email" className="text-xs font-medium">Email or username <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input id="superadmin-email" autoComplete="username" placeholder="Enter your email or username" className="h-8 rounded-md bg-muted/70 px-2.5 text-xs dark:bg-muted/60" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="superadmin-password" className="text-xs font-medium">Password <span aria-hidden="true" className="text-destructive">*</span></Label>
              <div className="relative">
                <Input id="superadmin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" className="h-8 rounded-md bg-muted/70 px-2.5 pr-9 text-xs dark:bg-muted/60" />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="mt-1 h-8 w-full gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              Continue <ArrowRight className="size-3.5" />
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground">Superadmin portal</p>
        </div>
        <p className="mx-auto max-w-[330px] text-center text-xs leading-relaxed text-muted-foreground">Silang facility administration</p>
      </section>

      <aside className="relative m-1 hidden min-h-0 flex-col justify-between overflow-hidden rounded-md border border-border bg-background p-6 sm:m-2 lg:flex xl:p-10">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#e8efeb]/70 blur-3xl dark:bg-[#183328]/60" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-[#f0f3f1] blur-3xl dark:bg-[#13231b]/60" />
        <div className="relative text-center">
          <h2 className="text-sm font-semibold tracking-[-0.025em]">One view across every care facility.</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">Manage rural health units, barangay stations, and the teams that support them.</p>
        </div>
        <div className="relative mx-auto grid aspect-square w-full max-w-[360px] grid-cols-3 items-center justify-items-center gap-8" aria-label="Facility administration">
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-primary"><ShieldCheck className="size-4" /></span>
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-primary"><ShieldCheck className="size-4" /></span>
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-primary"><ShieldCheck className="size-4" /></span>
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-primary"><ShieldCheck className="size-4" /></span>
          <span className="flex size-[66px] items-center justify-center rounded-lg bg-[#003f2c] text-white ring-[7px] ring-background"><img src={silangLogo} alt="" className="size-8 object-contain brightness-0 invert" /></span>
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-primary"><ShieldCheck className="size-4" /></span>
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-primary"><ShieldCheck className="size-4" /></span>
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-primary"><ShieldCheck className="size-4" /></span>
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-primary"><ShieldCheck className="size-4" /></span>
        </div>
        <p className="relative text-center text-xs font-medium text-muted-foreground">A connected foundation for maternal care.</p>
      </aside>
    </div>
  </main>
}
