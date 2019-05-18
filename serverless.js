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
    iamRoleStatements: []
  },

  plugins: [
    'serverless-webpack'
  ],

  custom: {
    webpack:  { packager: 'yarn', webpackConfig: './deploy/webpack.config.js', includeModules: { forceExclude: [ 'aws-sdk' ]}},
    regions:  { dev: 'ap-northeast-1', prd: '' },
    suffixes: { dev: '',               prd: '' },
    names: {
      'lambda-systems': '${self:service}-systems${self:custom.suffixes.${self:provider.stage}}'
    }
  },

  functions: {
    Systems: {
      name: '${self:custom.names.lambda-systems}',
      handler: 'src/aws-lambda-handler/systems.handle',
      events: [{ http: { path: 'version', method: 'get', cors: true }}]
    }
  },

  resources: {}
};
