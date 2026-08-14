import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { colors, colorsRaw, lengths, zIndex } from 'decap-cms-ui-default';

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: ${colorsRaw.tealLight};
  color: ${colorsRaw.tealDark};
  font-size: 13px;
  position: relative;
  z-index: ${zIndex.zIndex299};
`;

const AvatarStack = styled.div`
  display: flex;
  align-items: center;
`;

const Avatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: ${lengths.borderRadius};
  background-color: ${colorsRaw.teal};
  color: ${colors.textLight};
  font-size: 11px;
  font-weight: 600;
  border: 2px solid ${colorsRaw.tealLight};
  margin-left: -6px;

  &:first-of-type {
    margin-left: 0;
  }
`;

function initials(name) {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function EntryPresenceBanner({ editors, t }) {
  if (!editors || editors.isEmpty()) {
    return null;
  }

  const names = editors.map(editor => editor.get('name')).join(', ');

  return (
    <Banner>
      <AvatarStack>
        {editors.map(editor => (
          <Avatar key={editor.get('id')} title={editor.get('name')}>
            {initials(editor.get('name'))}
          </Avatar>
        ))}
      </AvatarStack>
      <span>
        {t('editor.entryPresence.editingNow', { names, smart_count: editors.size })}
      </span>
    </Banner>
  );
}

EntryPresenceBanner.propTypes = {
  editors: ImmutablePropTypes.list,
  t: PropTypes.func.isRequired,
};

export default EntryPresenceBanner;
