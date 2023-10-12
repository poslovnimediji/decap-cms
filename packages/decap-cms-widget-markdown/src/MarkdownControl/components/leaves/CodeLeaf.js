import React from 'react';
import { PlateLeaf } from '@udecode/plate-common';
import styled from '@emotion/styled';
import { colors, lengths } from 'decap-cms-ui-default';

const StyledCode = styled.code`
  background-color: ${colors.background};
  border-radius: ${lengths.borderRadius};
  padding: 0 2px;
  font-size: 85%;
`;

function CodeLeaf({ className, children, ...props }) {
  return (
    <PlateLeaf asChild className={className} {...props}>
      <StyledCode>{children}</StyledCode>
    </PlateLeaf>
  );
}
export default CodeLeaf;
