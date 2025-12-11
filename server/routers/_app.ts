import { router } from "@/lib/trpc"
import { mandatesRouter } from "./mandates"

export const appRouter = router({
  mandates: mandatesRouter,
})

export type AppRouter = typeof appRouter
