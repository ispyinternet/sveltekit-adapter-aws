import { bridgeAuthToken } from '../../external/params/bridgeAuthToken.js'
import { ResponseStream } from '../../external/types/ResponseStream.js'
import { Server } from '../../index.js'
import { manifest } from '../../manifest.js'

declare const awslambda: {
  streamifyResponse: (
    handler: (
      event: {
        rawPath: string
        rawQueryString: string
        headers: Record<string, string>
        requestContext: {
          domainName: string
          http: {
            method: string
            sourceIp: string
          }
        }
        body: BodyInit
        isBase64Encoded: boolean
      },
      responseStream: ResponseStream
    ) => Promise<void>
  ) => unknown
  HttpResponseStream: {
    from: (
      responseStream: ResponseStream,
      metadata: { statusCode: number; headers: Record<string, string> }
    ) => ResponseStream
  }
}

export const handler = awslambda.streamifyResponse(
  async (request, responseStream) => {
    const {
      requestContext,
      headers,
      rawPath,
      rawQueryString,
      isBase64Encoded
    } = request

    const setResponseHeader = (
      statusCode: number,
      headers: Record<string, string>
    ) => {
      responseStream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode,
        headers
      })
    }

    const closeResponseStream = () => {
      responseStream.write('')
      responseStream.end()
    }

    if (headers['bridge-authorization'] !== `Plain ${bridgeAuthToken}`) {
      setResponseHeader(403, {})
      responseStream.write('403 Forbidden')
      return closeResponseStream()
    }

    const {
      http: { method, sourceIp },
      domainName
    } = requestContext

    const env = Object.fromEntries(
      Object.entries(process.env).map(([key, value]) => [key, value ?? ''])
    )

    const url = `https://${domainName}${rawPath}${
      rawQueryString ? `?${rawQueryString}` : ''
    }`

    const app = new Server(manifest)

    await app.init({ env })

    const response = await app.respond(
      new Request(url, {
        method,
        body: request.body,
        headers: request.headers
      }),
      {
        getClientAddress: () => sourceIp,
        platform: { isBase64Encoded }
      }
    )

    // TODO: If the response header is too long, a 502 error will occur on Gateway, so delete it.
    response.headers.delete('link')

    const responseHeadersEntries = [] as [string, string][]

    response.headers.forEach((value, key) => {
      responseHeadersEntries.push([key, value])
    })

    setResponseHeader(
      response.status,
      Object.fromEntries(responseHeadersEntries)
    )

    if (!response.body) {
      return closeResponseStream()
    }

    const reader = response.body.getReader()

    const readNext = (
      chunk: ReadableStreamReadResult<Uint8Array>
    ): Promise<void> | void => {
      if (chunk.done) {
        return responseStream.end()
      }

      responseStream.write(chunk.value)

      return reader.read().then(readNext)
    }

    return reader.read().then(readNext)
  }
)