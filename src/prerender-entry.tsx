import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AppRoutes } from './AppRoutes'

/** Renders one route to static HTML. Used only by scripts/prerender.mjs at build time. */
export function renderRoute(path: string): string {
  return renderToString(
    <StaticRouter location={path}>
      <AppRoutes />
    </StaticRouter>,
  )
}
