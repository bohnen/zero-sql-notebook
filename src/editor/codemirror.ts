import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

export interface CodemirrorActionArgs {
  doc: string;
  onChange: (value: string) => void;
  onRun?: () => void;
}

export function codemirror(node: HTMLElement, args: CodemirrorActionArgs) {
  let current = args;
  const docCompartment = new Compartment();

  const runKeymap = keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        current.onRun?.();
        return true;
      },
    },
  ]);

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      current.onChange(update.state.doc.toString());
    }
  });

  const view = new EditorView({
    parent: node,
    state: EditorState.create({
      doc: args.doc,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        runKeymap,
        sql(),
        oneDark,
        updateListener,
        docCompartment.of([]),
      ],
    }),
  });

  return {
    update(next: CodemirrorActionArgs) {
      current = next;
      const editorText = view.state.doc.toString();
      if (next.doc !== editorText) {
        view.dispatch({
          changes: { from: 0, to: editorText.length, insert: next.doc },
        });
      }
    },
    destroy() {
      view.destroy();
    },
  };
}
