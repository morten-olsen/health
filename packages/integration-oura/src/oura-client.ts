import createClient from "openapi-fetch";

import type { paths } from "./oura-api.js";

const OURA_BASE_URL = "https://api.ouraring.com";

type OuraClientConfig = {
  accessToken: string;
  baseUrl?: string;
};

type DateRangeParams = {
  startDate: string;
  endDate: string;
};

type DateTimeRangeParams = {
  startDatetime: string;
  endDatetime: string;
};

const createOuraClient = (config: OuraClientConfig) => {
  const client = createClient<paths>({
    baseUrl: config.baseUrl ?? OURA_BASE_URL,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
  });

  // Generic paginated fetch — follows next_token until all pages are consumed
  const fetchAllPages = async <T>(
    fetcher: (nextToken?: string) => Promise<{ data?: { data?: T[]; next_token?: string | null }; error?: unknown }>,
  ): Promise<T[]> => {
    const allItems: T[] = [];
    let nextToken: string | undefined;

    do {
      const result = await fetcher(nextToken);
      if (result.error) {
        throw new OuraApiError(result.error);
      }
      const page = result.data;
      if (page?.data) {
        allItems.push(...page.data);
      }
      nextToken = page?.next_token ?? undefined;
    } while (nextToken);

    return allItems;
  };

  const getHeartRate = async (params: DateTimeRangeParams) =>
    fetchAllPages((nextToken) =>
      client.GET("/v2/usercollection/heartrate", {
        params: {
          query: {
            start_datetime: params.startDatetime,
            end_datetime: params.endDatetime,
            next_token: nextToken,
          },
        },
      }),
    );

  const getSleep = async (params: DateRangeParams) =>
    fetchAllPages((nextToken) =>
      client.GET("/v2/usercollection/sleep", {
        params: {
          query: {
            start_date: params.startDate,
            end_date: params.endDate,
            next_token: nextToken,
          },
        },
      }),
    );

  const getDailySleep = async (params: DateRangeParams) =>
    fetchAllPages((nextToken) =>
      client.GET("/v2/usercollection/daily_sleep", {
        params: {
          query: {
            start_date: params.startDate,
            end_date: params.endDate,
            next_token: nextToken,
          },
        },
      }),
    );

  const getDailyActivity = async (params: DateRangeParams) =>
    fetchAllPages((nextToken) =>
      client.GET("/v2/usercollection/daily_activity", {
        params: {
          query: {
            start_date: params.startDate,
            end_date: params.endDate,
            next_token: nextToken,
          },
        },
      }),
    );

  const getDailyReadiness = async (params: DateRangeParams) =>
    fetchAllPages((nextToken) =>
      client.GET("/v2/usercollection/daily_readiness", {
        params: {
          query: {
            start_date: params.startDate,
            end_date: params.endDate,
            next_token: nextToken,
          },
        },
      }),
    );

  const getDailySpo2 = async (params: DateRangeParams) =>
    fetchAllPages((nextToken) =>
      client.GET("/v2/usercollection/daily_spo2", {
        params: {
          query: {
            start_date: params.startDate,
            end_date: params.endDate,
            next_token: nextToken,
          },
        },
      }),
    );

  const getWorkouts = async (params: DateRangeParams) =>
    fetchAllPages((nextToken) =>
      client.GET("/v2/usercollection/workout", {
        params: {
          query: {
            start_date: params.startDate,
            end_date: params.endDate,
            next_token: nextToken,
          },
        },
      }),
    );

  return {
    client,
    getHeartRate,
    getSleep,
    getDailySleep,
    getDailyActivity,
    getDailyReadiness,
    getDailySpo2,
    getWorkouts,
  };
};

class OuraApiError extends Error {
  details: unknown;

  constructor(details: unknown) {
    super(`Oura API error: ${JSON.stringify(details)}`);
    this.name = "OuraApiError";
    this.details = details;
  }
}

export type { OuraClientConfig, DateRangeParams, DateTimeRangeParams };
export { createOuraClient, OuraApiError };
