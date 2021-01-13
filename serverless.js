// Command line options
// --stage:       Required System Landscape name, default is 'dev' (Choice: [dev | prd], e.g. --stage dev)
// --region:      Optional, default is determined by the value of `stage` (e.g. --region ap-northeast-1)
// --bucket:      Optional, default is determined by the value of `stage` (e.g. --bucket x-sls-artifacts)
// --aws-profile: Optional, when specifying AWS Profile name (If `dev` exists in `~/.aws/credentials`, e.g. --aws-profile dev )

const pkg = require('./package.json');


module.exports = {
  service: pkg.name,
  provider: {
    name: 'aws',
    stage: '${opt:stage, "dev"}',
    region: '${opt:region, self:custom.stages.region.${self:provider.stage}}',
    runtime: `nodejs${pkg.engines.node.replace('>=', '')}`,
    apiName: '${self:service}${self:custom.stages.suffix.${self:provider.stage}}',
    memorySize: 256,
    timeout: 29,
    logRetentionInDays: 7,
    versionFunctions: false,
    deploymentBucket: {
      name: '${opt:bucket, "x-sls-artifacts-' + pkg.group + '-${self:provider.region}"}',
      maxPreviousDeploymentArtifacts: 1,
      blockPublicAccess: true,
      serverSideEncryption: 'AES256'
    },
    iamRoleStatements: [{
      Effect: 'Allow',
      Action: [
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem'
      ],
      Resource: [
        { 'Fn::GetAtt': [ 'AccountsTable', 'Arn' ]},
        { 'Fn::GetAtt': [ 'TweetsTable', 'Arn' ]}
      ]
    }],
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: 1,
      TWITTER_API_KEY: process.env.TWITTER_API_KEY,
      TWITTER_SECRET_KEY: process.env.TWITTER_SECRET_KEY,
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET
    }
  },

  plugins: [
    'serverless-webpack',
    'serverless-offline'
  ],

  custom: {
    webpack: { packager: 'yarn', webpackConfig: 'deploy/webpack.config.js', includeModules: { forceExclude: [ 'aws-sdk' ]}},
    stages: {
      region: { dev: 'ap-northeast-1', prd: '' },
      suffix: { dev: '-dev',           prd: '' }
    },
    names: {
      'lambda-system':         '${self:service}-system${self:custom.stages.suffix.${self:provider.stage}}',
      'lambda-auth':           '${self:service}-auth${self:custom.stages.suffix.${self:provider.stage}}',
      'lambda-tweets':         '${self:service}-tweets${self:custom.stages.suffix.${self:provider.stage}}',
      'lambda-tweets-kaiseki': '${self:service}-tweets-kaiseki${self:custom.stages.suffix.${self:provider.stage}}',
      'dynamodb-accounts':     '${self:service}-accounts${self:custom.stages.suffix.${self:provider.stage}}',
      'dynamodb-tweets':       '${self:service}-tweets${self:custom.stages.suffix.${self:provider.stage}}',
    }
  },

  functions: {
    Systems: {
      name: '${self:custom.names.lambda-system}',
      handler: 'src/aws-lambda-handler/systems.handle',
      events: [{ http: { path: 'version', method: 'get', cors: true }}]
    },
    Auth: {
      name: '${self:custom.names.lambda-auth}',
      handler: 'src/aws-lambda-handler/auth.signup',
      events: [{ http: { path: 'signup', method: 'post', cors: true }}]
    },
    Tweets: {
      name: '${self:custom.names.lambda-tweets}',
      handler: 'src/aws-lambda-handler/tweets.handle',
      events: [{ http: { path: 'tweets/{username}', method: 'get', cors: true }}]
    },
    Kaiseki: {
      name: '${self:custom.names.lambda-tweets-kaiseki}',
      handler: 'src/aws-lambda-handler/tweets.kaiseki',
      events: [
        {
          stream: {
            type: 'dynamodb',
            startingPosition: 'TRIM_HORIZON',
            arn: { 'Fn::GetAtt': [ 'TweetsTable', 'StreamArn' ]}
          }
        }
      ]
    }
  },

  resources: [{
    Resources: {
      AccountsTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${self:custom.names.dynamodb-accounts}',
          SSESpecification: { SSEEnabled: true },
          AttributeDefinitions: [
            { AttributeName: 'id',     AttributeType: 'S' },
            { AttributeName: 'userId', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'id',     KeyType: 'HASH' },
            { AttributeName: 'userId', KeyType: 'RANGE' }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits:  1,
            WriteCapacityUnits: 1
          }
        }
      },
      TweetsTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${self:custom.names.dynamodb-tweets}',
          SSESpecification: { SSEEnabled: true },
          AttributeDefinitions: [
            { AttributeName: 'username', AttributeType: 'S' },
            { AttributeName: 'tweetId',  AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'username', KeyType: 'HASH' },
            { AttributeName: 'tweetId',  KeyType: 'RANGE' }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits:  1,
            WriteCapacityUnits: 1
          },
          StreamSpecification: {
            StreamViewType: 'NEW_AND_OLD_IMAGES'
          }
        }
      }
    }
  }]
};
