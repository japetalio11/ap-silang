import { useState } from "react"
import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { AppHeader } from "./AppHeader"
import { PlusCircle, UserPlus, ShieldCheck, CalendarPlus, Stethoscope, Send, ShieldPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { toast } from "sonner"
import { useAuthSession } from "@/features/auth/auth-session"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardLayout() {
  const { session } = useAuthSession()
  const pinPromptKey = session ? `silang.offline-pin-setup-complete:${session.user.user_id}` : null
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(() => {
    if (!pinPromptKey) return true
    if (window.localStorage.getItem(pinPromptKey) === "done") return false
    const legacyPrefix = `silang.offline-pin-prompted:${session?.user.user_id}:`
    const previouslyCompleted = Array.from({ length: window.sessionStorage.length }, (_, index) => window.sessionStorage.key(index))
      .some((key) => key?.startsWith(legacyPrefix) && window.sessionStorage.getItem(key) === "done")
    if (previouslyCompleted) window.localStorage.setItem(pinPromptKey, "done")
    return !previouslyCompleted
  })
  const [pinStep, setPinStep] = useState<"create" | "verify">("create")
  const [pin, setPin] = useState("")
  const [createdPin, setCreatedPin] = useState("")

  const continuePinSetup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pinStep !== "verify") return
    if (pin.length !== 4) {
      toast.error("Enter all 4 digits to verify your PIN")
      return
    }
    if (pin !== createdPin) {
      setPin("")
      toast.error("PINs don't match", { description: "Re-enter the PIN you created to continue." })
      return
    }
    if (session?.user.user_id) window.localStorage.setItem(`silang.offline-pin:${session.user.user_id}`, pin)
    if (pinPromptKey) window.localStorage.setItem(pinPromptKey, "done")
    setIsPinSetupOpen(false)
  }

  const handlePinChange = (value: string) => {
    const nextPin = value.replace(/\D/g, "").slice(0, 4)
    setPin(nextPin)

    if (pinStep === "create" && nextPin.length === 4) {
      setCreatedPin(nextPin)
      setPin("")
      setPinStep("verify")
    }
  }

  return (
    <SidebarProvider>
      <Dialog
        open={isPinSetupOpen}
        onOpenChange={(open) => {
          if (open) setIsPinSetupOpen(true)
        }}
      >
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="w-[calc(100%-2rem)] max-w-[340px] gap-3 rounded-2xl border-border bg-background p-4 sm:max-w-[340px]"
        >
          <DialogHeader className="items-center text-center">
            <div key={pinStep} className="flex flex-col items-center animate-in fade-in slide-in-from-right-2 duration-300">
              <span className="mb-2.5 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                {pinStep === "create" ? "Create offline PIN" : "Verify PIN"}
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-[250px] text-xs text-center">
                {pinStep === "create"
                  ? "Choose a 4-digit code for offline access."
                  : "Re-enter your 4-digit PIN."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <form key={pinStep} onSubmit={continuePinSetup} className="mx-auto w-full max-w-[244px] space-y-3 animate-in fade-in slide-in-from-right-2 duration-300">
            <InputOTP
              autoFocus
              aria-label={pinStep === "create" ? "Create four-digit offline PIN" : "Verify four-digit offline PIN"}
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              value={pin}
              onChange={handlePinChange}
              containerClassName="justify-center"
            >
              <InputOTPGroup className="mx-auto w-fit gap-1.5 rounded-none">
                {[0, 1, 2, 3].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    mask
                    className="size-11 rounded-md border-2 border-input bg-muted/50 text-2xl font-medium dark:bg-muted/40 first:rounded-md last:rounded-md"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>

            {pinStep === "verify" && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 flex-1 px-2 text-xs font-medium"
                  onClick={() => {
                    setPin("")
                    setCreatedPin("")
                    setPinStep("create")
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="h-8 flex-1 px-2 text-xs font-medium"
                >
                  Complete PIN setup
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <AppSidebar />
      <SidebarInset className="bg-white dark:bg-black flex flex-col h-screen overflow-hidden">
        <AppHeader />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-foreground text-background hover:bg-foreground/90 border p-0 z-50"
            >
              <PlusCircle className="size-6" />
              <span className="sr-only">Quick Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={12} className="w-56 rounded-xl border-border shadow-md md:hidden">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Quick Create</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <UserPlus className="h-4 w-4" />
              <span>Create Maternal Record</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <CalendarPlus className="h-4 w-4" />
              <span>Create Appointment</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <Stethoscope className="h-4 w-4" />
              <span>Log Consultation</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <Send className="h-4 w-4" />
              <span>Create Referral</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <ShieldPlus className="h-4 w-4" />
              <span>Invite Team Member</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarInset>
    </SidebarProvider>
  )
}
