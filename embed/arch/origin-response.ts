import { OriginResponseHandler } from '@jill64/types-lambda'
import body from "./index.html";

export const handler: OriginResponseHandler<'s3', 'include-body'> = async (event) => {
  const {
    Records: [
      {
        cf: {
          request,
          response
        }
      }
    ]
  } = event;


  console.log({ event })


  const requestHeaders = request.headers || {};
  const responseHeaders = response.headers || {};
  const status = response.status || "500";

  // Add desired headers
  responseHeaders["strict-transport-security"] = [
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubdomains; preload",
    },
  ];

  // we can pass in a dynamic string to add the connect-src CSP headers by creating a cloudfront custom header `x-connect-src`
  let connectSrc = '';
  if(requestHeaders["x-connect-src"]) {
    connectSrc = requestHeaders["x-connect-src"][0].value;
  }

  responseHeaders["content-security-policy"] = [
    {
      key: "Content-Security-Policy",
      value: `default-src 'self'; connect-src 'self' https://fonts.googleapis.com/ ${connectSrc}; img-src * 'self' data: https:; frame-src 'self'; script-src 'unsafe-inline' 'unsafe-eval' 'self' blob:; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com/; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; object-src 'none'; worker-src 'self';`,
    },
  ];
  responseHeaders["x-content-type-options"] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
  ];
  responseHeaders["x-frame-options"] = [{ key: "X-Frame-Options", value: "DENY" }];
  responseHeaders["x-xss-protection"] = [
    { key: "X-XSS-Protection", value: "1; mode=block" },
  ];
  responseHeaders["referrer-policy"] = [
    { key: "Referrer-Policy", value: "same-origin" },
  ];

  // redirect to fallback page if we can't find the requested page
  if (parseInt(status) >= 400 && parseInt(status) <= 599) {
    response.status = "200";
    response.statusDescription = "Found";
    // response.body = body; <-- type not supported https://github.com/jill64/types-lambda/issues/155

    responseHeaders["content-type"] = [
      {
        key: "Content-Type",
        value: "text/html",
      },
    ];
    responseHeaders["content-length"] = [
      {
        key: "Content-Length",
        value: `${body.length}`,
      },
    ];
    return { ...response, ...{ body }}
  }
  return response;

}