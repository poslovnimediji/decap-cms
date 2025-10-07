import { BlockquotePlugin } from '@platejs/basic-nodes/react';
import { PathApi } from 'platejs';
import { createPlatePlugin, Key } from 'platejs/react';

export const KEY_BLOCKQUOTE_EXIT_BREAK = 'blockquoteExitBreakPlugin';

function isWithinBlockquote(editor, entry) {
  const blockAbove = editor.api.block({ at: entry[1], above: true });
  return blockAbove?.[0]?.type === BlockquotePlugin.key;
}

function queryNode(editor, entry, { empty, first, start }) {
  return (
    (!empty || editor.api.isEmpty()) &&
    (!first || !PathApi.hasPrevious(entry[1])) &&
    (!start || editor.api.isAt({ start: true }))
  );
}

function unwrap(editor) {
   editor.tf.unwrapNodes({ split: true, match: n => n.type === BlockquotePlugin.key });
  return true;
}

function keyDownHandler({ editor, event, query }) {
  const entry = editor.api.block();
  if (!entry) return;

  if (isWithinBlockquote(editor, entry) && queryNode(editor, entry, query) && unwrap(editor)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

const BlockquoteExtPlugin = createPlatePlugin({
  key: KEY_BLOCKQUOTE_EXIT_BREAK,
  node: { isElement: true },
}).extend(() => ({
  shortcuts: {
    blockquoteEnter: {
      handler: handlerProps => keyDownHandler({ ...handlerProps, query: { empty: true } }),
      keys: [[Key.Enter]],
    },
    blockquoteBackspace: {
      handler: handlerProps =>
        keyDownHandler({ ...handlerProps, query: { first: true, start: true } }),
      keys: [[Key.Backspace]],
    },
  },
}));

export default BlockquoteExtPlugin;
