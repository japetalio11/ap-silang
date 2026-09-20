import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Clock, MapPin, Car, ArrowRight } from "lucide-react"

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-12 max-w-[900px] mx-auto px-8 pb-8 pt-10 w-full text-foreground">
      {/* Greeting Section */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Good morning, Joseph Angelo! 👋</h1>
        <p className="text-sm text-muted-foreground">Let's get back to work</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Completed Events</CardTitle>
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white">
              <TrendingUp className="h-3 w-3" />
              +12.5%
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-4">125</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                Trending up this month <TrendingUp className="h-3 w-3 text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Visitors for the last 6 months</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Active Campaigns</CardTitle>
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white">
              <TrendingDown className="h-3 w-3" />
              -20%
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-4">234</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                Down 20% this period <TrendingDown className="h-3 w-3 text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Acquisition needs attention</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Units Collected</CardTitle>
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white">
              <TrendingUp className="h-3 w-3" />
              +12.5%
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-4">5,678</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                Strong user retention <TrendingUp className="h-3 w-3 text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Engagement exceed targets</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Coverage Areas</CardTitle>
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white">
              <TrendingUp className="h-3 w-3" />
              +4.5%
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-4">45</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                Steady performance... <TrendingUp className="h-3 w-3 text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Meets growth projections</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-medium text-foreground">Upcoming Events</h2>
          <div className="flex items-center justify-between mt-0.5 gap-4">
            <p className="text-xs font-normal text-muted-foreground">Here's some of your upcoming events for this month</p>
            <button className="flex items-center gap-1 text-xs font-medium text-foreground hover:underline shrink-0 transition-colors">
              View Calendar <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto snap-x snap-mandatory pt-2 -mt-2 pb-4 px-2 -mx-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Event 1 (Highlighted) */}
          <Card className="bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-none flex flex-col justify-between p-6 rounded-[14px] aspect-square shrink-0 w-[80%] sm:w-[280px] md:w-full snap-center">
            <div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold leading-none mb-1">08</div>
                  <div className="text-xs font-normal text-zinc-400 dark:text-zinc-500 tracking-wider">JUNE</div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-black dark:bg-white border border-white dark:border-black text-white dark:text-black">
                  <Car className="h-3 w-3" />
                  20 mins
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <div className="text-xs font-normal text-zinc-400 dark:text-zinc-500 mb-1">8AM - 1PM</div>
              <h3 className="text-sm font-bold mb-1">Community Advocacy</h3>
              <div className="flex items-center gap-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">
                <MapPin className="h-3 w-3" />
                Bagumbayan Sur, Naga City
              </div>
            </div>
          </Card>

          {/* Event 2 */}
          <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none flex flex-col justify-between p-6 rounded-[14px] aspect-square shrink-0 w-[80%] sm:w-[280px] md:w-full snap-center">
            <div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold leading-none mb-1">09</div>
                  <div className="text-xs font-normal text-muted-foreground tracking-wider">JUNE</div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white">
                  <Car className="h-3 w-3" />
                  20 mins
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <div className="text-xs font-normal text-muted-foreground mb-1">8AM - 1PM</div>
              <h3 className="text-sm font-bold mb-1">Community Blood Drive</h3>
              <div className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Bagumbayan Sur, Naga City
              </div>
            </div>
          </Card>

          {/* Event 3 */}
          <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none flex flex-col justify-between p-6 rounded-[14px] aspect-square shrink-0 w-[80%] sm:w-[280px] md:w-full snap-center">
            <div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold leading-none mb-1">10</div>
                  <div className="text-xs font-normal text-muted-foreground tracking-wider">JUNE</div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white">
                  <Car className="h-3 w-3" />
                  20 mins
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <div className="text-xs font-normal text-muted-foreground mb-1">8AM - 1PM</div>
              <h3 className="text-sm font-bold mb-1">Community Training</h3>
              <div className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Bagumbayan Sur, Naga City
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
