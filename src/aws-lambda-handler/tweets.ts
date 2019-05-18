import dayjs from 'dayjs';
import kuromoji from 'kuromoji';
import { APIGatewayEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { Dao } from '~/dao.ts';
import { TwitterClient } from '~/twitter';
import { Tweeet, Response } from '~/model';


/**
 * Systems Web API's AWS Lambda handler function.
 *
 * @param event – event data.
 * @see http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html
 */
export const handle: Handler<APIGatewayEvent, APIGatewayProxyResult> = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  console.debug('Starting Lambda handler: event=%s', JSON.stringify(event));
  const dao = new Dao();
  try {
    if (!event.pathParameters || !event.pathParameters.username) { throw new Error('No path param of username'); }
    const username = event.pathParameters.username;

    for (const tweet of await new TwitterClient().getTimeline(username)) {
      let filter = false;
      if ((tweet.text as string).includes(TwitterClient.FILTER)) {
        console.warn('Filtered tweet: word=%s, text=%s', TwitterClient.FILTER, tweet.text);
        filter = true;
      }
      if (filter) { continue; }

      const wards = keywards(tweet.text);
      const model2 = Object.assign(new Tweeet(), {
        username: username,
        tweetId: tweet.id,
        text: tweet.text,
        keywards: wards,
        user: tweet.user,
        entities: tweet.entities,
        created: dayjs(tweet.created_at, 'ddd MMM DD HH:mm:ss zz yyyy').toISOString()}
      )
      await dao.create(model2);
    }

    const tweets = await dao.query(Tweeet, { username });
    return new Response(tweets);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const keywards = async (text: string): Promise<Set<string | undefined>> => {
  return await new Promise((resolve) => {
    kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
      if (err) { console.error(err); }
      const tokens = tokenizer.tokenize(text)
        .filter(token => [ '名詞', '動詞' ].includes(token.pos))
        .map(value => value.reading);
      resolve(new Set(tokens));
    })
})
}
