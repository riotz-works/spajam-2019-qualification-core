import { APIGatewayProxyResult } from 'aws-lambda';
import { attribute, hashKey, rangeKey, table } from '@aws/dynamodb-data-mapper-annotations';

@table('spajam-2019-qualification-core-accounts')
export class Account {
  @hashKey()
  id!: 'facebook.com' | 'twitter.com';

  @rangeKey()
  userId!: string;

  @attribute()
  username!: string;

  @attribute()
  token!: {
    access:  string;
    refresh: string;
  };

  @attribute()
  timestamp!: string;
}

@table('spajam-2019-qualification-core-tweets')
export class Tweeet {
  @hashKey()
  username!: string;

  @rangeKey()
  tweetId!: string;

  @attribute()
  userId!: string;

  @attribute()
  text!: string;

  @attribute()
  keywards!: string[];

  @attribute()
  created!: string;

  @attribute()
  user!: object;

  @attribute()
  entities!: object;
}


export class Response implements APIGatewayProxyResult {
  public statusCode: number = 200;
  public headers: { [header: string]: string } = { 'Access-Control-Allow-Origin': '*' };
  public body: string;

  public constructor(body: object) {
    this.body = JSON.stringify(body);
  }
}
