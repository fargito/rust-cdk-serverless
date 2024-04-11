describe('todos CRUD API', () => {
  const httpApiUrl = globalThis.httpApiUrl;

  it('should return a 403 when calling with no authorization', async () => {
    const response = await fetch(`${httpApiUrl}/todos`);

    expect(response.status).toBe(403);
  });
});
