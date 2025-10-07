import React from 'react';
import styled from '@emotion/styled';
import { PlateElement, useElement } from 'platejs/react';
import { useLink } from '@platejs/link/react';

const StyledA = styled.a`
  text-decoration: underline;
  font-size: inherit;
`;

function LinkElement({ children, ...rest }) {
  const element = useElement();
  const { props } = useLink({ element });
  return (
    <PlateElement asChild {...props} {...rest}>
      <StyledA>{children}</StyledA>
    </PlateElement>
  );
}

export default LinkElement;
