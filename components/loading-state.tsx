import { Spinner } from "@/components/ui/spinner"

export function LoadingState({ message = "Chargement..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Spinner className="h-12 w-12 text-[#0f4c75] mx-auto mb-4" />
        <p className="text-gray-600 font-urbanist">{message}</p>
      </div>
    </div>
  )
}

export function InlineLoadingState({ message = "Chargement..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Spinner className="h-8 w-8 text-[#0f4c75] mx-auto mb-3" />
        <p className="text-sm text-gray-600 font-urbanist">{message}</p>
      </div>
    </div>
  )
}
