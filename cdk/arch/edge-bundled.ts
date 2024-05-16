import {
  CfnOutput,
  Duration,
  Stack,
  StackProps,
  aws_certificatemanager,
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_lambda,
  aws_s3,
  aws_s3_deployment
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import {
  appPath,
  serverPath,
  certificateArn,
  domainName,
  lambdaRuntime,
  memorySize
} from '../external/params'

export class CDKStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const originRequest = new aws_cloudfront.experimental.EdgeFunction(this, 'OriginRequest', {
      code: aws_lambda.Code.fromAsset('edge'),
      handler: 'server.handler',
      runtime:
        lambdaRuntime === 'NODE_18'
          ? aws_lambda.Runtime.NODEJS_18_X
          : lambdaRuntime === 'NODE_20'
            ? aws_lambda.Runtime.NODEJS_20_X
            : aws_lambda.Runtime.NODEJS_LATEST,
      timeout: Duration.seconds(30),
      memorySize
    })

    const originResponse = new aws_cloudfront.experimental.EdgeFunction(this, 'OriginResponse', {
      code: aws_lambda.Code.fromAsset('origin-response'),
      handler: 'server.handler',
      runtime:
        lambdaRuntime === 'NODE_18'
          ? aws_lambda.Runtime.NODEJS_18_X
          : lambdaRuntime === 'NODE_20'
            ? aws_lambda.Runtime.NODEJS_20_X
            : aws_lambda.Runtime.NODEJS_LATEST,
      timeout: Duration.seconds(30),
      memorySize
    })

    const viewerRequest = new aws_cloudfront.Function(this, 'ViewerRequest', {
      code: aws_cloudfront.FunctionCode.fromFile({
        filePath: 'cf2/index.js'
      })
    })

    const s3 = new aws_s3.Bucket(this, 'Bucket', {
      transferAcceleration: true
    })

    const behaviorBase = {
      viewerProtocolPolicy:
        aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originRequestPolicy:
        aws_cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      origin: new aws_cloudfront_origins.S3Origin(s3),
      functionAssociations: [
        {
          function: viewerRequest,
          eventType: aws_cloudfront.FunctionEventType.VIEWER_REQUEST
        }
      ]
    }

    const cdn = new aws_cloudfront.Distribution(this, 'CloudFront', {
      domainNames: domainName ? [domainName] : undefined,
      certificate: certificateArn
        ? aws_certificatemanager.Certificate.fromCertificateArn(
            this,
            'CertificateManagerCertificate',
            certificateArn
          )
        : undefined,
      defaultBehavior: {
        ...behaviorBase,
        cachePolicy: aws_cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_ALL,
        edgeLambdas: [
          {
            functionVersion: originResponse,
            eventType: aws_cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE
          }
        ]
      },
      httpVersion: aws_cloudfront.HttpVersion.HTTP2_AND_3,
      additionalBehaviors: {
        [appPath]: behaviorBase, 
        [serverPath]: {
          ...behaviorBase,
          ...{
              edgeLambdas: [
                {
                  functionVersion: originRequest,
                  eventType: aws_cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                  includeBody: true
                }
              ]}
          }
      }
    })

    new aws_s3_deployment.BucketDeployment(this, 'S3Deploy', {
      sources: [aws_s3_deployment.Source.asset('s3')],
      destinationBucket: s3,
      distribution: cdn
    })

    if (domainName) {
      new CfnOutput(this, 'Deployed URL', {
        description: 'Deployed URL',
        value: `https://${domainName}`
      })
    }

    new CfnOutput(this, 'CloudFront URL', {
      description: 'CloudFront URL',
      value: `https://${cdn.distributionDomainName}`
    })
  }
}
