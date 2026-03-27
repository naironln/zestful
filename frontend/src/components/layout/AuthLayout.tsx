import { UtensilsCrossed, Leaf, Heart } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — decorative gradient */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center bg-gradient-to-br from-brand-400 via-brand-500 to-sage-600 p-12 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-12 h-20 w-20 rounded-full bg-white/10" />

        <div className="relative z-10 text-center">
          <UtensilsCrossed className="mx-auto h-16 w-16 text-white/90" />
          <h2 className="mt-6 font-heading text-4xl font-bold text-white">Zestful</h2>
          <p className="mt-3 max-w-sm text-lg text-white/80">
            Seu diário alimentar inteligente com análise nutricional por IA
          </p>

          <div className="mt-10 flex justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm text-white/70">Análise por IA</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm text-white/70">Acompanhamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-warm-gray-50 px-4 dark:bg-warm-gray-950">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg">
            <UtensilsCrossed className="h-7 w-7 text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-brand-600 dark:text-brand-400">
            Zestful
          </span>
        </div>

        <div className="w-full max-w-md animate-fade-in-up">
          <div className="rounded-2xl border bg-white p-8 shadow-xl dark:border-warm-gray-800 dark:bg-warm-gray-900">
            <div className="mb-6 text-center">
              <h1 className="font-heading text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-warm-gray-500 dark:text-warm-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
