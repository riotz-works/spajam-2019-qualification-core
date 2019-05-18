import { attribute, hashKey, rangeKey, table } from '@aws/dynamodb-data-mapper-annotations';
import dayjs from 'dayjs';import { APIGatewayProxyResult as Result, Handler, APIGatewayProxyEvent as Event } from 'aws-lambda';
import { Dao } from '~/dao.ts';
import { TwitterClient } from '~/twitter';


/**
 * Auth Web API's AWS Lambda handler function.
 *
 * @param event – event data.
 * @see http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html
 */
export const signup: Handler<Event, Result> = async (event: Event): Promise<Result> => {
  console.debug('Starting Lambda handler: event=%s', JSON.stringify(event));
  try {
    const model = Object.assign(new Model(), JSON.parse(event.body || '{}'));
    model.timestamp = dayjs().toISOString();
    console.debug(model);

    const ret = await new Dao().create(model);

    const tweet = await new TwitterClient().getTimeline(ret.username);
    console.log(tweet);

    return new Response(ret);
  } catch (err) {
    console.log(err);
    throw err;
  }
};


@table('spajam-2019-qualification-core-accounts')
class Model {
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


class Response implements Result {
  public statusCode: number = 200;
  public headers: { [header: string]: string } = { 'Access-Control-Allow-Origin': '*' };
  public body: string;

  public constructor(body: object) {
    this.body = JSON.stringify(body);
  }
}
