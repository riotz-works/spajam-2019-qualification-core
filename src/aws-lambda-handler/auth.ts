import dayjs from 'dayjs';
import { APIGatewayProxyResult as Result, Handler, APIGatewayProxyEvent as Event } from 'aws-lambda';
import { Dao } from '~/dao.ts';
import { TwitterClient } from '~/twitter';
import { Response, Tweeet, Account } from '~/model';


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

    const account = await dao.create(model);
    const tweets = await new TwitterClient().getTimeline(model.username);
    for (const tweet of tweets) {
      let filter = false;
      if ((tweet.text as string).includes(TwitterClient.FILTER)) {
        console.warn('Filtered tweet: word=%s, text=%s', TwitterClient.FILTER, tweet.text);
        filter = true;
      }
      if (filter) { continue; }

      const model2 = Object.assign(new Tweeet(), {
        username: model.username,
        tweetId: tweet.id,
        userId: account.userId,
        text: tweet.text,
        user: tweet.user,
        entities: tweet.entities,
        created: dayjs(tweet.created_at, 'ddd MMM DD HH:mm:ss zz yyyy').toISOString()})
      await dao.create(model2);
    }

    return new Response(account);
  } catch (err) {
    console.log(err);
    throw err;
  }
};
