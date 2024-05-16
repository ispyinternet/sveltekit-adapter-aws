import { build } from 'esbuild'
import path from 'path'
import { Context } from '../types/Context.js'
import { root } from './root.js'

export const buildOriginResponse = async (
  { tmp, builder, options }: Context,
  {
    source,
    entryPoint
  }: {
    source: string
    entryPoint: string
  }
) => {
  const edgeEntryPoint = path.join(tmp, entryPoint)

  const fallback = options.fallback || 'index.html'

  builder.copy(path.join(root, 'embed', 'arch', source), edgeEntryPoint)
  builder.copy(path.join(tmp, fallback),  path.join(tmp, 'origin-response', 'revive.html'))

  await build({
    format: 'cjs',
    bundle: true,
    minify: true,
    external: ['node:*', '@aws-sdk/*'],
    ...options?.esbuild,
    entryPoints: [edgeEntryPoint],
    outfile: path.join(options.out, 'origin-response', 'server.js'),
    platform: 'node',
    inject: [path.join(root, 'embed', 'shims.ts')],
    loader: { '.html': 'text' },
  })
}
