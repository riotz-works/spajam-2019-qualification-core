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
  try {
    if (!event.pathParameters || !event.pathParameters.username) { throw new Error('No path param of username'); }
    const username = event.pathParameters.username;

    for (const tweet of await new TwitterClient().getTimeline(username)) {
      console.debug(tweet.id, tweet.text, tweet.created_at)
      let filter = false;
      for (const word of TwitterClient.FILTER) {
        if ((tweet.text as string).includes(word)) {
          console.warn('Filtered tweet: word=%s, text=%s', word, tweet.text);
          filter = true;
          break;
        }
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
      console.log(model2)
      await new Dao().create(model2);
    }

    const tweets = await new Dao().query(Tweeet, { username });
    return new Response(tweets);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const keywards = async (text: string): Promise<string[]> => {
  return await new Promise((resolve) => {
    kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
      if (err) { console.error(err); }
      const tokens = tokenizer.tokenize(text)
        .filter(token => [ '名詞', '動詞', '形容詞' ].includes(token.pos))
        .map(value => value.reading);

      const ret: Map<string, number> = new Map();
      for (const token of tokens) {
        if (!token) { return; }
        let count = ret.get(token);
        ret.set(token, count ? count + 1 : 1);
      }

      const ret2: string[] = [];
      const sorted = new Map([...ret.entries()].sort(([, idA], [, idB]) => idB - idA));
      const it = sorted.keys();

      let i = 0;
      while (true) {
        if (5 < i++) { break; }
        const value = it.next().value;
        if (!value) { break; }
        ret2.push(value);
      }
      resolve(ret2);
    })
  })
}
