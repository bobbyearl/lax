import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { ThemeProvider } from '../components/ThemeProvider'
import { FavoritesProvider } from '../components/FavoritesProvider'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: RootComponent,
  },
)

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  return (
    <ThemeProvider>
      <FavoritesProvider>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
      </FavoritesProvider>
    </ThemeProvider>
  )
}
