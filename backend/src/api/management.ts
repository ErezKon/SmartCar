import { smartcarClient } from './client';
import { buildQueryString } from '../utils/helpers';
import { logger } from '../utils/logger';

// --- Types ---

export interface Application {
  id: string;
  type: string;
  attributes: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ApplicationsListResponse {
  data: Application[];
}

export interface ApplicationResponse {
  data: Application;
}

export interface ApplicationSecret {
  id: string;
  type: string;
  attributes: {
    secret: string;
    createdAt: string;
  };
}

export interface ApplicationSecretsResponse {
  data: ApplicationSecret[];
}

export interface Webhook {
  id: string;
  type: string;
  attributes: {
    callbackUrl: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface WebhooksListResponse {
  data: Webhook[];
}

export interface WebhookResponse {
  data: Webhook;
}

export interface Subscription {
  id: string;
  type: string;
  attributes: {
    webhookId: string;
    userId: string;
    vehicleId: string;
    createdAt: string;
  };
}

export interface SubscriptionsListResponse {
  data: Subscription[];
  meta?: {
    page: {
      number: number;
      size: number;
      totalPages: number;
      totalItems: number;
    };
  };
}

export interface SubscriptionResponse {
  data: Subscription;
}

export interface SubscriptionFilters {
  webhookId?: string;
  vehicleId?: string;
  userId?: string;
}

export interface PaginationOptions {
  pageNumber?: number;
  pageSize?: number;
}

// --- Applications ---

/**
 * List all applications registered with the Smartcar account.
 *
 * @endpoint GET https://management.api.smartcar.com/v3/applications
 * @returns List of applications with name, description, and timestamps.
 */
export async function listApplications(): Promise<ApplicationsListResponse> {
  logger.debug('Listing applications');
  return smartcarClient.get<ApplicationsListResponse>('/applications', { base: 'management' });
}

/**
 * Get details for a specific application.
 *
 * @endpoint GET https://management.api.smartcar.com/v3/applications/{applicationId}
 * @param applicationId - The application identifier.
 * @returns Application details including name, description, and timestamps.
 */
export async function getApplication(applicationId: string): Promise<ApplicationResponse> {
  logger.debug(`Getting application: ${applicationId}`);
  return smartcarClient.get<ApplicationResponse>(`/applications/${applicationId}`, { base: 'management' });
}

/**
 * List secrets for an application.
 *
 * @endpoint GET https://management.api.smartcar.com/v3/applications/{applicationId}/secrets
 * @param applicationId - The application identifier.
 * @returns List of application secrets with creation timestamps.
 */
export async function getApplicationSecrets(applicationId: string): Promise<ApplicationSecretsResponse> {
  logger.debug(`Getting secrets for application: ${applicationId}`);
  return smartcarClient.get<ApplicationSecretsResponse>(
    `/applications/${applicationId}/secrets`,
    { base: 'management' }
  );
}

// --- Webhooks ---

/**
 * List all configured webhooks.
 *
 * @endpoint GET https://management.api.smartcar.com/v3/webhooks
 * @returns List of webhooks with callback URLs and timestamps.
 */
export async function listWebhooks(): Promise<WebhooksListResponse> {
  logger.debug('Listing webhooks');
  return smartcarClient.get<WebhooksListResponse>('/webhooks', { base: 'management' });
}

/**
 * Get details for a specific webhook.
 *
 * @endpoint GET https://management.api.smartcar.com/v3/webhooks/{webhookId}
 * @param webhookId - The webhook identifier.
 * @returns Webhook details including callback URL and timestamps.
 */
export async function getWebhook(webhookId: string): Promise<WebhookResponse> {
  logger.debug(`Getting webhook: ${webhookId}`);
  return smartcarClient.get<WebhookResponse>(`/webhooks/${webhookId}`, { base: 'management' });
}

// --- Subscriptions ---

/**
 * List webhook subscriptions with optional filtering and pagination.
 *
 * @endpoint GET https://management.api.smartcar.com/v3/subscriptions
 * @param filters - Optional filters: webhookId, vehicleId, userId.
 * @param pagination - Optional page number and size.
 * @returns Paginated list of subscriptions.
 */
export async function listSubscriptions(
  filters?: SubscriptionFilters,
  pagination?: PaginationOptions
): Promise<SubscriptionsListResponse> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (filters?.webhookId) params['filter[webhookId]'] = filters.webhookId;
  if (filters?.vehicleId) params['filter[vehicleId]'] = filters.vehicleId;
  if (filters?.userId) params['filter[userId]'] = filters.userId;
  if (pagination?.pageNumber) params['page[number]'] = pagination.pageNumber;
  if (pagination?.pageSize) params['page[size]'] = pagination.pageSize;

  const queryString = buildQueryString(params);
  logger.debug(`Listing subscriptions with filters: ${JSON.stringify(filters)}`);

  return smartcarClient.get<SubscriptionsListResponse>(`/subscriptions${queryString}`, { base: 'management' });
}

/**
 * Create a new webhook subscription for a vehicle.
 *
 * @endpoint POST https://management.api.smartcar.com/v3/subscriptions
 * @param webhookId - The webhook to subscribe to.
 * @param userId - The Smartcar user ID.
 * @param vehicleId - The vehicle to subscribe for.
 * @returns The created subscription details.
 */
export async function createSubscription(
  webhookId: string,
  userId: string,
  vehicleId: string
): Promise<SubscriptionResponse> {
  logger.info(`Creating subscription: webhook=${webhookId}, user=${userId}, vehicle=${vehicleId}`);
  return smartcarClient.post<SubscriptionResponse>(
    '/subscriptions',
    {
      data: {
        type: 'subscription',
        attributes: {
          webhookId,
          userId,
          vehicleId,
        },
      },
    },
    { base: 'management' }
  );
}

/**
 * Get details for a specific subscription.
 *
 * @endpoint GET https://management.api.smartcar.com/v3/subscriptions/{subscriptionId}
 * @param subscriptionId - The subscription identifier.
 * @returns Subscription details including webhook ID, user ID, and vehicle ID.
 */
export async function getSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
  logger.debug(`Getting subscription: ${subscriptionId}`);
  return smartcarClient.get<SubscriptionResponse>(`/subscriptions/${subscriptionId}`, { base: 'management' });
}

/**
 * Remove a webhook subscription.
 *
 * @endpoint DELETE https://management.api.smartcar.com/v3/subscriptions/{subscriptionId}
 * @param subscriptionId - The subscription identifier to remove.
 */
export async function removeSubscription(subscriptionId: string): Promise<void> {
  logger.info(`Removing subscription: ${subscriptionId}`);
  await smartcarClient.delete(`/subscriptions/${subscriptionId}`, { base: 'management' });
}
