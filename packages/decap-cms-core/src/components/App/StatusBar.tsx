import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { connect } from 'react-redux';

const StatusBarContainer = styled.footer`
  width: 100%;
  border-top: 1px solid darkgray;
  padding: 12px 24px;
  font-size: 12px;
  display: flex;
  gap: 16px;
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

function StatusBar({ rateLimitInfo, appVersion, backendName, t}: StatusBarProps) {
  return (
    <StatusBarContainer>
      {appVersion && (
        <span>Decap CMS {appVersion}</span>
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
