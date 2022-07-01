<script lang="ts">
  import {onDestroy} from 'svelte';
  import {Editor} from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';

  // let element
  export let editor: Editor;

  function loadEditor(element: HTMLDivElement) {
    editor = new Editor({
      element: element,
      extensions: [
        StarterKit,
      ],
      content: '',
      onTransaction: () => {
        // force re-render so `editor.isActive` works as expected
        editor = editor;
      },
    });
  }

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });
</script>

<div class="text-zinc-500 space-x-2">

  {#if editor}
    <button class="outline outline-zinc-400 rounded-md px-2 py-1"
            on:click={() => editor.chain().focus().toggleHeading({ level: 1}).run()}
            class:active={editor.isActive('heading', { level: 1 })}>
      H1
    </button>
    <button class="outline outline-zinc-400 rounded-md px-2 py-1"
            on:click={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            class:active={editor.isActive('heading', { level: 2 })}
    >
      H2
    </button>
    <button class="outline outline-zinc-400 rounded-md px-2 py-1"
            on:click={() => editor.chain().focus().setParagraph().run()}
            class:active={editor.isActive('paragraph')}>
      P
    </button>
  {/if}

</div>
<div id="__editor" class="rounded-md p-4 shadow-md" use:loadEditor></div>

<style lang="scss">
  button.active {
    background: black;
    color: white;
  }

  :global {
    #__editor {
      div:focus {
        outline: none;
      }
    }
  }
</style>