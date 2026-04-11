<script>
  /**
   * +page.svelte — Editor de libro con vista doble página (spread)
   *
   * Flujo:
   *  onMount → Paged.js.preview() → buildSpreads() → showSpread(0)
   *  Panel de propiedades → edita draftMeta → rerenderWithDraftMeta()
   */

  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  const { data } = $props();

  // Capturamos data.meta antes de usarla en $state para que Svelte 5
  // no advierta sobre "capturing initial value of a prop".
  // Este es el comportamiento deseado: draftMeta es independiente de data.meta.
  const _initialMeta = data.meta;

  // ── DOM refs ────────────────────────────────────────────────────────
  /** @type {HTMLDivElement} */
  let bookOutput    = $state(null);
  /** @type {HTMLDivElement} */
  let spreadViewport = $state(null);
  /** @type {HTMLElement} */
  let thumbnailsStrip = $state(null);

  // ── Estado de render ────────────────────────────────────────────────
  let isLoading = $state(true);
  let pageCount = $state(0);
  let errorMsg  = $state('');

  // ── Spreads (navegación doble página) ───────────────────────────────
  /** @type {HTMLElement[]} */
  let allPages      = $state([]);
  /** @type {Array<[number|null, number|null]>} */
  let spreads       = $state([]);
  let currentSpread = $state(0);

  // ── Controles UI ────────────────────────────────────────────────────
  let zoomLevel = $state(0.7);      // rango 0.3 – 1.5
  let showPanel = $state(false);

  // ── Propiedades editables (no muta data.meta) ───────────────────────
  let draftMeta = $state({ ..._initialMeta });

  // ── Derived ─────────────────────────────────────────────────────────
  let spreadInfo = $derived(
    spreads.length > 0
      ? `Página ${currentSpread + 1} / ${spreads.length}`
      : '…'
  );

  /** Índice de la página activa (array de 1 elemento). */
  let activeThumbnailIndices = $derived(
    spreads[currentSpread] ?? []
  );

  // ════════════════════════════════════════════════════════════════════
  // CONSTRUCCIÓN DEL HTML DEL LIBRO
  // ════════════════════════════════════════════════════════════════════

  /** Genera el HTML de entradas del TOC */
  function buildTOCHtml(headings) {
    if (!headings.length) return '';
    const items = headings
      .map(
        (h) => `
        <li class="toc-entry toc-level-${h.level}">
          <a href="#${h.id}">
            <span class="toc-text">${h.text}</span>
            <span class="toc-dots" aria-hidden="true"></span>
          </a>
        </li>`
      )
      .join('');
    return `
      <section class="toc front-matter-page" aria-label="Tabla de contenidos">
        <h2 class="toc-title">Índice</h2>
        <ol class="toc-list">${items}</ol>
      </section>`;
  }

  /**
   * Ensambla el HTML completo que Paged.js va a fragmentar.
   * Acepta `meta` como parámetro para soportar re-renders con draftMeta.
   *
   * Estructura de páginas físicas:
   *   Pág 1 → Portada          (front-matter, sin número)
   *   Pág 2 → Blanco/Verso     (front-matter, sin número)
   *   Pág 3 → Página de título (front-matter, sin número)
   *   Pág 4 → TOC              (front-matter, sin número)
   *   Pág 5+→ Contenido        (counter-reset: page 1 → muestra "1")
   *
   * @param {typeof data.meta} [meta]
   */
  function buildBookHtml(meta = data.meta) {
    const { content, headings } = data;

    const isDark  = meta.variant === 'dark';
    const varAttr = isDark ? 'data-variant="dark"' : '';

    const bgCoverStyle = meta.coverImage
      ? `style="--bg-image: url('${meta.coverImage}')"`
      : '';
    const bgContentStyle = meta.backgroundImage
      ? `style="--bg-image: url('${meta.backgroundImage}')"`
      : '';

    const layoutClass = `layout-${meta.layout.toLowerCase()}`;
    const tocHtml     = buildTOCHtml(headings);

    return `
      <div class="book-wrapper ${layoutClass}" ${varAttr}>

        <!-- ① PORTADA (página física 1) -->
        <section class="page-cover front-matter-page" ${varAttr} ${bgCoverStyle}>
          <div class="cover-content">
            <h1 class="cover-title">${meta.title}</h1>
            ${meta.subtitle ? `<p class="cover-subtitle">${meta.subtitle}</p>` : ''}
            ${meta.author   ? `<p class="cover-author">${meta.author}</p>`     : ''}
          </div>
        </section>

        <!-- ② VERSO EN BLANCO (página física 2) -->
        <section class="page-blank front-matter-page"></section>

        <!-- ③ PÁGINA DE TÍTULO (página física 3) -->
        <section class="page-title front-matter-page">
          <div class="title-page-content">
            <h1 class="title-page-main">${meta.title}</h1>
            ${meta.subtitle ? `<p class="title-page-sub">${meta.subtitle}</p>`  : ''}
            ${meta.author   ? `<p class="title-page-author">${meta.author}</p>` : ''}
          </div>
        </section>

        <!-- ④ TABLA DE CONTENIDOS (página física 4) -->
        ${tocHtml}

        <!-- ⑤ CONTENIDO (página física 5 = página "1" del libro) -->
        <div class="book-content content-start" ${bgContentStyle}>
          ${content}
        </div>

      </div>`;
  }

  // ════════════════════════════════════════════════════════════════════
  // LÓGICA DE SPREADS (doble página)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Construye la tabla de spreads a partir del array de páginas.
   *   Spread 0 : [null, 0]   → portada sola en recto
   *   Spread 1 : [1, 2]      → verso + recto
   *   Spread N : [2N-1, 2N]
   *
   * @param {HTMLElement[]} pages
   * @returns {Array<[number|null, number|null]>}
   */
  /**
   * Una página por entrada: spreads[i] = [i]
   * @param {HTMLElement[]} pages
   * @returns {Array<[number]>}
   */
  function buildSpreads(pages) {
    return pages.map((_, i) => [i]);
  }

  /**
   * Muestra el spread en `index` ocultando todos los demás.
   * REGLA: Solo toca display, float y margin de los .pagedjs_page.
   * Nunca remove(), cloneNode() ni atributos internos de Paged.js.
   *
   * @param {number} index
   */
  function showSpread(index) {
    if (!spreads.length || index < 0 || index >= spreads.length) return;

    // 1. Ocultar todas las páginas
    allPages.forEach((p) => {
      p.style.display = 'none';
      p.style.float   = 'none';
      p.style.margin  = '0';
    });

    // 2. Mostrar solo la página activa, centrada
    const [pageIdx] = spreads[index];
    if (pageIdx !== undefined) {
      allPages[pageIdx].style.display = 'block';
      allPages[pageIdx].style.margin  = '0 auto';
    }

    currentSpread = index;
    scrollThumbnailIntoView(index);
  }

  /** Desplaza el thumbnail activo para que sea visible en la tira */
  function scrollThumbnailIntoView(index) {
    if (!thumbnailsStrip) return;
    const tile = thumbnailsStrip.querySelector(`[data-spread-index="${index}"]`);
    tile?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }

  /**
   * Navega a la página lógica (1-based, post front-matter).
   * Las 4 páginas de front-matter ocupan los índices 0..3.
   */
  function goToLogicalPage(pageNumber) {
    // Con una página por spread, el índice de spread = índice de página física.
    // Las 4 de front-matter son 0..3; la lógica 1 = física 4 (índice 4).
    const FRONT_MATTER = 4;
    const targetIdx    = FRONT_MATTER + pageNumber - 1;
    if (targetIdx >= 0 && targetIdx < spreads.length) showSpread(targetIdx);
  }

  // ════════════════════════════════════════════════════════════════════
  // ZOOM
  // ════════════════════════════════════════════════════════════════════

  function zoomIn()  { zoomLevel = Math.min(1.5, +(zoomLevel + 0.1).toFixed(1)); }
  function zoomOut() { zoomLevel = Math.max(0.3, +(zoomLevel - 0.1).toFixed(1)); }

  // ════════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN (Paged.js — solo cliente)
  // ════════════════════════════════════════════════════════════════════

  async function runPagedJs(meta = data.meta) {
    if (!browser || !bookOutput) return;

    try {
      const { Previewer } = await import('pagedjs');
      const paged = new Previewer();

      const flow = await paged.preview(
        buildBookHtml(meta),
        ['/book-styles.css'],
        bookOutput
      );

      pageCount = flow.totalPages;
      allPages  = Array.from(bookOutput.querySelectorAll('.pagedjs_page'));
      spreads   = buildSpreads(allPages);
      showSpread(0);
    } catch (err) {
      console.error('[Paged.js] Error:', err);
      errorMsg = err.message || 'Error desconocido al paginar el libro.';
    } finally {
      isLoading = false;
    }
  }

  onMount(() => { runPagedJs(); });

  // ════════════════════════════════════════════════════════════════════
  // RE-RENDER DESDE EL PANEL DE PROPIEDADES
  // ════════════════════════════════════════════════════════════════════

  async function rerenderWithDraftMeta() {
    if (!bookOutput) return;

    isLoading = true;
    errorMsg  = '';

    // Limpiar DOM de Paged.js
    bookOutput.innerHTML = '';
    allPages  = [];
    spreads   = [];

    await runPagedJs(draftMeta);
  }
</script>

<svelte:head>
  <title>{data.meta.title} — Midoo Books</title>
  <meta name="description" content={data.meta.description || data.meta.title} />
</svelte:head>

<!-- ════════════════════════════════════════════════════════════════
     SHELL PRINCIPAL — 3 filas: toolbar | body | thumbnails
     ════════════════════════════════════════════════════════════════ -->
<div class="editor-layout" class:panel-open={showPanel}>

  <!-- ── TOOLBAR ──────────────────────────────────────────────────── -->
  <header class="toolbar" role="toolbar" aria-label="Herramientas del editor">

    <!-- Izquierda: marca + título -->
    <div class="toolbar-group toolbar-left">
      <a href="/" class="toolbar-brand" aria-label="Volver a la biblioteca">MIDOO</a>
      <span class="toolbar-sep" aria-hidden="true"></span>
      <span class="toolbar-title" title={data.meta.title}>{data.meta.title}</span>
    </div>

    <!-- Centro: navegación de spreads + ir a página -->
    <div class="toolbar-group toolbar-center" role="group" aria-label="Navegación">
      <button
        class="toolbar-btn"
        aria-label="Spread anterior"
        disabled={isLoading || currentSpread === 0}
        onclick={() => showSpread(currentSpread - 1)}
      >&#8592;</button>

      <span class="spread-indicator" aria-live="polite">{spreadInfo}</span>

      <button
        class="toolbar-btn"
        aria-label="Spread siguiente"
        disabled={isLoading || currentSpread >= spreads.length - 1}
        onclick={() => showSpread(currentSpread + 1)}
      >&#8594;</button>

      <label class="sr-only" for="goto-page">Ir a página</label>
      <input
        id="goto-page"
        class="toolbar-page-input"
        type="number"
        min="1"
        max={pageCount}
        placeholder="Pg."
        disabled={isLoading}
        onchange={(e) => {
          const n = parseInt(e.currentTarget.value);
          if (!isNaN(n) && n >= 1) goToLogicalPage(n);
          e.currentTarget.value = '';
        }}
      />
    </div>

    <!-- Derecha: zoom + imprimir + propiedades -->
    <div class="toolbar-group toolbar-right" role="group" aria-label="Zoom y acciones">

      <button
        class="toolbar-btn"
        aria-label="Reducir zoom"
        disabled={isLoading || zoomLevel <= 0.3}
        onclick={zoomOut}
      >&#8722;</button>

      <span class="zoom-indicator">{Math.round(zoomLevel * 100)}%</span>

      <button
        class="toolbar-btn"
        aria-label="Aumentar zoom"
        disabled={isLoading || zoomLevel >= 1.5}
        onclick={zoomIn}
      >&#43;</button>

      <span class="toolbar-sep" aria-hidden="true"></span>

      <!-- Imprimir / exportar PDF -->
      <button
        class="toolbar-btn toolbar-btn--icon"
        aria-label="Imprimir o exportar PDF"
        disabled={isLoading}
        onclick={() => window.print()}
        title="Imprimir / Exportar PDF"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
          <path d="M4 1h8a1 1 0 011 1v3H3V2a1 1 0 011-1zm-3 5h14a1 1 0 011 1v5a1 1 0 01-1 1h-1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1H2a1 1 0 01-1-1V7a1 1 0 011-1zm3 4v3h8v-3H4zm7-3a.75.75 0 110 1.5.75.75 0 010-1.5z"/>
        </svg>
      </button>

      <!-- Panel de propiedades toggle -->
      <button
        class="toolbar-btn toolbar-btn--icon"
        class:active={showPanel}
        aria-label="Panel de propiedades"
        aria-expanded={showPanel}
        aria-controls="properties-panel"
        onclick={() => { showPanel = !showPanel; }}
        title="Propiedades del libro"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
          <path d="M8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm4.9-3l1.1.6-1 1.8-1.1-.5a4.5 4.5 0 01-.8.5l-.2 1.2H9l-.2-1.2a4.5 4.5 0 01-.8-.5l-1.1.5-1-1.8 1.1-.6a4.5 4.5 0 010-.9L6 7l1-1.8 1.1.5a4.5 4.5 0 01.8-.5L9 4h2l.2 1.2a4.5 4.5 0 01.8.5l1.1-.5 1 1.8-1.1.6a4.5 4.5 0 010 .9z"/>
        </svg>
      </button>

    </div>
  </header>

  <!-- ── BODY: canvas + panel ─────────────────────────────────────── -->
  <div class="editor-body">

    <!-- Canvas principal -->
    <main class="editor-canvas" aria-label="Vista previa del libro">

      {#if isLoading}
        <div class="loading-state" role="status" aria-live="polite">
          <div class="loading-spinner" aria-hidden="true"></div>
          <p>Paginando con Paged.js&hellip;</p>
        </div>
      {/if}

      {#if errorMsg}
        <div class="error-state" role="alert">
          <strong>Error al renderizar el libro</strong>
          <p>{errorMsg}</p>
          <small>Revisa la consola del navegador.</small>
        </div>
      {/if}

      <!-- Contenedor de zoom -->
      <div class="zoom-container" class:hidden={isLoading}>
        <!-- El transform de zoom se aplica aquí; no afecta el PDF -->
        <div
          class="spread-viewport"
          bind:this={spreadViewport}
          style="transform: scale({zoomLevel}); transform-origin: top center;"
        >
          <!-- Paged.js inyecta aquí los .pagedjs_page    -->
          <!-- showSpread() controla cuáles están visibles -->
          <div
            id="book-output"
            bind:this={bookOutput}
            aria-label="Páginas del libro"
          ></div>
        </div>
      </div>

    </main>

    <!-- Panel de propiedades (lateral derecho) -->
    {#if showPanel}
      <aside id="properties-panel" class="properties-panel" aria-label="Propiedades del libro">

        <div class="panel-header">
          <h2 class="panel-title">Propiedades</h2>
          <button class="panel-close" aria-label="Cerrar panel" onclick={() => { showPanel = false; }}>
            &times;
          </button>
        </div>

        <div class="panel-body">

          <label class="panel-label" for="prop-title">Título</label>
          <input id="prop-title"    class="panel-input" type="text" bind:value={draftMeta.title} />

          <label class="panel-label" for="prop-subtitle">Subtítulo</label>
          <input id="prop-subtitle" class="panel-input" type="text" bind:value={draftMeta.subtitle} />

          <label class="panel-label" for="prop-author">Autor</label>
          <input id="prop-author"   class="panel-input" type="text" bind:value={draftMeta.author} />

          <label class="panel-label" for="prop-layout">Layout</label>
          <select id="prop-layout" class="panel-select" bind:value={draftMeta.layout}>
            <option value="Standard">Standard</option>
            <option value="FullImage">FullImage</option>
          </select>

          <fieldset class="panel-fieldset">
            <legend class="panel-label">Variante de color</legend>
            <label class="panel-radio">
              <input type="radio" name="variant" value="light" bind:group={draftMeta.variant} />
              Claro
            </label>
            <label class="panel-radio">
              <input type="radio" name="variant" value="dark" bind:group={draftMeta.variant} />
              Oscuro
            </label>
          </fieldset>

          <label class="panel-label" for="prop-size">Tamaño de página</label>
          <select id="prop-size" class="panel-select" bind:value={draftMeta.pageSize}>
            <option value="A5">A5 (148 × 210 mm)</option>
            <option value="Letter">Carta (216 × 279 mm)</option>
          </select>

          <div class="panel-actions">
            <button
              class="panel-btn panel-btn--primary"
              disabled={isLoading}
              onclick={rerenderWithDraftMeta}
            >
              {isLoading ? 'Renderizando…' : '↺ Re-renderizar'}
            </button>

            <button
              class="panel-btn panel-btn--secondary"
              disabled={isLoading}
              onclick={() => { draftMeta = { ..._initialMeta }; }}
            >
              Restaurar original
            </button>
          </div>

        </div><!-- /panel-body -->
      </aside>
    {/if}

  </div><!-- /editor-body -->

  <!-- ── THUMBNAILS STRIP ─────────────────────────────────────────── -->
  <nav
    class="thumbnails-strip"
    bind:this={thumbnailsStrip}
    aria-label="Miniaturas de spreads"
  >
    {#if isLoading}
      <span class="thumbnails-loading">Generando páginas…</span>

    {:else if spreads.length > 0}
      {#each spreads as [pageIdx], i}
        <button
          class="thumbnail"
          class:thumbnail--active={i === currentSpread}
          data-spread-index={i}
          aria-label="Ir a la página {i + 1}{i === 0 ? ' — Portada' : ''}"
          aria-pressed={i === currentSpread}
          onclick={() => showSpread(i)}
        >
          <div
            class="thumb-page"
            class:thumb-page--cover={i === 0}
            class:thumb-page--active={activeThumbnailIndices.includes(pageIdx)}
          >
            <span class="thumb-num">{pageIdx + 1}</span>
          </div>
          <span class="thumb-label">{i === 0 ? 'Port.' : pageIdx + 1}</span>
        </button>
      {/each}
    {/if}
  </nav>

</div><!-- /editor-layout -->

<style>
  /* Estilos de scoping Svelte que no pueden ir en app.css */
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0;
    margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
    white-space: nowrap; border: 0;
  }

  .hidden {
    visibility: hidden;
    pointer-events: none;
  }
</style>
