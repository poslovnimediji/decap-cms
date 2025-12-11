import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { connect } from 'react-redux';

declare global {
  let DECAP_CMS_APP_VERSION: string | undefined;
}

const StatusBarContainer = styled.footer`
  position: fixed;
  z-index: 200;
  bottom: 0;
  width: 100%;
  padding: 8px 18px;
  font-size: 11px;
  display: flex;
  gap: 1rem;
  box-shadow: 0 4px 12px 0 rgba(68, 74, 87, 0.15), 0 1px 3px 0 rgba(68, 74, 87, 0.25);
  background-color: #f7f8fa;
`;

import type { State } from '../../types/redux';

interface StatusBarProps {
  rateLimitInfo?: {
    used: number;
    limit: number;
    remaining: number;
    reset: number;
    resource: string;
  };
  appVersion?: string;
  backendName?: string;
  t: (key: string) => string,
}

function formatResetTime(resetTimestamp: number): string {
  const date = new Date(resetTimestamp * 1000);
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function formatPercentage(used: number, limit: number): string {
  const percentage = limit > 0 ? Math.round((used / limit) * 10) / 10 : 0;
  return percentage.toString().replace('.', ',');
}

function StatusBar({ rateLimitInfo, backendName, t}: StatusBarProps) {
  return (
    <StatusBarContainer>
      {typeof DECAP_CMS_APP_VERSION === 'string' && (
        <span>decap-cms-app {DECAP_CMS_APP_VERSION}</span>
      )}

      {backendName && (
        <span>{backendName} {t('app.statusBar.backend')}</span>
      )}

      {rateLimitInfo && (
        <span>
          {rateLimitInfo.used} / {rateLimitInfo.limit} ({formatPercentage(rateLimitInfo.used, rateLimitInfo.limit)}%) {t('app.statusBar.requestsUsed')}, {t('app.statusBar.resetAt')} {formatResetTime(rateLimitInfo.reset)}
        </span>
      )}
    </StatusBarContainer>
  );
}

function mapStateToProps(state: State) {
  return {
    rateLimitInfo: state.status?.rateLimitInfo,
    backendName: state.config?.backend?.name,
  };
}

export default connect(mapStateToProps)(translate()(StatusBar));
