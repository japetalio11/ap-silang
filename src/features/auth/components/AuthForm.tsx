import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react"
import silangLogo from "@/assets/silang.svg"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { AuthLegalModal, type LegalModalTab } from "@/features/auth/components/AuthLegalModal"
import { ApiError } from "@/lib/api"
import { useAuthSession } from "@/features/auth/auth-session"
import { isUserSuperAdmin } from "@/features/auth/components/RequireSuperAdminAuth"
import { toast } from "sonner"
import { PageGuide } from "@/components/ui/contextual-tour"

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

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or phone number."),
  password: z.string().trim().min(1, "Enter your password."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function AuthForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleReady, setIsGoogleReady] = useState(false)
  const [offlinePin, setOfflinePin] = useState("")
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine)
  const [openPolicy, setOpenPolicy] = useState<LegalModalTab | null>(null)
  const navigate = useNavigate()
  const { login, loginWithGoogle, unlockOffline, isAuthenticated, session } = useAuthSession()
  const savedOfflineUserStr = typeof window !== "undefined" ? window.localStorage.getItem("silang.auth.offline-user") : null
  const savedOfflineUser = savedOfflineUserStr ? JSON.parse(savedOfflineUserStr) : null

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleOfflineUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!offlinePin) {
      toast.error("Enter your 4-digit PIN")
      return
    }
    const success = unlockOffline(offlinePin)
    if (success) {
      toast.success("Offline workspace unlocked")
      navigate("/dashboard", { replace: true })
    } else {
      toast.error("Invalid PIN for this device")
    }
  }
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
    if (isAuthenticated) {
      if (isUserSuperAdmin(session?.user?.role)) {
        navigate("/superadmin/overview", { replace: true })
      } else {
        navigate("/dashboard", { replace: true })
      }
    }
  }, [isAuthenticated, session?.user?.role, navigate])

  async function handleSubmit(values: LoginFormValues) {
    setIsSubmitting(true)
    try {
      const loggedUser = await login({ ...values, rememberMe })
      if (isUserSuperAdmin(loggedUser?.role)) {
        navigate("/superadmin/overview", { replace: true })
      } else {
        navigate("/dashboard", { replace: true })
      }
    } catch (error) {
      if (error instanceof ApiError && error.status >= 500) {
        toast.error("Sign-in is temporarily unavailable", {
          description: "The server could not complete your sign-in. Please try again shortly.",
        })
      } else {
        toast.error(error instanceof ApiError || error instanceof Error
          ? error.message
          : "Unable to sign in. Check your connection and try again.")
      }
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
            const loggedUser = await loginWithGoogle(result.access_token, rememberMe)
            if (isUserSuperAdmin(loggedUser?.role)) {
              navigate("/superadmin/overview", { replace: true })
            } else {
              navigate("/dashboard", { replace: true })
            }
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
      <div className="fixed right-3 top-3 z-20"><PageGuide /></div>
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <section className="flex h-full min-h-0 w-full max-w-[420px] flex-col justify-center overflow-y-auto px-4 py-3 selection:bg-accent selection:text-accent-foreground sm:px-8 sm:py-4">
          <div className="mx-auto flex min-h-0 w-full max-w-[330px] flex-col justify-center py-2">
            <header className="mb-6 text-center">
              <div className="mx-auto mb-3 flex size-9 items-center justify-center">
                <img src={silangLogo} alt="Silang" className="size-8 object-contain dark:hidden" />
                <img src="/silang.svg" alt="" className="hidden size-8 object-contain dark:block" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to Silang</h1>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Sign in to access your community health workspace.</p>
            </header>

            {isOffline && savedOfflineUser && (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <div className="font-semibold text-amber-800 dark:text-amber-200">
                  Offline Mode Active
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  Logged on as {savedOfflineUser.first_name} {savedOfflineUser.last_name}. Enter your 4-digit PIN to access local workspace:
                </p>
                <form onSubmit={handleOfflineUnlock} className="mt-2 flex gap-2">
                  <Input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="4-digit PIN"
                    value={offlinePin}
                    onChange={(e) => setOfflinePin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="h-8 bg-background text-xs"
                  />
                  <Button type="submit" size="sm" className="h-8 shrink-0 text-xs">
                    Unlock
                  </Button>
                </form>
              </div>
            )}

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
                    <Input {...field} type="text" placeholder="you@clinic.ph" autoComplete="username" className="h-8 rounded-md bg-muted/70 px-2.5 text-xs dark:bg-muted/60" />
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

            <p className="mt-5 text-center text-xs text-muted-foreground">Having trouble signing in? <button type="button" onClick={() => navigate("/contact-admin")} className="font-medium text-foreground hover:underline">Contact your clinic admin</button></p>
          </div>

          <p className="mx-auto max-w-[340px] text-center text-xs leading-relaxed text-muted-foreground">
            By continuing, you agree to Pili Health&apos;s{" "}
            <button
              type="button"
              onClick={() => setOpenPolicy("terms")}
              className="underline underline-offset-2 hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              Terms of Service
            </button>
            ,{" "}
            <button
              type="button"
              onClick={() => setOpenPolicy("privacy")}
              className="underline underline-offset-2 hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              Health Data Privacy Policy
            </button>
            , and{" "}
            <button
              type="button"
              onClick={() => setOpenPolicy("consent")}
              className="underline underline-offset-2 hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              Clinical Consent
            </button>
            .
          </p>
        </section>

        <AuthLegalModal
          open={openPolicy !== null}
          onOpenChange={(open) => {
            if (!open) setOpenPolicy(null)
          }}
          initialTab={openPolicy ?? "terms"}
        />

      </div>
    </main>
  )
}
