import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ActionCardProps {
  href: string
  title: string
  description: string
  buttonText: string
  buttonVariant?: "default" | "outline"
  hoverColor?: string
}

export function ActionCard({
  href,
  title,
  description,
  buttonText,
  buttonVariant = "outline",
  hoverColor,
}: ActionCardProps) {
  return (
    <Link href={href} className="block">
      <div className="bg-white p-6 border border-gray-300 rounded-xl hover:border-[#0f4c75] hover:shadow-lg transition-all h-full flex flex-col">
        <h3 className="text-xl font-montserrat font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-base font-urbanist text-gray-600 mb-4 flex-1">{description}</p>
        <Button
          className={`w-full rounded-xl font-urbanist font-semibold ${buttonVariant === "default" ? "bg-[#0f4c75] hover:bg-[#0a3552]" : ""}`}
          variant={buttonVariant}
        >
          {buttonText}
        </Button>
      </div>
    </Link>
  )
}
