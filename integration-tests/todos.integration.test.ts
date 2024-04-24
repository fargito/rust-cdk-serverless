import { EventScoutClient } from '@event-scout/client';
import { SignatureV4 } from '@smithy/signature-v4';
import axios from 'axios';
import { randomUUID } from 'crypto';

import { getSignedAxiosConfig } from './getSignedRequest';

type Todo = {
  id: string;
  title: string;
  description: string;
};

describe('todos CRUD API', () => {
  const httpApiUrl = globalThis.httpApiUrl;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const signatureV4: SignatureV4 = globalThis.signatureV4;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const eventScoutClient: EventScoutClient = globalThis.eventScoutClient;

  beforeAll(
    async () => {
      await eventScoutClient.start({
        eventPattern: {
          source: ['api.todos'],
          'detail-type': ['TODO_CREATED'],
        },
      });
    },
    30 * 1000, // 30s timeout
  );

  describe('authentication', () => {
    it('should return a 403 when calling with no authorization', async () => {
      const response = await fetch(`${httpApiUrl}todos`);

      expect(response.status).toBe(403);
    });

    it('should return a 200 when properly authorizing', async () => {
      const signedRequest = await getSignedAxiosConfig(
        signatureV4,
        `${httpApiUrl}todos`,
        'GET',
      );

      const response = await axios(signedRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('CRUD scenario', () => {
    it('should perform basic CRUD scenario', async () => {
      // Create a Todo
      const createTodoRequest = await getSignedAxiosConfig(
        signatureV4,
        `${httpApiUrl}todos`,
        'POST',
        {
          title: `Todo ${randomUUID()}`,
          description: `Super, this is description number ${randomUUID()}`,
        },
      );
      const createTodoResponse = await axios<Todo>(createTodoRequest);

      const todo = createTodoResponse.data;

      expect(createTodoResponse.status).toBe(200);
      expect(todo).toMatchObject(todo);

      // List todos
      const listTodosRequest = await getSignedAxiosConfig(
        signatureV4,
        `${httpApiUrl}todos`,
        'GET',
      );
      const listTodosResponse = await axios(listTodosRequest);

      expect(listTodosResponse.status).toBe(200);
      expect(listTodosResponse.data).toEqual(expect.arrayContaining([todo]));

      // Delete
      const deleteTodoRequest = await getSignedAxiosConfig(
        signatureV4,
        `${httpApiUrl}todos/${todo.id}`,
        'DELETE',
      );
      const deleteTodoResponse = await axios(deleteTodoRequest);
      expect(deleteTodoResponse.status).toBe(204);

      const listTodosAfterDeletionResponse = await axios(listTodosRequest);
      expect(listTodosAfterDeletionResponse.data).not.toEqual(
        expect.arrayContaining([todo]),
      );
    });
  });

  afterAll(async () => {
    await eventScoutClient.stop();
  });
});
