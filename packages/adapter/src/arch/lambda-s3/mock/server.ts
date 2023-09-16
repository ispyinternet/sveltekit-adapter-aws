// import type { SSRManifest, Server as ServerType } from '@sveltejs/kit'
// import { Server } from './index.js'
// import { manifest } from './manifest.js'

// type ResponseStream = WritableStream & {
//   write: (chunk: Buffer | Uint8Array | string | null) => void
//   end: () => void
//   setContentType: (contentType: string) => void
// }

// declare const awslambda: {
//   streamifyResponse: (
//     handler: (
//       event: {
//         rawPath: string
//         rawQueryString: string
//         headers: HeadersInit
//         requestContext: {
//           domainName: string
//           http: {
//             method: string
//             sourceIp: string
//           }
//         }
//         body: BodyInit
//         isBase64Encoded: boolean
//       },
//       responseStream: ResponseStream
//     ) => Promise<void>
//   ) => unknown
//   HttpResponseStream: {
//     from: (
//       responseStream: ResponseStream,
//       metadata: { statusCode: number; headers: Record<string, string> }
//     ) => ResponseStream
//   }
// }

// export const handler = awslambda.streamifyResponse(
//   async (request, responseStream) => {
//     const { requestContext, rawPath, rawQueryString, isBase64Encoded } = request

//     const setResponseHeader = (
//       statusCode: number,
//       headers: Record<string, string>
//     ) => {
//       responseStream = awslambda.HttpResponseStream.from(responseStream, {
//         statusCode,
//         headers
//       })
//     }

//     const closeResponseStream = () => {
//       responseStream.write('')
//       responseStream.end()
//     }

//     const {
//       http: { method, sourceIp },
//       domainName
//     } = requestContext

//     const env = Object.fromEntries(
//       Object.entries(process.env).map(([key, value]) => [key, value ?? ''])
//     )

//     const url = `https://${domainName}${rawPath}${
//       rawQueryString ? `?${rawQueryString}` : ''
//     }`

//     const app = new Server(manifest as SSRManifest) as ServerType

//     await app.init({ env })

//     const response = await app.respond(
//       new Request(url, {
//         method,
//         body: request.body,
//         headers: request.headers
//       }),
//       {
//         getClientAddress: () => sourceIp,
//         platform: { isBase64Encoded }
//       }
//     )

//     // TODO: If the response header is too long, a 502 error will occur on Gateway, so delete it.
//     response.headers.delete('link')

//     setResponseHeader(
//       response.status,
//       Object.fromEntries(response.headers.entries())
//     )

//     if (!response.body) {
//       closeResponseStream()
//       return
//     }

//     const reader = response.body.getReader()

//     const readNext = (chunk: ReadableStreamReadResult<Uint8Array>) => {
//       if (chunk.done) {
//         responseStream.end()
//         return
//       }

//       responseStream.write(chunk.value)

//       return reader.read().then(readNext)
//     }

//     return reader.read().then(readNext)
//   }
// )
