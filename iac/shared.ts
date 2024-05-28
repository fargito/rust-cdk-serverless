export const getHttpApiExportName = (stage: string): string =>
  `todo-api-endpoint-${stage}`;
export const getEventScoutEndpointExportName = (stage: string): string =>
  `event-scout-endpoint-${stage}`;

export const defaultStage = 'dev';
