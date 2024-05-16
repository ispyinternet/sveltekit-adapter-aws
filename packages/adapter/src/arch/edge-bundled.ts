import { writeFile } from 'fs/promises'
import path from 'path'
import { Context } from '../types/Context.js'
import { buildEdge } from '../utils/buildEdge.js'
import { buildOriginResponse } from '../utils/buildOriginResponse.js'
import { writeAssets } from '../utils/writeAssets.js'

export const edgeBundled = async (context: Context) => {
  const { builder, options } = context

  await writeAssets(context, path.join('s3', builder.config.kit.paths.base))

  await buildEdge(context, {
    source: 'edge-bundled.js',
    entryPoint: path.join('edge', 'index.js')
  })

  await buildOriginResponse(context, {
    source: 'origin-response.js',
    entryPoint: path.join('origin-response', 'index.js')
  })


  // Make .env file
  if (options.env) {
    await writeFile(
      path.join(options.out, 'edge', '.env'),
      Object.entries(options.env).reduce(
        (acc, [key, value]) => `${acc}${key}=${value}\n`,
        ''
      )
    )
    await writeFile(
      path.join(options.out, 'origin-response', '.env'),
      Object.entries(options.env).reduce(
        (acc, [key, value]) => `${acc}${key}=${value}\n`,
        ''
      )
    )
  }
}
