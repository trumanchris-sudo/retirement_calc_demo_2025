import type React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      <Link href="/" className="flex items-center space-x-2 font-medium text-blue-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
            stroke="#4682B4"
            strokeWidth="2"
          />
          <path d="M12 6V18" stroke="#4682B4" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 10L12 6L8 10" stroke="#4682B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Autonoma</span>
      </Link>
      <Link href="/" className="text-sm font-medium transition-colors hover:text-blue-600">
        Dashboard
      </Link>
      <Link href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-blue-600">
        Accounts
      </Link>
      <Link href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-blue-600">
        Cards
      </Link>
      <Link href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-blue-600">
        Payments
      </Link>
      <Link href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-blue-600">
        Team
      </Link>
    </nav>
  )
}

