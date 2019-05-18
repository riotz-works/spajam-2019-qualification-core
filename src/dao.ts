import { DynamoDB } from 'aws-sdk';
import { BatchGetOptions, DataMapper, PutOptions, QueryOptions, SyncOrAsyncIterable, UpdateOptions } from '@aws/dynamodb-data-mapper';
import { ZeroArgumentsConstructor } from '@aws/dynamodb-data-marshaller';
import { ConditionExpression, ConditionExpressionPredicate } from '@aws/dynamodb-expressions';

type KeyCondition = ConditionExpression | { [propertyName: string]: ConditionExpressionPredicate | any };

export class Dao {

  private readonly mapper = new DataMapper({ client: new DynamoDB({ region: 'ap-northeast-1' })});

  public async create<T>(item: T, options?: PutOptions): Promise<T> {
    return this.mapper.put(item, options);
  }

  public async update<T>(item: T, options?: UpdateOptions): Promise<T> {
    return this.mapper.update(item, options);
  }

  public async get<T>(valueConstructor: ZeroArgumentsConstructor<T>, keyCondition: KeyCondition | T): Promise<T> {
    return this.mapper.get(Object.assign(new valueConstructor(), keyCondition));
  }

  public async batchGet<T>(items: SyncOrAsyncIterable<T>, options?: BatchGetOptions): Promise<T[]> {
    const queryResults: T[] = [];
    for await (const result of this.mapper.batchGet(items, options)) {
      queryResults.push(result);
    }
    return queryResults;
  }

  public async query<T>(valueConstructor: ZeroArgumentsConstructor<T>, keyCondition: KeyCondition | T, options?: QueryOptions): Promise<T[]> {
    const queryResults: T[] = [];
    for await (const result of this.mapper.query(valueConstructor, keyCondition, options)) {
      queryResults.push(result);
    }
    return queryResults;
  }

  public async scan<T>(valueConstructor: ZeroArgumentsConstructor<T>, options?: QueryOptions): Promise<T[]> {
    const queryResults: T[] = [];
    for await (const result of this.mapper.scan(valueConstructor, options)) {
      queryResults.push(result);
    }
    return queryResults;
  }

  public async delete<T>(valueConstructor: ZeroArgumentsConstructor<T>, keyCondition: KeyCondition | T): Promise<T | undefined> {
    return this.mapper.delete(Object.assign(new valueConstructor(), keyCondition));
  }
}
