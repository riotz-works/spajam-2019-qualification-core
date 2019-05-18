import Twitter from 'twitter';

export class TwitterClient {

  private readonly client = new Twitter({
    consumer_key       : process.env.TWITTER_API_KEY || '',
    consumer_secret    : process.env.TWITTER_SECRET_KEY || '',
    access_token_key   : process.env.TWITTER_ACCESS_TOKEN || '',
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET || ''
  });

  public async getTimeline(username: string):Promise<Twitter.ResponseData[]> {
    return this.client.get('statuses/user_timeline', { screen_name: username, count: 40 }) as Promise<Twitter.ResponseData[]>;
  }
}
