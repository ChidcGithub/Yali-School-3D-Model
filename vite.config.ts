import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// The project-root `Models/` folder is exposed to the browser via a directory
// junction at `public/Models` (created once, see scripts/setup-models or run
// `New-Item -ItemType Junction -Path public\Models -Target Models`). Vite then
// serves `/Models/...` through its rock-solid public-dir static handler, which
// avoids the request aborts a custom streaming middleware produced under
// concurrent large-file load.
//
// `tameKeepAlive` widens the dev http server's keep-alive window so the browser
// never reuses a connection the server is milliseconds from closing — that race
// surfaces as net::ERR_ABORTED on large OBJ/texture streams under load.

function tameKeepAlive() {
  return {
    name: 'tame-keep-alive',
    configureServer(server: { httpServer: { keepAliveTimeout: number; headersTimeout: number } }) {
      const s = server.httpServer
      // Keep idle connections alive long enough that the browser never races a
      // reuse against a closing socket; headersTimeout must stay > keepAliveTimeout.
      s.keepAliveTimeout = 30_000
      s.headersTimeout = 35_000
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths(),
    tameKeepAlive(),
  ],
})
