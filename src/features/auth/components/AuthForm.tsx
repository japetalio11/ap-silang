import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  ArrowRight,
  Baby,
  Eye,
  EyeOff,
  HeartPulse,
  LoaderCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react"
import silangLogo from "@/assets/silang.svg"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError } from "@/lib/api"
import { useAuthSession } from "@/features/auth/auth-session"
import { toast } from "sonner"

type Role = "admin" | "staff"

type GoogleTokenResult = { access_token?: string; error?: string }

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string
            scope: string
            callback: (result: GoogleTokenResult) => void
            error_callback?: (error: { type?: string; message?: string }) => void
          }) => { requestAccessToken: (options?: { prompt?: string }) => void }
        }
      }
    }
  }
}

const roleOptions: { id: Role; label: string }[] = [
  { id: "staff", label: "Health worker" },
  { id: "admin", label: "Administrator" },
]

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or phone number."),
  password: z.string().min(1, "Enter your password."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function AuthForm() {
  const [selectedRole, setSelectedRole] = useState<Role>("staff")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleReady, setIsGoogleReady] = useState(false)
  const navigate = useNavigate()
  const { login, loginWithGoogle, isAuthenticated } = useAuthSession()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  })

  useEffect(() => {
    const scriptId = "google-identity-services"
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null
    if (window.google?.accounts?.oauth2) {
      setIsGoogleReady(true)
      return
    }
    const script = existingScript ?? document.createElement("script")
    const handleGoogleScriptLoad = () => setIsGoogleReady(true)
    script.id = scriptId
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.addEventListener("load", handleGoogleScriptLoad, { once: true })
    if (!existingScript) document.head.appendChild(script)
    return () => script.removeEventListener("load", handleGoogleScriptLoad)
  }, [])

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true })
  }, [isAuthenticated, navigate])

  async function handleSubmit(values: LoginFormValues) {
    setIsSubmitting(true)
    try {
      await login({ ...values, rememberMe, workspace: selectedRole })
      navigate("/dashboard", { replace: true })
    } catch (error) {
      toast.error(error instanceof ApiError || error instanceof Error
        ? error.message
        : "Unable to sign in. Check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoogleSignIn() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const googleOAuth = window.google?.accounts?.oauth2
    if (!clientId || !googleOAuth) {
      toast.error("Google sign-in is unavailable", { description: "Use your email or phone number instead." })
      return
    }

    setIsSubmitting(true)
    try {
      const tokenClient = googleOAuth.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: async (result) => {
          if (!result.access_token) {
            toast.error("Google sign-in could not be completed", { description: "Please try again." })
            setIsSubmitting(false)
            return
          }
          try {
            await loginWithGoogle(result.access_token, rememberMe, selectedRole)
            navigate("/dashboard", { replace: true })
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to sign in with Google.")
          } finally {
            setIsSubmitting(false)
          }
        },
        error_callback: (error) => {
          if (error.type === "popup_closed") {
            toast.info("Google sign-in cancelled", {
              description: "The sign-in window was closed before authentication finished.",
            })
          } else {
            toast.error(error.message || "Google sign-in could not be completed.")
          }
          setIsSubmitting(false)
        },
      })
      tokenClient.requestAccessToken({ prompt: "select_account" })
    } catch {
      toast.error("Google sign-in could not be started", { description: "Please try again." })
      setIsSubmitting(false)
    }
  }

  return (
    <main className="h-dvh w-full overflow-hidden bg-background p-1 text-xs text-foreground sm:p-2" style={{ fontFamily: "'Inter Variable', Inter, sans-serif" }}>
      <div className="grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-2">
        <section className="flex h-full min-h-0 flex-col justify-between overflow-hidden px-4 py-3 selection:bg-accent selection:text-accent-foreground sm:px-8 sm:py-4 lg:px-10 xl:px-14">
          <div className="mx-auto flex min-h-0 w-full max-w-[330px] flex-1 flex-col justify-center py-2">
            <header className="mb-6 text-center">
              <div className="mx-auto mb-3 flex size-9 items-center justify-center">
                <img src={silangLogo} alt="Silang" className="size-8 object-contain dark:hidden" />
                <img src="/silang.svg" alt="" className="hidden size-8 object-contain dark:block" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to Silang</h1>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Sign in to access your community health workspace.</p>
            </header>

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Choose your workspace</p>
              <Tabs value={selectedRole} onValueChange={(value) => setSelectedRole(value as Role)}>
                <TabsList className="h-9 w-full justify-start gap-1">
                  {roleOptions.map(({ id, label }) => (
                    <TabsTrigger
                      key={id}
                      value={id}
                      className="h-full flex-1 border px-2 py-1 text-xs font-medium"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <Button type="button" variant="outline" disabled={!isGoogleReady || isSubmitting} onClick={handleGoogleSignIn} className="mb-3 h-9 w-full gap-2 border-border bg-white text-xs text-foreground dark:bg-card hover:bg-muted/40">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              {isGoogleReady ? "Sign in with Google" : "Loading Google sign-in…"}
            </Button>

            <div className="relative my-1.5 flex items-center justify-center">
              <span className="absolute inset-x-0 border-t border-border" />
              <span className="relative bg-background px-3 text-xs uppercase tracking-wide text-muted-foreground">or</span>
            </div>

            <Form {...form}>
            <form className="mt-2 space-y-3" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
              <FormField control={form.control} name="identifier" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-foreground">Email or phone number <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} type="text" placeholder={selectedRole === "admin" ? "admin@clinic.ph" : "you@clinic.ph"} autoComplete="username" className="h-8 rounded-md bg-muted/70 px-2.5 text-xs dark:bg-muted/60" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-medium text-foreground">Password <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                  <a href="#" className="text-xs text-foreground hover:text-foreground/80">Forgot password?</a>
                </div>
                <div className="relative">
                  <FormControl>
                    <Input {...field} type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" className="h-8 rounded-md bg-muted/70 px-2.5 pr-9 text-xs dark:bg-muted/60" />
                  </FormControl>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </div>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex items-center pt-0.5">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} className="size-3.5 rounded-[3px] data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground" /> Remember me
                </label>
              </div>
              <Button type="submit" disabled={isSubmitting} className="mt-1 h-8 w-full gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? <><LoaderCircle className="size-3.5 animate-spin" /> Signing in…</> : <>Continue <ArrowRight className="size-3.5" /></>}
              </Button>
            </form>
            </Form>

            <p className="mt-5 text-center text-xs text-muted-foreground">Having trouble signing in? <a href="#" className="font-medium text-foreground hover:underline">Contact your clinic admin</a></p>
          </div>

          <p className="mx-auto max-w-[330px] text-center text-xs leading-relaxed text-muted-foreground">
            By continuing, you agree to Silang&apos;s <a href="#" className="text-muted-foreground underline underline-offset-2">Terms of Service</a> and <a href="#" className="text-muted-foreground underline underline-offset-2">Health Data Privacy Policy</a>.
          </p>
        </section>

        <aside className="relative m-1 hidden min-h-0 flex-col justify-between overflow-hidden rounded-md border border-border bg-background p-6 sm:m-2 lg:flex xl:p-10">
          <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#e8efeb]/70 blur-3xl dark:bg-[#183328]/60" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-[#f0f3f1] blur-3xl dark:bg-[#13231b]/60" />

          <div className="relative text-center">
            <h2 className="text-sm font-semibold tracking-[-0.025em] text-foreground">Care works better together.</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">Connect families, health workers, and clinic teams in one thoughtful workspace.</p>
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[390px] items-center justify-center" aria-label="Silang connects families, health workers, and clinics">
            <svg viewBox="0 0 300 300" className="absolute inset-0 size-full" fill="none" aria-hidden="true">
              <path d="M54 54H246M54 150H246M54 246H246M54 54V246M150 54V246M246 54V246M54 54 246 246M246 54 54 246" stroke="#cbd4ce" className="dark:stroke-[#53665a]" strokeWidth="1" strokeDasharray="1.5 4" />
              <circle cx="150" cy="150" r="104" stroke="#e8ece9" className="dark:stroke-[#33433a]" strokeWidth="1" />
            </svg>
            <div className="relative grid grid-cols-3 items-center justify-items-center gap-x-7 gap-y-7 sm:gap-x-10 sm:gap-y-10">
              <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-[#003f2c] shadow-sm dark:text-[#a5c9b3]"><UsersRound className="size-4" /></span>
              <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-[#003f2c] shadow-sm dark:text-[#a5c9b3]"><HeartPulse className="size-4" /></span>
              <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-[#003f2c] shadow-sm dark:text-[#a5c9b3]"><ShieldCheck className="size-4" /></span>
              <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-[#003f2c] shadow-sm dark:text-[#a5c9b3]"><Baby className="size-4" /></span>
              <span className="flex size-[66px] items-center justify-center rounded-lg bg-[#003f2c] text-white shadow-[0_10px_24px_-10px_rgba(0,63,44,0.55)] ring-[7px] ring-background"><img src={silangLogo} alt="" className="size-8 object-contain brightness-0 invert" /></span>
              <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-[#003f2c] shadow-sm dark:text-[#a5c9b3]"><HeartPulse className="size-4" /></span>
              <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-[#003f2c] shadow-sm dark:text-[#a5c9b3]"><ShieldCheck className="size-4" /></span>
              <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-[#003f2c] shadow-sm dark:text-[#a5c9b3]"><Baby className="size-4" /></span>
              <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-[#003f2c] shadow-sm dark:text-[#a5c9b3]"><UsersRound className="size-4" /></span>
            </div>
          </div>

          <div className="relative text-center">
            <p className="text-xs font-medium text-muted-foreground">Maternal and newborn care, thoughtfully connected.</p>
            <div className="mt-6 flex items-center justify-center gap-1.5" aria-label="Page 1 of 3">
              <span className="h-1.5 w-4 rounded-full bg-[#003f2c]" /><span className="size-1.5 rounded-full bg-[#d6dbd7]" /><span className="size-1.5 rounded-full bg-[#d6dbd7]" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
