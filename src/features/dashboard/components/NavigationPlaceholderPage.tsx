export function NavigationPlaceholderPage({ title }: { title: string }) {
  return (
    <main className="flex-1 bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">This workspace is ready for its next step.</p>
      </div>
    </main>
  )
}
