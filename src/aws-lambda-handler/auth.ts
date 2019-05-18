import { attribute, hashKey, rangeKey, table } from '@aws/dynamodb-data-mapper-annotations';
import dayjs from 'dayjs';
import { APIGatewayProxyResult as Result, Handler, APIGatewayProxyEvent as Event } from 'aws-lambda';
import Twitter from 'twitter';
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
  const dao = new Dao();
  try {
    const model = Object.assign(new Account(), JSON.parse(event.body || '{}'));
    model.timestamp = dayjs().toISOString();
    console.debug(model);

    const account = await dao.create(model);
    const tweets = await new TwitterClient().getTimeline(account.username);
    tweets.forEach(({ id, text, created_at, user, entities }: Twitter.ResponseData) => {
      const tweet = Object.assign(new Tweeet(), { userId: account.userId, tweetId: id, text, user, entities, created: dayjs(created_at, 'ddd MMM DD HH:mm:ss zz yyyy').toISOString()})
      dao.create(tweet);
      console.debug(id, text, created_at)
    });

    return new Response(account);
  } catch (err) {
    console.log(err);
    throw err;
  }
};


@table('spajam-2019-qualification-core-accounts')
class Account {
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
class Tweeet {
  @hashKey()
  userId!: string;

  @rangeKey()
  tweetId!: string;

  @attribute()
  text!: string;

  @attribute()
  created!: string;

  @attribute()
  user!: object;

  @attribute()
  entities!: object;
}

class Response implements Result {
  public statusCode: number = 200;
  public headers: { [header: string]: string } = { 'Access-Control-Allow-Origin': '*' };
  public body: string;

  public constructor(body: object) {
    this.body = JSON.stringify(body);
  }
}
