import { produce } from 'immer';

import {
  STATUS_REQUEST,
  STATUS_SUCCESS,
  STATUS_FAILURE,
  SET_RATE_LIMIT_INFO,
} from '../actions/status';

import type { StatusAction } from '../actions/status';

export type RateLimitInfo = {
  used: number;
  limit: number;
  remaining: number;
  reset: number;
  resource: string;
};

export type Status = {
  isFetching: boolean;
  status: {
    auth: { status: boolean };
    api: { status: boolean; statusPage: string };
  };
  error: Error | undefined;
  rateLimitInfo?: RateLimitInfo;
};

const defaultState: Status = {
  isFetching: false,
  status: {
    auth: { status: true },
    api: { status: true, statusPage: '' },
  },
  error: undefined,
};

const status = produce((state: Status, action: StatusAction) => {
  switch (action.type) {
    case STATUS_REQUEST:
      state.isFetching = true;
      break;
    case STATUS_SUCCESS:
      state.isFetching = false;
      state.status = action.payload.status;
      break;
    case STATUS_FAILURE:
      state.isFetching = false;
      state.error = action.payload.error;
      break;
    case SET_RATE_LIMIT_INFO:
      state.rateLimitInfo = action.payload.rateLimitInfo;
      break;
  }
}, defaultState);

export default status;
