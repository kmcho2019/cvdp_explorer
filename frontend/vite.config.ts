import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function resolvePagesBase(command: 'serve' | 'build'): string {
  if (command !== 'build') {
    return '/'
  }

  const repository = process.env.GITHUB_REPOSITORY
  if (!repository) {
    return '/'
  }

  const [owner, repo] = repository.split('/')
  if (!owner || !repo) {
    return '/'
  }

  // User/organization Pages repository should be served from root.
  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return '/'
  }

  // Project Pages repository is served under /<repo>/.
  return `/${repo}/`
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: resolvePagesBase(command),
}))
