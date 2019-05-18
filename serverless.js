// Command line options
// --stage:       Required System Landscape name, default is 'dev' (Choice: [dev | prd], e.g. --stage dev)
// --region:      Optional, default is determined by the value of `stage` (e.g. --region ap-northeast-1)
// --bucket:      Optional, default is determined by the value of `stage` (e.g. --bucket x-sls-artifacts)
// --aws-profile: Optional, when specifying AWS Profile name (If it exists in `~/.aws/credentials`, e.g. --aws-profile dev )

const pkg = require('./package.json');


module.exports = {
  service: pkg.name,
  provider: {
    name: 'aws',
    stage: '${opt:stage, "dev"}',
    region: '${opt:region, self:custom.regions.${self:provider.stage}}',
    runtime: `nodejs10.x`,
    memorySize: 256,
    timeout: 29,
    logRetentionInDays: 30,
    deploymentBucket: {
      name: '${opt:bucket, "x-sls-artifacts-${self:service}-${self:provider.region}"}',
      serverSideEncryption: 'AES256'
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: [ 'dynamodb:*' ],
        Resource: '*'
      }
    ],
    environment: {
      TWITTER_API_KEY: process.env.TWITTER_API_KEY,
      TWITTER_SECRET_KEY: process.env.TWITTER_SECRET_KEY,
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET
    }
  },

  plugins: [
    'serverless-webpack'
  ],

  custom: {
    webpack:  { packager: 'yarn', webpackConfig: './deploy/webpack.config.js', includeModules: { forceExclude: [ 'aws-sdk' ]}},
    regions:  { dev: 'ap-northeast-1', prd: '' },
    suffixes: { dev: '',               prd: '' },
    names: {
      'lambda-system':     '${self:service}-system${self:custom.suffixes.${self:provider.stage}}',
      'lambda-auth':       '${self:service}-auth${self:custom.suffixes.${self:provider.stage}}',
      'dynamodb-accounts': '${self:service}-accounts${self:custom.suffixes.${self:provider.stage}}',
      'dynamodb-tweets':   '${self:service}-tweets${self:custom.suffixes.${self:provider.stage}}',
    }
  },

  functions: {
    System: {
      name: '${self:custom.names.lambda-system}',
      handler: 'src/aws-lambda-handler/systems.handle',
      events: [{ http: { path: 'version', method: 'get', cors: true }}]
    },
    Auth: {
      name: '${self:custom.names.lambda-auth}',
      handler: 'src/aws-lambda-handler/auth.signup',
      events: [{ http: { path: 'signup', method: 'post', cors: true }}]
    }
  },

  resources: {
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
            { AttributeName: 'userId',  AttributeType: 'S' },
            { AttributeName: 'tweetId', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'userId',  KeyType: 'HASH' },
            { AttributeName: 'tweetId', KeyType: 'RANGE' }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits:  1,
            WriteCapacityUnits: 1
          }
        }
      },
    }
  }
};
