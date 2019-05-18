const path = require('path');
const slsw = require('serverless-webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const stage = slsw.lib.options.stage;

const entries = {};
Object.keys(slsw.lib.entries).forEach(
  key => (entries[key] = [ './deploy/source-map-install.js', slsw.lib.entries[key] ])
);


module.exports = {
  mode: stage === 'prd' ? 'production' : 'development',
  target: 'async-node',
  entry: entries,
  devtool: stage === 'prd' ? '' : 'inline-source-map',
  externals: [
    'aws-sdk'
  ],
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader' }
    ]
  },
  resolve: {
    extensions: [ '.js', '.jsx', '.json', '.ts', '.tsx' ],
    plugins: [ new TsconfigPathsPlugin({ configFile: 'tsconfig.json' })]
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js'
  }
};
